import { z } from 'zod';
import { tool, generateText, Output } from 'ai';
import { GEMINI_MODEL, GEMINI_IMAGE_MODEL } from './config';
import { safeJsonParse, isImageOutput } from './messageUtils';
import {
  VALID_TERRAINS,
  VALID_SETTINGS,
  buildEnhancementInput,
  buildFallbackEnhancedPrompt,
} from './mapPrompts';
import { vertex } from './vertexClient';

export const enhanceMapPrompt = tool({
  description:
    'Expand the user\'s map request into a rich, detailed image generation prompt using AI prompt engineering. ' +
    'Extracts terrain, setting, perspective, and detail level to produce an optimised Gemini image prompt.',
  inputSchema: z.object({
    userRequest: z.string().describe("The user's map request verbatim"),
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
    const params = { userRequest, ambiance, terrain, setting, perspective, detailLevel };
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

export const generateEncounterMap = tool({
  description: 'Generate a tactical D&D encounter map image from an enhanced prompt',
  inputSchema: z.object({
    enhancedPrompt: z.string().describe('The enhanced image generation prompt from enhanceMapPrompt'),
    name: z.string().optional().describe('The location name from generateMapName'),
  }),
  toModelOutput: ({ output }: { output: unknown }) => {
    const o = safeJsonParse(output);
    if (isImageOutput(o)) return { type: 'text' as const, value: `Map generated: ${o.label}` };
    return { type: 'text' as const, value: String(output) };
  },
  execute: async ({ enhancedPrompt, name }) => {
    try {
      const result = await generateText({
        model: vertex(GEMINI_IMAGE_MODEL),
        prompt: enhancedPrompt,
        providerOptions: {
          vertex: { responseModalities: ['TEXT', 'IMAGE'] },
        },
      });

      const imgFile = result.files?.find((f) => f.mediaType.startsWith('image/'));
      if (!imgFile) return '[Encounter map] Image generation returned no image.';

      const src = imgFile.base64.startsWith('data:')
        ? imgFile.base64
        : `data:${imgFile.mediaType};base64,${imgFile.base64}`;

      return JSON.stringify({ type: 'image', src, label: name ?? 'Encounter Map' });
    } catch (err) {
      return `[Encounter map error] ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});
