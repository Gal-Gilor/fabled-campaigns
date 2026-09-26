import { randomUUID } from 'crypto';
import { createLocation, createArtifact, getCollectionById } from '@/db';
import { GEMINI_IMAGE_MODEL, type ImageSize } from './config';
import {
  buildGenerationMetaPrompt,
  buildFallbackGenerationPrompt,
  type MapScale,
  type MapView,
} from './nanoBananaPrompts';
import { generateMapImage, uploadMapImage } from './imageGeneration';
import { expandPrompt } from './promptExpansion';
import { buildImageOutput, errorMessage } from './messageUtils';
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

export function createEnhanceMapPrompt(collection?: Collection, usage?: UsageRecorder) {
  return async function (params: {
    userRequest: string;
    ambiance?: string;
    terrain?: string;
    setting?: string;
    perspective?: 'indoor' | 'outdoor';
    mapScale?: MapScale;
    mapView?: MapView;
    abortSignal?: AbortSignal;
  }): Promise<string> {
    const { abortSignal, ...rest } = params;
    const promptParams = { ...rest, collection };
    return expandPrompt({
      prompt: buildGenerationMetaPrompt(promptParams),
      usage,
      usageSource: 'map_prompt',
      isAcceptable: (text) => text.length >= 50,
      fallback: () => buildFallbackGenerationPrompt(promptParams),
      logTag: 'mapPrompt',
      abortSignal,
    });
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

      const [, { src, locationId, artifactId }] = await Promise.all([
        usage?.recordImage('map_generate', GEMINI_IMAGE_MODEL, 1, imageSize),
        saveMapArtifact(base64, mediaType, name, collectionId, sessionId, enhancedPrompt),
      ]);
      return buildImageOutput({ type: 'image', src, label: name ?? 'Encounter Map', collectionId, locationId, artifactId, prompt: enhancedPrompt });
    } catch (err) {
      return `[Encounter map error] ${errorMessage(err)}`;
    }
  };
}
