import { z } from 'zod';
import { tool, generateText } from 'ai';
import {
  GEMINI_MODEL,
  GEMINI_IMAGE_MODEL,
  type ImageSize,
} from './config';
import { vertex } from './vertexClient';
import { generateMapImage, uploadMapImage } from './imageGeneration';
import { safeJsonParse, isImageOutput } from './messageUtils';
import {
  createArtifact,
  getArtifactWithContext,
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
      maxOutputTokens: 800,
    });
    await usage?.recordText('edit_prompt', GEMINI_MODEL, result.usage);
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

// ---------------------------------------------------------------------------
// editEncounterMap — multimodal Nano Banana edit; new artifact under the
// SAME location, with parent_artifact_id pointing to the source.
// ---------------------------------------------------------------------------

export function createEditEncounterMap(userId: string | null, imageSize: ImageSize, usage?: UsageRecorder) {
  return tool({
    description:
      'Edit an existing encounter map using Nano Banana multimodal generation. ' +
      'Creates a new artifact under the same location, linked back to the source. ' +
      'Use for in-place modifications and what-if branches of the same scene.',
    inputSchema: z.object({
      sourceArtifactId: z
        .string()
        .describe('Artifact ID of the source map. Take this from a prior tool result; do not invent one.'),
      instruction: z
        .string()
        .describe('Natural-language description of the change (e.g. "add a campfire near the stones", "make it darker at dusk").'),
    }),
    toModelOutput: ({ output }: { output: unknown }) => {
      const o = safeJsonParse(output);
      if (isImageOutput(o)) return { type: 'text' as const, value: `Edited map: ${o.label}` };
      return { type: 'text' as const, value: String(output) };
    },
    execute: async ({ sourceArtifactId, instruction }, { abortSignal }) => {
      if (!userId) {
        return '[editEncounterMap error] Sign in to edit maps.';
      }
      const ctx = await getArtifactWithContext(sourceArtifactId, userId);
      if (!ctx) {
        return `[editEncounterMap error] Source artifact "${sourceArtifactId}" not found.`;
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
        await usage?.recordImage('map_edit', GEMINI_IMAGE_MODEL, 1);

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
        return `[editEncounterMap error] ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });
}
