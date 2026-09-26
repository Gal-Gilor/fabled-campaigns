import { generateImage, APICallError } from 'ai';
import { put } from '@vercel/blob';
import { vertexImage } from './vertexClient';
import { GEMINI_IMAGE_MODEL, MAP_ASPECT_RATIO, type ImageSize } from './config';
import { errorMessage } from './messageUtils';

/** Thrown when the image model's quota is still exhausted after every retry. */
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

// The quota window is about a minute, so the waits are long; the AI SDK's own
// retry (a few seconds) is turned off in generateMapImage so the two don't stack.
export const QUOTA_RETRY_DELAYS_MS = [15_000, 30_000];

/** Error text for an image tool's result: a plain message when the service is busy. */
export function imageErrorMessage(err: unknown): string {
  if (err instanceof ImageServiceBusyError) return 'The image service is busy right now. Please try again in a minute.';
  return errorMessage(err);
}

/** Runs `call`, retrying only on quota errors after each delay in `delaysMs`. */
export async function withQuotaRetry<T>(
  call: () => Promise<T>,
  options: { abortSignal?: AbortSignal; delaysMs?: number[] } = {},
): Promise<T> {
  const { abortSignal, delaysMs = QUOTA_RETRY_DELAYS_MS } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      const delay = delaysMs[attempt];
      if (delay === undefined) throw new ImageServiceBusyError(err);
      console.warn(`[generateMapImage] quota exhausted, retrying in ${delay / 1000}s (attempt ${attempt + 1} of ${delaysMs.length})`);
      await sleep(delay, abortSignal);
    }
  }
}

export async function generateMapImage(params: {
  prompt: string;
  sourceImages?: string[];
  imageSize: ImageSize;
  abortSignal?: AbortSignal;
}): Promise<{ base64: string; mediaType: string }> {
  const { prompt, sourceImages, imageSize, abortSignal } = params;
  const result = await withQuotaRetry(
    () => generateImage({
      model: vertexImage.image(GEMINI_IMAGE_MODEL),
      prompt: sourceImages?.length ? { text: prompt, images: sourceImages } : prompt,
      providerOptions: {
        vertex: {
          imageConfig: { aspectRatio: MAP_ASPECT_RATIO, imageSize },
        },
      },
      maxRetries: 0,
      abortSignal,
    }),
    { abortSignal },
  );

  if (result.warnings?.length) {
    console.warn('[generateMapImage] AI SDK warnings:', result.warnings);
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
  return { base64, mediaType };
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
