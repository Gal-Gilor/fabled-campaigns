import { ToolLoopAgent, tool, readUIMessageStream, InferAgentUIMessage } from 'ai';
import { z } from 'zod';
import { GEMINI_MODEL } from './config';
import { GM_SYSTEM_PROMPT } from './prompts';
import { gmStubTools } from './tools';
import {
  createGenerateNarrativeDescription,
  createEnhanceMapPrompt,
  generateEncounterMap,
  generateMapName,
} from './mapTools';
import type { Collection } from './collections';
import { getAmbiancePromptLanguage } from './collections';
import { vertex } from './vertexClient';

function buildMapSubAgentInstructions(collection?: Collection): string {
  const collectionHeader = collection
    ? `You are generating maps for the "${collection.name}" collection. All maps must visually match this location's DNA: ${[
        collection.terrain && `Terrain: ${collection.terrain}`,
        collection.setting && `Setting: ${collection.setting}`,
        collection.ambiance && `Ambiance: ${getAmbiancePromptLanguage(collection.ambiance)}`,
        collection.visualDetails && `Visual details: ${collection.visualDetails}`,
      ]
        .filter(Boolean)
        .join(', ')}.\n\n`
    : '';

  const collectionIdLine = collection
    ? `4. Call generateEncounterMap with the enhanced prompt, the name from step 1, and collectionId: "${collection.id}".`
    : '4. Call generateEncounterMap with the enhanced prompt and the name from step 1.';

  const summaryLine = collection
    ? `5. Summarize: state the map name and confirm it was added to the "${collection.name}" collection.`
    : '5. Summarize: state the map name and briefly describe what was generated.';

  const narrativeParams = collection
    ? `terrain: "${collection.terrain ?? ''}", setting: "${collection.setting ?? ''}", ambiance: "${collection.ambiance ?? ''}" — these come from the active collection, always pass them.`
    : 'terrain, setting, and ambiance if you can identify them from the request.';

  return `${collectionHeader}You are a map generation specialist for D&D 5e.
When given a map request:
1. Call generateMapName with the request details to create a location name.
2. Call generateNarrativeDescription with the userRequest and ${narrativeParams}
3. Call enhanceMapPrompt — use the narrative from step 2 as userRequest, and pass perspective (indoor/outdoor) and detailLevel (close-up/wide).
${collectionIdLine}
${summaryLine}`;
}

export function createRootAgent(activeCollection?: Collection) {
  const collectionPreamble = activeCollection
    ? `\n\n## Active Collection\nThe user has activated the "${activeCollection.name}" collection. When generating a map, acknowledge this collection in your response before calling mapAgent (e.g. "Generating the [map name] for ${activeCollection.name}...").`
    : '';

  const mapSubAgent = new ToolLoopAgent({
    model: vertex(GEMINI_MODEL),
    instructions: buildMapSubAgentInstructions(activeCollection),
    tools: {
      generateMapName,
      generateNarrativeDescription: createGenerateNarrativeDescription(activeCollection),
      enhanceMapPrompt: createEnhanceMapPrompt(activeCollection),
      generateEncounterMap,
    },
  });

  const mapAgentTool = tool({
    description: 'Generate a D&D tactical encounter map image',
    inputSchema: z.object({
      description: z.string().describe('Full description of the map — terrain, setting, key features'),
      vibe: z.string().optional().describe('Mood or atmosphere the map should convey'),
    }),
    execute: async function* ({ description, vibe }, { abortSignal }) {
      const prompt = vibe ? `${description}\nVibe: ${vibe}` : description;
      const result = await mapSubAgent.stream({ prompt, abortSignal });
      for await (const msg of readUIMessageStream({ stream: result.toUIMessageStream() })) {
        yield msg;
      }
    },
    toModelOutput: ({ output: message }) => {
      const lastText = message?.parts?.findLast((p: { type: string }) => p.type === 'text');
      return { type: 'text' as const, value: (lastText as { text?: string })?.text ?? 'Map generated.' };
    },
  });

  return new ToolLoopAgent({
    model: vertex(GEMINI_MODEL),
    instructions: GM_SYSTEM_PROMPT + collectionPreamble,
    tools: { ...gmStubTools, mapAgent: mapAgentTool },
  });
}

// Keep type export for consumers
export type RootAgentMessage = InferAgentUIMessage<ReturnType<typeof createRootAgent>>;
