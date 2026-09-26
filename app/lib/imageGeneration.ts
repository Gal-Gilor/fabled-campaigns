import { generateImage } from 'ai';
import { put } from '@vercel/blob';
import { vertexImage } from './vertexClient';
import { GEMINI_IMAGE_MODEL, MAP_ASPECT_RATIO, type ImageSize } from './config';

export async function generateMapImage(params: {
  prompt: string;
  sourceImages?: string[];
  imageSize: ImageSize;
  abortSignal?: AbortSignal;
}): Promise<{ base64: string; mediaType: string }> {
  const { prompt, sourceImages, imageSize, abortSignal } = params;
  const result = await generateImage({
    model: vertexImage.image(GEMINI_IMAGE_MODEL),
    prompt: sourceImages?.length ? { text: prompt, images: sourceImages } : prompt,
    providerOptions: {
      vertex: {
        imageConfig: { aspectRatio: MAP_ASPECT_RATIO, imageSize },
      },
    },
    abortSignal,
  });

  if (result.warnings?.length) {
    console.warn('[generateMapImage] AI SDK warnings:', result.warnings);
  }
  if (result.images.length !== 1) {
    console.warn(`[generateMapImage] expected 1 image, got ${result.images.length}`);
  }

  const { base64, mediaType } = result.image;
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
