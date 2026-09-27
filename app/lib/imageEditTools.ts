import { z } from 'zod';
import { tool } from 'ai';
import type { ImageSize } from './config';
import { generateMapImage, imageErrorMessage, uploadMapImage } from './imageGeneration';
import { expandPrompt } from './promptExpansion';
import { buildImageOutput, EDIT_ERROR_PREFIX, imageToolModelOutput, RETRY_HINT_PREFIX } from './messageUtils';
import {
  createArtifact,
  getArtifactWithContext,
  sessionReferencesText,
  type ArtifactWithContext,
} from '@/db';
import {
  buildEditPrompt,
  NB_PROMPTING_BEST_PRACTICES,
  type SourceContext,
} from './nanoBananaPrompts';
import type { UsageRecorder } from './usage';
import { getAmbiancePromptLanguage } from './collections';
import { imageStepProgress, ProgressTracker, saveStep, streamWithProgress, type ProgressOutput } from './toolProgress';

function toSourceContext(ctx: ArtifactWithContext): SourceContext {
  return {
    prompt: ctx.artifact.prompt,
    collectionName: ctx.collection.name,
    terrain: ctx.collection.terrain,
    setting: ctx.collection.setting,
    ambiance: ctx.collection.ambiance ? getAmbiancePromptLanguage(ctx.collection.ambiance) : null,
    visualDetails: ctx.collection.visualDetails,
  };
}

async function expandEditPrompt(
  basePrompt: string,
  usage?: UsageRecorder,
  abortSignal?: AbortSignal,
): Promise<string> {
  const meta = [
    'You are polishing a base prompt for editing an existing D&D tactical battle map with the Nano Banana model.',
    'The provided source image is the structural anchor. Do NOT add new perspective, grid geometry, zoom, framing, lighting, palette, or style — those are owned by the source image, and explicit additions can conflict with the "preserve everything else" instruction in the base prompt.',
    'Limit polish to flow and specificity of the user-provided edit instruction. Strengthen verbs, sharpen vague descriptors, but do not introduce content that was not in the base prompt.',
    '',
    'Nano Banana best practices:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Preserve every user-provided instruction and constraint from the base prompt verbatim — do not drop, paraphrase, or weaken them.',
    'The grid-overlay paragraph is the highest-priority constraint. Reproduce it verbatim or strengthen it; never compress, condense, or merge it into the preserve-list.',
    'The zoom-and-extent constraint is equally binding. Reproduce it verbatim; never soften it or drop it.',
    '',
    'Output only the polished prompt — no preamble, no quotes.',
    '',
    'BASE PROMPT:',
    basePrompt,
  ].join('\n');
  return expandPrompt({
    prompt: meta,
    usage,
    usageSource: 'edit_prompt',
    isAcceptable: (text) => text.length >= basePrompt.length / 2,
    fallback: () => basePrompt,
    logTag: 'promptExpansion',
    abortSignal,
  });
}

// UUID-shaped IDs only. Catches filename-style strings the model may invent
// from a Blob URL (e.g. "1790392080140-the-chronosynclastic-infusion-chamber--").
const ARTIFACT_ID_PATTERN = /^[0-9a-f-]{36}$/i;

const SOURCE_GUIDANCE =
  `${RETRY_HINT_PREFIX} Pass sourceArtifactId when the prior result has an artifactId; otherwise pass sourceImageUrl (the prior result's src).`;

const SOURCE_NOT_FOUND = `${EDIT_ERROR_PREFIX}Source image not found in this session.`;

// Step list for an edit. The save step is listed only when the edit becomes an
// artifact in a collection.
function editProgress(label: string, collectionName: string | null, emit: (snapshot: ProgressOutput) => void) {
  return new ProgressTracker(`Editing "${label}"`, `Edited "${label}"`, [
    { id: 'prompt', label: 'Read the change', activeLabel: 'Reading the change', doneLabel: 'Wrote the edit' },
    { id: 'image', label: 'Edit the map', activeLabel: 'Editing the map', doneLabel: 'Edited the map' },
    ...(collectionName ? [saveStep(collectionName)] : []),
  ], emit);
}

function warn(
  message: string,
  { sourceArtifactId, sourceImageUrl }: { sourceArtifactId?: string; sourceImageUrl?: string },
): string {
  console.warn('[editEncounterMap]', message, { sourceArtifactId, sourceImageUrl });
  return message;
}

// Derives this project's Vercel Blob public host from BLOB_READ_WRITE_TOKEN
// (format `vercel_blob_rw_<storeId>_<secret>`), so isBlobMapUrl can pin to our
// own store rather than accepting any Vercel Blob store. Returns null when the
// token is missing or malformed. Never logs the token.
function blobStoreHost(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const parts = token.split('_');
  if (parts.length < 4 || parts[0] !== 'vercel' || parts[1] !== 'blob' || parts[2] !== 'rw') return null;
  const storeId = parts[3];
  if (!storeId) return null;
  return `${storeId.toLowerCase()}.public.blob.vercel-storage.com`;
}

const BLOB_STORE_HOST = blobStoreHost();

// True when `urlStr` is a map image the app itself uploaded: parses, https,
// hosted on this project's own Vercel Blob public store (not just any
// *.public.blob.vercel-storage.com host, which an attacker could also own),
// and under the maps/ prefix that uploadMapImage always writes to.
function isBlobMapUrl(urlStr: string): boolean {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }
  return (
    BLOB_STORE_HOST !== null &&
    url.protocol === 'https:' &&
    url.hostname === BLOB_STORE_HOST &&
    url.pathname.startsWith('/maps/')
  );
}

// ---------------------------------------------------------------------------
// editByImageUrl — edits a map that has no artifact row, i.e. one generated
// without an active collection (saveMapArtifact only writes a location/artifact
// when a collection is active). There is no artifact or collection to check
// ownership against, so ownership is scoped to the session that produced the
// image: the URL must appear in that session's own message history. Guests
// have no saved session, so guestHistory (the conversation history their
// request carried) is checked instead — but that history is client-sent, so
// it is only a sanity filter, not a real boundary. The real guard is
// isBlobMapUrl's pinned-store /maps/ check above.
// ---------------------------------------------------------------------------

async function editByImageUrl(params: {
  userId: string | null;
  sessionId: string | undefined;
  sourceImageUrl: string;
  sourceLabel: string | undefined;
  instruction: string;
  imageSize: ImageSize;
  usage?: UsageRecorder;
  guestHistory: string | undefined;
  abortSignal?: AbortSignal;
  emit: (snapshot: ProgressOutput) => void;
}): Promise<string> {
  const { userId, sessionId, sourceImageUrl, sourceLabel, instruction, imageSize, usage, guestHistory, abortSignal, emit } = params;

  if (!isBlobMapUrl(sourceImageUrl)) return warn(SOURCE_NOT_FOUND, { sourceImageUrl });

  let referencesSource: boolean;
  if (!userId) {
    // Guests have no saved session; their history arrives with the request.
    referencesSource = guestHistory?.includes(sourceImageUrl) ?? false;
  } else {
    if (!sessionId) return warn(SOURCE_NOT_FOUND, { sourceImageUrl });
    try {
      referencesSource = await sessionReferencesText(sessionId, userId, sourceImageUrl);
    } catch (err) {
      console.error('[editEncounterMap] sessionReferencesText failed', err);
      return `${EDIT_ERROR_PREFIX}Could not look up the source map.`;
    }
  }
  if (!referencesSource) return warn(SOURCE_NOT_FOUND, { sourceImageUrl });

  try {
    const label = sourceLabel ?? 'Encounter Map';
    const progress = editProgress(label, null, emit);
    progress.start('prompt');
    const basePrompt = buildEditPrompt({
      instruction,
      sourceContext: { prompt: null, collectionName: null, terrain: null, setting: null, ambiance: null, visualDetails: null },
    });
    const expandedPrompt = await expandEditPrompt(basePrompt, usage, abortSignal);
    progress.finish('prompt');

    progress.start('image');
    const { base64, mediaType, model, imageSize: renderedSize } = await generateMapImage({
      prompt: expandedPrompt,
      sourceImages: [sourceImageUrl],
      imageSize,
      abortSignal,
      onProgress: imageStepProgress(progress, 'image'),
    });

    // No collection/location for an uncollected map, so this lands at
    // maps/{ts}-edit-{label}.png rather than under a collection/location prefix.
    const [, newBlobUrl] = await Promise.all([
      usage?.recordImage('map_edit', model, 1, renderedSize),
      uploadMapImage(base64, mediaType, { label, variantTag: 'edit' }),
    ]);
    progress.finish('image');

    // No artifact row is created, so there is no artifactId in the result.
    // A later edit of this result chains by URL again.
    return buildImageOutput({
      type: 'image',
      src: newBlobUrl,
      label: `${label} (edit)`,
      prompt: expandedPrompt,
    });
  } catch (err) {
    return `${EDIT_ERROR_PREFIX}${imageErrorMessage(err)}`;
  }
}

// ---------------------------------------------------------------------------
// editEncounterMap — multimodal Nano Banana edit. When the source map has an
// artifact (saved under a collection), creates a new artifact under the same
// location, with parent_artifact_id pointing to the source. Otherwise, edits
// by the prior result's image URL (see editByImageUrl above).
// ---------------------------------------------------------------------------

export function createEditEncounterMap(
  userId: string | null,
  sessionId: string | undefined,
  imageSize: ImageSize,
  usage?: UsageRecorder,
  guestHistory?: string
) {
  return tool({
    description:
      'Edit an existing encounter map using Nano Banana multimodal generation. ' +
      'Maps with an artifactId are edited by passing sourceArtifactId, and the result is saved as a new artifact linked back to the source; ' +
      'maps without one are edited by passing sourceImageUrl (the prior result\'s src), and the result is not saved to a collection. ' +
      'Never build an ID from a filename or URL — use only the artifactId or src exactly as returned by the prior tool result.',
    inputSchema: z.object({
      sourceArtifactId: z
        .string()
        .optional()
        .describe('The artifactId from a prior map result. Only use it when that result contains artifactId.'),
      sourceImageUrl: z
        .string()
        .optional()
        .describe('The src from a prior map result that has no artifactId.'),
      sourceLabel: z
        .string()
        .optional()
        .describe('The prior result\'s label.'),
      instruction: z
        .string()
        .describe('Natural-language description of the change (e.g. "add a campfire near the stones", "make it darker at dusk").'),
    }),
    toModelOutput: imageToolModelOutput('Edited map'),
    execute: ({ sourceArtifactId, sourceImageUrl, sourceLabel, instruction }, { abortSignal }) =>
      streamWithProgress(async (emit) => {
        if (Boolean(sourceArtifactId) === Boolean(sourceImageUrl)) {
          return warn(SOURCE_GUIDANCE, { sourceArtifactId, sourceImageUrl });
        }

        if (sourceImageUrl) {
          return editByImageUrl({
            userId,
            sessionId,
            sourceImageUrl,
            sourceLabel,
            instruction,
            imageSize,
            usage,
            guestHistory,
            abortSignal,
            emit,
          });
        }

        const artifactId = sourceArtifactId!;
        if (!ARTIFACT_ID_PATTERN.test(artifactId)) {
          return warn(SOURCE_GUIDANCE, { sourceArtifactId, sourceImageUrl });
        }

        if (!userId) {
          return warn(`${EDIT_ERROR_PREFIX}Could not find the map to edit.`, { sourceArtifactId, sourceImageUrl });
        }

        let ctx: ArtifactWithContext | null;
        try {
          ctx = await getArtifactWithContext(artifactId, userId);
        } catch (err) {
          console.error('[editEncounterMap] getArtifactWithContext failed', err);
          return `${EDIT_ERROR_PREFIX}Could not look up the source map.`;
        }
        if (!ctx) {
          // artifactId stays out of the user-facing text; warn() still logs it below.
          return warn(`${EDIT_ERROR_PREFIX}Could not find the map to edit.`, {
            sourceArtifactId,
            sourceImageUrl,
          });
        }
        try {
          const progress = editProgress(ctx.location.name, ctx.collection.name, emit);
          progress.start('prompt');
          const basePrompt = buildEditPrompt({
            instruction,
            sourceContext: toSourceContext(ctx),
          });
          const expandedPrompt = await expandEditPrompt(basePrompt, usage, abortSignal);
          progress.finish('prompt');

          progress.start('image');
          const { base64, mediaType, model, imageSize: renderedSize } = await generateMapImage({
            prompt: expandedPrompt,
            sourceImages: [ctx.artifact.blobUrl],
            imageSize,
            abortSignal,
            onProgress: imageStepProgress(progress, 'image'),
          });
          progress.finish('image');

          progress.start('save');
          const [, newBlobUrl] = await Promise.all([
            usage?.recordImage('map_edit', model, 1, renderedSize),
            uploadMapImage(base64, mediaType, {
              collectionId: ctx.collection.id,
              locationId: ctx.location.id,
              label: ctx.location.name,
              variantTag: 'edit',
            }),
          ]);

          const artifact = await createArtifact(ctx.location.id, {
            blobUrl: newBlobUrl,
            prompt: expandedPrompt,
            mediaType,
            parentArtifactId: ctx.artifact.id,
          });
          progress.finish('save');

          return buildImageOutput({
            type: 'image',
            src: newBlobUrl,
            label: `${ctx.location.name} (edit)`,
            collectionId: ctx.collection.id,
            locationId: ctx.location.id,
            artifactId: artifact.id,
            prompt: expandedPrompt,
          });
        } catch (err) {
          return `${EDIT_ERROR_PREFIX}${imageErrorMessage(err)}`;
        }
      }),
  });
}
