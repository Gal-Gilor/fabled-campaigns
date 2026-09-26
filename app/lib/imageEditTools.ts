import { z } from 'zod';
import { tool, generateText } from 'ai';
import {
  GEMINI_MODEL,
  GEMINI_IMAGE_MODEL,
  SHORT_CALL_MAX_OUTPUT_TOKENS,
  SHORT_CALL_THINKING,
  type ImageSize,
} from './config';
import { vertex } from './vertexClient';
import { generateMapImage, uploadMapImage } from './imageGeneration';
import { safeJsonParse, isImageOutput, RETRY_HINT_PREFIX } from './messageUtils';
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

function toSourceContext(ctx: ArtifactWithContext): SourceContext {
  return {
    prompt: ctx.artifact.prompt,
    terrain: ctx.collection.terrain,
    setting: ctx.collection.setting,
    ambiance: ctx.collection.ambiance,
    visualDetails: ctx.collection.visualDetails,
  };
}

async function runPromptExpansion(
  meta: string,
  basePrompt: string,
  usage?: UsageRecorder,
): Promise<string> {
  try {
    const result = await generateText({
      model: vertex(GEMINI_MODEL),
      prompt: meta,
      maxOutputTokens: SHORT_CALL_MAX_OUTPUT_TOKENS,
      providerOptions: SHORT_CALL_THINKING,
    });
    await usage?.recordText('edit_prompt', GEMINI_MODEL, result.usage);
    if (result.finishReason === 'length') throw new Error('Expansion cut off at maxOutputTokens');
    const expanded = result.text.trim();
    // Sanity guard: if the LLM returned an empty/truncated/refusal response,
    // fall back to the deterministic basePrompt instead of shipping a degraded prompt.
    if (expanded.length >= basePrompt.length / 2) return expanded;
    return basePrompt;
  } catch (err) {
    console.warn('[promptExpansion] LLM expansion failed; using deterministic basePrompt:', err);
    return basePrompt;
  }
}

async function expandEditPrompt(basePrompt: string, usage?: UsageRecorder): Promise<string> {
  const meta = [
    'You are polishing a base prompt for editing an existing D&D tactical battle map with the Nano Banana model.',
    'The provided source image is the structural anchor. Do NOT add new perspective, grid geometry, lighting, palette, or style — those are owned by the source image, and explicit additions can conflict with the "preserve everything else" instruction in the base prompt.',
    'Limit polish to flow and specificity of the user-provided edit instruction. Strengthen verbs, sharpen vague descriptors, but do not introduce content that was not in the base prompt.',
    '',
    'Nano Banana best practices:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Preserve every user-provided instruction and constraint from the base prompt verbatim — do not drop, paraphrase, or weaken them.',
    'The grid-overlay paragraph is the highest-priority constraint. Reproduce it verbatim or strengthen it; never compress, condense, or merge it into the preserve-list.',
    '',
    'Output only the polished prompt — no preamble, no quotes.',
    '',
    'BASE PROMPT:',
    basePrompt,
  ].join('\n');
  return runPromptExpansion(meta, basePrompt, usage);
}

// UUID-shaped IDs only. Catches filename-style strings the model may invent
// from a Blob URL (e.g. "1790392080140-the-chronosynclastic-infusion-chamber--").
const ARTIFACT_ID_PATTERN = /^[0-9a-f-]{36}$/i;

const SOURCE_GUIDANCE =
  `${RETRY_HINT_PREFIX} Pass sourceArtifactId when the prior result has an artifactId; otherwise pass sourceImageUrl (the prior result's src).`;

const SOURCE_NOT_FOUND = '[editEncounterMap error] Source image not found in this session.';

// True when `urlStr` is a map image the app itself uploaded: parses, https,
// hosted under a Vercel Blob public store, and under the maps/ prefix that
// uploadMapImage always writes to.
function isBlobMapUrl(urlStr: string): boolean {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname.endsWith('.public.blob.vercel-storage.com') &&
    url.pathname.startsWith('/maps/')
  );
}

// ---------------------------------------------------------------------------
// editByImageUrl — edits a map that has no artifact row, i.e. one generated
// without an active collection (saveMapArtifact only writes a location/artifact
// when a collection is active). There is no artifact or collection to check
// ownership against, so ownership is scoped to the session that produced the
// image: the URL must appear in that session's own message history.
// ---------------------------------------------------------------------------

async function editByImageUrl(params: {
  userId: string;
  sessionId: string | undefined;
  sourceImageUrl: string;
  sourceLabel: string | undefined;
  instruction: string;
  imageSize: ImageSize;
  usage?: UsageRecorder;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const { userId, sessionId, sourceImageUrl, sourceLabel, instruction, imageSize, usage, abortSignal } = params;

  const warn = (message: string): string => {
    console.warn('[editEncounterMap]', message, { sourceArtifactId: undefined, sourceImageUrl });
    return message;
  };

  if (!isBlobMapUrl(sourceImageUrl)) return warn(SOURCE_NOT_FOUND);
  if (!sessionId) return warn(SOURCE_NOT_FOUND);

  let referencesSource: boolean;
  try {
    referencesSource = await sessionReferencesText(sessionId, userId, sourceImageUrl);
  } catch (err) {
    console.error('[editEncounterMap] sessionReferencesText failed', err);
    return '[editEncounterMap error] Could not look up the source map.';
  }
  if (!referencesSource) return warn(SOURCE_NOT_FOUND);

  try {
    const label = sourceLabel ?? 'Encounter Map';
    const basePrompt = buildEditPrompt({
      instruction,
      sourceContext: { prompt: null, terrain: null, setting: null, ambiance: null, visualDetails: null },
    });
    const expandedPrompt = await expandEditPrompt(basePrompt, usage);

    const { base64, mediaType } = await generateMapImage({
      prompt: expandedPrompt,
      sourceImages: [sourceImageUrl],
      imageSize,
      abortSignal,
    });
    await usage?.recordImage('map_edit', GEMINI_IMAGE_MODEL, 1, imageSize);

    // No collection/location for an uncollected map, so this lands at
    // maps/{ts}-edit-{label}.png rather than under a collection/location prefix.
    const newBlobUrl = await uploadMapImage(base64, mediaType, { label, variantTag: 'edit' });

    // No artifact row is created, so there is no artifactId in the result.
    // A later edit of this result chains by URL again.
    return JSON.stringify({
      type: 'image',
      src: newBlobUrl,
      label: `${label} (edit)`,
      prompt: expandedPrompt,
    });
  } catch (err) {
    console.error('[editEncounterMap]', err);
    return `[editEncounterMap error] ${err instanceof Error ? err.message : String(err)}`;
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
  usage?: UsageRecorder
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
    toModelOutput: ({ output }: { output: unknown }) => {
      const o = safeJsonParse(output);
      if (isImageOutput(o)) return { type: 'text' as const, value: `Edited map: ${o.label}` };
      return { type: 'text' as const, value: String(output) };
    },
    execute: async ({ sourceArtifactId, sourceImageUrl, sourceLabel, instruction }, { abortSignal }) => {
      if (!userId) {
        return '[editEncounterMap error] Sign in to edit maps.';
      }

      const warn = (message: string): string => {
        console.warn('[editEncounterMap]', message, { sourceArtifactId, sourceImageUrl });
        return message;
      };

      if (Boolean(sourceArtifactId) === Boolean(sourceImageUrl)) {
        return warn(SOURCE_GUIDANCE);
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
          abortSignal,
        });
      }

      const artifactId = sourceArtifactId!;
      if (!ARTIFACT_ID_PATTERN.test(artifactId)) {
        return warn(SOURCE_GUIDANCE);
      }

      let ctx: ArtifactWithContext | null;
      try {
        ctx = await getArtifactWithContext(artifactId, userId);
      } catch (err) {
        console.error('[editEncounterMap] getArtifactWithContext failed', err);
        return '[editEncounterMap error] Could not look up the source map.';
      }
      if (!ctx) {
        return warn(`[editEncounterMap error] Source artifact "${artifactId}" not found.`);
      }
      try {
        const basePrompt = buildEditPrompt({
          instruction,
          sourceContext: toSourceContext(ctx),
        });
        const expandedPrompt = await expandEditPrompt(basePrompt, usage);

        const { base64, mediaType } = await generateMapImage({
          prompt: expandedPrompt,
          sourceImages: [ctx.artifact.blobUrl],
          imageSize,
          abortSignal,
        });
        await usage?.recordImage('map_edit', GEMINI_IMAGE_MODEL, 1, imageSize);

        const newBlobUrl = await uploadMapImage(base64, mediaType, {
          collectionId: ctx.collection.id,
          locationId: ctx.location.id,
          label: ctx.location.name,
          variantTag: 'edit',
        });

        const artifact = await createArtifact(ctx.location.id, {
          blobUrl: newBlobUrl,
          prompt: expandedPrompt,
          mediaType,
          parentArtifactId: ctx.artifact.id,
        });

        return JSON.stringify({
          type: 'image',
          src: newBlobUrl,
          label: `${ctx.location.name} (edit)`,
          collectionId: ctx.collection.id,
          locationId: ctx.location.id,
          artifactId: artifact.id,
          prompt: expandedPrompt,
        });
      } catch (err) {
        console.error('[editEncounterMap]', err);
        return `[editEncounterMap error] ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}
