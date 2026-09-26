import { generateText } from 'ai';
import { randomUUID } from 'crypto';
import { createLocation, createArtifact, getCollectionById } from '@/db';
import { GEMINI_MODEL, GEMINI_IMAGE_MODEL, type ImageSize } from './config';
import { buildNarrativePrompt } from './mapPrompts';
import { buildGenerationMetaPrompt, buildFallbackGenerationPrompt, describeSubject } from './nanoBananaPrompts';
import { generateMapImage, uploadMapImage } from './imageGeneration';
import { vertex } from './vertexClient';
import { getAmbiancePromptLanguage } from './collections';
import type { Collection } from './collections';
import type { UsageRecorder } from './usage';

async function saveMapArtifact(
  base64: string,
  mediaType: string,
  name: string | undefined,
  collectionId: string | undefined,
  sessionId: string | undefined,
  prompt: string,
): Promise<{ src: string; locationId?: string; artifactId?: string }> {
  const locationId = collectionId && sessionId ? randomUUID() : undefined;
  const src = await uploadMapImage(base64, mediaType, { collectionId, locationId, label: name });
  if (collectionId && sessionId && locationId) {
    await createLocation({ id: locationId, collectionId, sessionId, name: name ?? 'Encounter Map' });
    const artifact = await createArtifact(locationId, { blobUrl: src, prompt, mediaType });
    return { src, locationId, artifactId: artifact.id };
  }
  return { src };
}

// Subject-only fallback for the narrative step. Unlike buildFallbackGenerationPrompt,
// this must NOT produce a full image prompt: its output is fed as `userRequest` into
// createEnhanceMapPrompt, whose own fallback wraps it in a full image prompt. Returning
// a full prompt here would double up the camera opening, grid clause, and negation when
// both LLM calls fail together.
function buildNarrativeFallback(params: {
  userRequest: string;
  terrain?: string;
  setting?: string;
  ambiance?: string;
}): string {
  const subject = describeSubject({
    userRequest: params.userRequest,
    terrain: params.terrain,
    setting: params.setting,
  });
  if (!params.ambiance) return subject;
  return `${subject} ${getAmbiancePromptLanguage(params.ambiance)}`;
}

export function createGenerateNarrativeDescription(collection?: Collection, usage?: UsageRecorder) {
  return async function (params: {
    userRequest: string;
    terrain?: string;
    setting?: string;
    ambiance?: string;
    abortSignal?: AbortSignal;
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
        abortSignal: params.abortSignal,
      });
      await usage?.recordText('map_narrative', GEMINI_MODEL, result.usage);
      const narrative = result.text.trim();
      if (narrative.length >= 30) return narrative;
      throw new Error('Narrative too short');
    } catch (err) {
      console.warn('[mapNarrative] LLM narrative generation failed; using fallback:', err);
      return buildNarrativeFallback({
        userRequest: mergedParams.userRequest,
        terrain: mergedParams.terrain,
        setting: mergedParams.setting,
        ambiance: mergedParams.ambiance,
      });
    }
  };
}

export function createEnhanceMapPrompt(collection?: Collection, usage?: UsageRecorder) {
  return async function (params: {
    userRequest: string;
    ambiance?: string;
    terrain?: string;
    setting?: string;
    perspective?: 'indoor' | 'outdoor';
    detailLevel?: 'close-up' | 'wide';
    abortSignal?: AbortSignal;
  }): Promise<string> {
    const { abortSignal, ...rest } = params;
    const promptParams = { ...rest, collection };
    try {
      const metaPrompt = buildGenerationMetaPrompt(promptParams);
      const result = await generateText({
        model: vertex(GEMINI_MODEL),
        prompt: metaPrompt,
        maxOutputTokens: 4096,
        abortSignal,
      });
      await usage?.recordText('map_prompt', GEMINI_MODEL, result.usage);
      const enhanced = result.text.trim();
      if (enhanced.length >= 50) return enhanced;
      throw new Error('Enhancement response too short');
    } catch (err) {
      console.warn('[mapPrompt] LLM prompt enhancement failed; using fallback:', err);
      return buildFallbackGenerationPrompt(promptParams);
    }
  };
}

export function createGenerateEncounterMap(
  userId: string | null,
  sessionId: string | undefined,
  imageSize: ImageSize,
  usage?: UsageRecorder
) {
  return async function (params: {
    enhancedPrompt: string;
    name?: string;
    collectionId?: string;
    abortSignal?: AbortSignal;
  }): Promise<string> {
    const { enhancedPrompt, name, collectionId, abortSignal } = params;
    // collectionId comes from the model; check it before paying for the image call
    if (collectionId && (!userId || !(await getCollectionById(userId, collectionId)))) {
      return '[Encounter map error] Collection not found.';
    }
    try {
      const { base64, mediaType } = await generateMapImage({
        prompt: enhancedPrompt,
        imageSize,
        abortSignal,
      });
      await usage?.recordImage('map_generate', GEMINI_IMAGE_MODEL, 1, imageSize);

      const { src, locationId, artifactId } = await saveMapArtifact(
        base64, mediaType, name, collectionId, sessionId, enhancedPrompt,
      );
      return JSON.stringify({ type: 'image', src, label: name ?? 'Encounter Map', collectionId, locationId, artifactId, prompt: enhancedPrompt });
    } catch (err) {
      return `[Encounter map error] ${err instanceof Error ? err.message : String(err)}`;
    }
  };
}
