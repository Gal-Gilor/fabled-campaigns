import { randomUUID } from 'crypto';
import { createLocation, createArtifact, getCollectionById } from '@/db';
import type { ImageSize } from './config';
import {
  buildGenerationMetaPrompt,
  buildFallbackGenerationPrompt,
  type MapScale,
  type MapView,
} from './nanoBananaPrompts';
import { generateMapImage, imageErrorMessage, uploadMapImage } from './imageGeneration';
import { expandPrompt } from './promptExpansion';
import { buildImageOutput, MAP_ERROR_PREFIX } from './messageUtils';
import type { Collection } from './collections';
import type { UsageRecorder } from './usage';
import { imageStepProgress, type ProgressTracker } from './toolProgress';

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
    /** Drives the 'image' and 'save' steps when the caller shows progress. */
    progress?: ProgressTracker;
  }): Promise<string> {
    const { enhancedPrompt, name, collectionId, abortSignal, progress } = params;
    // collectionId comes from the server's active collection, not the model; check it before paying for the image call
    if (collectionId && (!userId || !(await getCollectionById(userId, collectionId)))) {
      return `${MAP_ERROR_PREFIX}Collection not found.`;
    }
    try {
      progress?.start('image');
      const { base64, mediaType, model, imageSize: renderedSize } = await generateMapImage({
        prompt: enhancedPrompt,
        imageSize,
        abortSignal,
        onProgress: progress && imageStepProgress(progress, 'image'),
      });
      // Without a 'save' step, finish 'image' after the upload so the blob-upload
      // time still lands inside a step, as in editByImageUrl.
      const hasSaveStep = progress?.has('save') ?? false;
      if (hasSaveStep) progress?.finish('image');

      progress?.start('save');
      const [, { src, locationId, artifactId }] = await Promise.all([
        usage?.recordImage('map_generate', model, 1, renderedSize),
        saveMapArtifact(base64, mediaType, name, collectionId, sessionId, enhancedPrompt),
      ]);
      progress?.finish(hasSaveStep ? 'save' : 'image');
      return buildImageOutput({ type: 'image', src, label: name ?? 'Encounter Map', collectionId, locationId, artifactId, prompt: enhancedPrompt });
    } catch (err) {
      return `${MAP_ERROR_PREFIX}${imageErrorMessage(err)}`;
    }
  };
}
