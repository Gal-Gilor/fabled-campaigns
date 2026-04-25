import { z } from 'zod';
import { tool, generateText, generateImage, Output } from 'ai';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { createLocation, createArtifact } from '@/db';
import { GEMINI_MODEL, GEMINI_IMAGE_MODEL, IMAGEN_MODEL, NEGATIVE_PROMPT } from './config';
import { safeJsonParse, isImageOutput } from './messageUtils';
import {
  VALID_TERRAINS,
  VALID_SETTINGS,
  buildEnhancementInput,
  buildFallbackEnhancedPrompt,
  buildNarrativePrompt,
} from './mapPrompts';
import { vertex } from './vertexClient';
import type { Collection } from './collections';

async function uploadImageToBlob(
  base64: string,
  mediaType: string,
  label?: string,
  collectionId?: string,
  locationId?: string,
): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  const ext = mediaType.split('/')[1] ?? 'png';
  const sanitized = (label ?? 'map').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = collectionId && locationId
    ? `maps/${collectionId}/${locationId}/${Date.now()}-${sanitized}.${ext}`
    : `maps/${Date.now()}-${sanitized}.${ext}`;
  const { url } = await put(filename, buffer, { access: 'public', contentType: mediaType });
  return url;
}

async function saveMapArtifact(
  base64: string,
  mediaType: string,
  name: string | undefined,
  collectionId: string | undefined,
  sessionId: string | undefined,
  prompt: string,
): Promise<{ src: string; locationId?: string; artifactId?: string }> {
  const locationId = collectionId && sessionId ? randomUUID() : undefined;
  const src = await uploadImageToBlob(base64, mediaType, name, collectionId, locationId);
  if (collectionId && sessionId && locationId) {
    await createLocation({ id: locationId, collectionId, sessionId, name: name ?? 'Encounter Map' });
    const artifact = await createArtifact(locationId, { blobUrl: src, prompt, mediaType });
    return { src, locationId, artifactId: artifact.id };
  }
  return { src };
}

export function createGenerateNarrativeDescription(collection?: Collection) {
  return async function (params: {
    userRequest: string;
    terrain?: string;
    setting?: string;
    ambiance?: string;
  }): Promise<string> {
    const mergedParams = {
      userRequest: params.userRequest,
      terrain: params.terrain ?? collection?.terrain,
      setting: params.setting ?? collection?.setting,
      ambiance: params.ambiance ?? collection?.ambiance,
      visualDetails: collection?.visualDetails,
    };
    try {
      const prompt = buildNarrativePrompt(mergedParams);
      const result = await generateText({
        model: vertex(GEMINI_MODEL),
        prompt,
        maxOutputTokens: 300,
      });
      const narrative = result.text.trim();
      if (narrative.length >= 30) return narrative;
      throw new Error('Narrative too short');
    } catch {
      return buildFallbackEnhancedPrompt({
        userRequest: mergedParams.userRequest,
        terrain: mergedParams.terrain,
        setting: mergedParams.setting,
        ambiance: mergedParams.ambiance,
      });
    }
  };
}

export function createEnhanceMapPrompt(collection?: Collection) {
  return tool({
    description:
      'Expand the user\'s map request into a rich, detailed image generation prompt using AI prompt engineering. ' +
      'Extracts terrain, setting, perspective, and detail level to produce an optimised Gemini image prompt.',
    inputSchema: z.object({
      userRequest: z.string().describe("The user's map request"),
      ambiance: z.string().describe('Mood or atmosphere (e.g. "dark and cursed", "peaceful and serene")'),
      terrain: z.enum(VALID_TERRAINS).optional().describe(
        `Terrain type if identifiable. Options: ${VALID_TERRAINS.join(', ')}`
      ),
      setting: z.enum(VALID_SETTINGS).optional().describe(
        `Specific building or location type if applicable. Options: ${VALID_SETTINGS.join(', ')}`
      ),
      perspective: z.enum(['indoor', 'outdoor']).describe('Whether this is an indoor or outdoor map'),
      detailLevel: z.enum(['close-up', 'wide']).describe(
        'close-up: zoomed-in, room/small-area scale (~5ft per grid square); ' +
        'wide: zoomed-out, regional or multi-room scale'
      ),
    }),
    execute: async ({ userRequest, ambiance, terrain, setting, perspective, detailLevel }) => {
      const params = { userRequest, ambiance, terrain, setting, perspective, detailLevel, collection };
      try {
        const metaPrompt = buildEnhancementInput(params);
        const result = await generateText({
          model: vertex(GEMINI_MODEL),
          prompt: metaPrompt,
          maxOutputTokens: 4096,
        });
        const enhanced = result.text.trim();
        if (enhanced.length >= 50) return enhanced;
        throw new Error('Enhancement response too short');
      } catch {
        return buildFallbackEnhancedPrompt(params);
      }
    },
  });
}

export const generateMapName = tool({
  description: 'Generate an evocative, memorable D&D location name for the map',
  inputSchema: z.object({
    userRequest: z.string().describe("The user's map request"),
    ambiance: z.string().optional().describe('Mood or atmosphere'),
    terrain: z.string().optional().describe('Terrain type'),
    setting: z.string().optional().describe('Setting type'),
  }),
  execute: async ({ userRequest, ambiance, terrain, setting }) => {
    let prompt = `Generate an evocative, memorable D&D location name.\n\nMap request: ${userRequest}\n`;
    if (ambiance) prompt += `Mood: ${ambiance}\n`;
    if (terrain) prompt += `Terrain: ${terrain}\n`;
    if (setting) prompt += `Setting: ${setting}\n`;
    prompt += '\nRespond with only the name — no explanation, no quotes.';

    try {
      const { output } = await generateText({
        model: vertex(GEMINI_MODEL),
        output: Output.object({ schema: z.object({ name: z.string() }) }),
        prompt,
        temperature: 0.9,
        maxOutputTokens: 100,
      });
      return JSON.stringify({ name: output.name.trim() });
    } catch {
      const base = setting ?? terrain ?? 'location';
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const fallback = setting && terrain
        ? `The ${cap(terrain)} ${cap(setting)}`
        : `The ${cap(base)}`;
      return JSON.stringify({ name: fallback });
    }
  },
});

export function createGenerateEncounterMap(sessionId?: string) {
  return tool({
    description: 'Generate a tactical D&D encounter map image from an enhanced prompt',
    inputSchema: z.object({
      enhancedPrompt: z.string().describe('The enhanced image generation prompt from createEnhanceMapPrompt'),
      name: z.string().optional().describe('The location name from generateMapName'),
      collectionId: z.string().optional().describe('The active collection ID to tag this image'),
    }),
    toModelOutput: ({ output }: { output: unknown }) => {
      const o = safeJsonParse(output);
      if (isImageOutput(o)) return { type: 'text' as const, value: `Map generated: ${o.label}` };
      return { type: 'text' as const, value: String(output) };
    },
    execute: async ({ enhancedPrompt, name, collectionId }) => {
      try {
        const result = await generateImage({
          model: vertex.image(IMAGEN_MODEL),
          prompt: enhancedPrompt,
          aspectRatio: '4:3',
          providerOptions: {
            vertex: {
              negativePrompt: NEGATIVE_PROMPT,
              personGeneration: 'dont_allow',
            },
          },
        });

        const image = result.image;
        const { src, locationId, artifactId } = await saveMapArtifact(
          image.base64, image.mediaType, name, collectionId, sessionId, enhancedPrompt,
        );
        return JSON.stringify({ type: 'image', src, label: name ?? 'Encounter Map', collectionId, locationId, artifactId, prompt: enhancedPrompt });
      } catch (err) {
        return `[Encounter map error] ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}

export function createGenerateCollectionMap(sessionId?: string) {
  return tool({
    description:
      'Generate a D&D tactical map that visually matches existing maps in the collection. ' +
      'Uses a reference image from the collection to maintain consistent style, lighting, and color palette.',
    inputSchema: z.object({
      enhancedPrompt: z.string().describe('The enhanced image generation prompt'),
      name: z.string().optional().describe('The location name'),
      collectionId: z.string().optional().describe('The active collection ID'),
      referenceImageUrl: z.string().describe('URL of a prior map in this collection to match visually'),
    }),
    toModelOutput: ({ output }: { output: unknown }) => {
      const o = safeJsonParse(output);
      if (isImageOutput(o)) return { type: 'text' as const, value: `Map generated: ${o.label}` };
      return { type: 'text' as const, value: String(output) };
    },
    execute: async ({ enhancedPrompt, name, collectionId, referenceImageUrl }) => {
      try {
        const refRes = await fetch(referenceImageUrl);
        const refBytes = new Uint8Array(await refRes.arrayBuffer());
        const mimeType = refRes.headers.get('content-type') ?? 'image/png';

        const result = await generateText({
          model: vertex(GEMINI_IMAGE_MODEL),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', image: refBytes, mediaType: mimeType },
                {
                  type: 'text',
                  text:
                    'Generate a new D&D battle map that matches the visual style, lighting, color palette, ' +
                    'and art direction of the reference image above. Maintain this visual identity.\n\n' +
                    enhancedPrompt,
                },
              ],
            },
          ],
          providerOptions: {
            vertex: { responseModalities: ['TEXT', 'IMAGE'] },
          },
        });

        const imgFile = result.files?.find((f) => f.mediaType.startsWith('image/'));
        if (!imgFile) return '[Collection map] Image generation returned no image.';

        const { src, locationId, artifactId } = await saveMapArtifact(
          imgFile.base64, imgFile.mediaType, name, collectionId, sessionId, enhancedPrompt,
        );
        return JSON.stringify({ type: 'image', src, label: name ?? 'Encounter Map', collectionId, locationId, artifactId, prompt: enhancedPrompt });
      } catch (err) {
        return `[Collection map error] ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}
