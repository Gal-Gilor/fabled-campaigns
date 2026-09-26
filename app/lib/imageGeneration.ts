import { generateImage, APICallError } from 'ai';
import { put } from '@vercel/blob';
import { vertexImage } from './vertexClient';
import { GEMINI_IMAGE_MODEL, IMAGE_ATTEMPTS, MAP_ASPECT_RATIO, type ImageSize } from './config';
import { MAP_FAILURE_MESSAGE } from './messageUtils';
import type { ImageProgressEvent } from './toolProgress';

/** Thrown when every image model is still out of quota after the last attempt. */
export class ImageServiceBusyError extends Error {
  constructor(cause: unknown) {
    super('The image service is busy right now.', { cause });
    this.name = 'ImageServiceBusyError';
  }
}

// Vertex answers a per-minute quota overrun with HTTP 429 RESOURCE_EXHAUSTED.
function isQuotaError(err: unknown): boolean {
  if (APICallError.isInstance(err) && err.statusCode === 429) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|Resource has been exhausted/i.test(message);
}

function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) return reject(abortSignal.reason);
    const timer = setTimeout(() => {
      abortSignal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortSignal?.reason);
    };
    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Error text for an image tool's result. Always a friendly, non-mechanical line —
 * the real error (which can include model names or provider details) goes to the
 * server log instead.
 */
export function imageErrorMessage(err: unknown): string {
  if (err instanceof ImageServiceBusyError) {
    return 'The map is taking longer than usual to come together. Give it a minute and ask again.';
  }
  console.error('[generateMapImage] image call failed:', err);
  return MAP_FAILURE_MESSAGE;
}

/**
 * Runs `call` once per IMAGE_ATTEMPTS entry, in order, moving on only after a quota error.
 * Each attempt first waits its delayMs. Throws ImageServiceBusyError when the
 * last attempt also hits the quota; any other error is thrown at once.
 */
async function withModelFallback<T>(
  call: (model: string) => Promise<T>,
  options: {
    abortSignal?: AbortSignal;
    onProgress?: (event: ImageProgressEvent) => void;
  } = {}
): Promise<{ result: T; model: string }> {
  const { abortSignal, onProgress } = options;
  const attempts = IMAGE_ATTEMPTS;
  let lastQuotaError: unknown;
  for (const [index, { model, delayMs }] of attempts.entries()) {
    if (delayMs > 0) {
      onProgress?.({ kind: 'waiting', resumeAt: Date.now() + delayMs });
      await sleep(delayMs, abortSignal);
    }
    onProgress?.({ kind: 'rendering', afterQuotaError: lastQuotaError !== undefined });
    try {
      return { result: await call(model), model };
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      lastQuotaError = err;
      console.warn(`[generateMapImage] ${model} quota exhausted (attempt ${index + 1} of ${attempts.length})`);
    }
  }
  console.error(`[generateMapImage] every attempt hit the quota; giving up after ${attempts.length} attempts`);
  throw new ImageServiceBusyError(lastQuotaError);
}

export async function generateMapImage(params: {
  prompt: string;
  sourceImages?: string[];
  imageSize: ImageSize;
  abortSignal?: AbortSignal;
  onProgress?: (event: ImageProgressEvent) => void;
}): Promise<{ base64: string; mediaType: string; model: string; imageSize: ImageSize }> {
  const { prompt, sourceImages, imageSize, abortSignal, onProgress } = params;
  // The AI SDK's own retry (a few seconds) is turned off so it doesn't stack
  // with the fallback schedule.
  const { result, model } = await withModelFallback(
    (modelId) => generateImage({
      model: vertexImage.image(modelId),
      prompt: sourceImages?.length ? { text: prompt, images: sourceImages } : prompt,
      providerOptions: {
        vertex: {
          imageConfig: { aspectRatio: MAP_ASPECT_RATIO, imageSize }
        }
      },
      maxRetries: 0,
      abortSignal
    }),
    { abortSignal, onProgress }
  );

  if (result.warnings?.length) {
    console.warn(`[generateMapImage] AI SDK warnings (${model}):`, result.warnings);
  }
  if (result.images.length === 0) {
    throw new Error('[generateMapImage] model returned no images');
  }
  if (result.images.length !== 1) {
    console.warn(`[generateMapImage] expected 1 image, got ${result.images.length}`);
  }

  // Take the last image, not `result.image` (the first): a model that emits interim
  // "thought" images before the final render must never have one of those replace it.
  const { base64, mediaType } = result.images.at(-1)!;
  // `imageSize` is the size actually rendered: the primary model always renders near 1K.
  return { base64, mediaType, model, imageSize: model === GEMINI_IMAGE_MODEL ? '1K' : imageSize };
}

export async function uploadMapImage(
  base64: string,
  mediaType: string,
  pathParts: {
    collectionId?: string;
    locationId?: string;
    label?: string;
    variantTag?: string;
  },
): Promise<string> {
  const { collectionId, locationId, label, variantTag } = pathParts;
  const buffer = Buffer.from(base64, 'base64');
  const ext = mediaType.split('/')[1] ?? 'png';
  const sanitized = (label ?? 'map').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const suffix = variantTag ? `${variantTag}-${sanitized}` : sanitized;
  const filename = collectionId && locationId
    ? `maps/${collectionId}/${locationId}/${Date.now()}-${suffix}.${ext}`
    : `maps/${Date.now()}-${suffix}.${ext}`;
  const { url } = await put(filename, buffer, { access: 'public', contentType: mediaType });
  return url;
}
