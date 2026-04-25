import { ToolLoopAgent, tool, InferAgentUIMessage } from 'ai';
import { z } from 'zod';
import { GEMINI_MODEL } from './config';
import { GM_SYSTEM_PROMPT } from './prompts';
import { gmStubTools } from './tools';
import {
  createGenerateEncounterMap,
  createGenerateCollectionMap,
  createGenerateNarrativeDescription,
  createEnhanceMapPrompt,
} from './mapTools';
import { VALID_TERRAINS, VALID_SETTINGS } from './mapPrompts';
import type { Collection } from './collections';
import { getAmbiancePromptLanguage } from './collections';
import { vertex } from './vertexClient';
import { safeJsonParse, isImageOutput } from './messageUtils';

export function createRootAgent(activeCollection?: Collection, collectionReferenceUrl?: string, sessionId?: string) {
  const collectionContext = activeCollection
    ? (() => {
        const parts: string[] = [
          `The user has activated the "${activeCollection.name}" collection.`,
          'All maps generated in this session must visually match this collection:',
        ];
        if (activeCollection.terrain) parts.push(`- Terrain: ${activeCollection.terrain}`);
        if (activeCollection.setting) parts.push(`- Setting: ${activeCollection.setting}`);
        if (activeCollection.ambiance)
          parts.push(`- Lighting/Atmosphere: ${getAmbiancePromptLanguage(activeCollection.ambiance)}`);
        if (activeCollection.visualDetails) parts.push(`- Visual details: ${activeCollection.visualDetails}`);
        parts.push(
          `When calling mapAgent, include collectionId: "${activeCollection.id}" and incorporate the above visual properties into enhancedPrompt.`
        );
        parts.push(
          'IMPORTANT: This collection already provides the atmosphere and terrain context. ' +
          'Any location type the user mentions is immediately "rich enough" — call mapAgent without asking for more details.'
        );
        return '\n\n## Active Collection\n' + parts.join('\n');
      })()
    : '';

  const generateNarrative = createGenerateNarrativeDescription(activeCollection);
  const enhanceMapPrompt = createEnhanceMapPrompt(activeCollection);
  const generateEncounterMap = createGenerateEncounterMap(sessionId);
  const generateCollectionMap = collectionReferenceUrl ? createGenerateCollectionMap(sessionId) : null;

  const mapAgentTool = tool({
    description: 'Generate a D&D tactical encounter map image. Describe the scene in natural language — the tool handles image prompt engineering internally.',
    inputSchema: z.object({
      name: z.string().describe('An evocative D&D location name (e.g. "The Sunken Ossuary", "Thornwatch Pass")'),
      userRequest: z.string().describe('Natural language description of the map scene, features, and mood'),
      terrain: z.enum(VALID_TERRAINS).optional().describe('Terrain type if identifiable'),
      setting: z.enum(VALID_SETTINGS).optional().describe('Specific building or location type if applicable'),
      perspective: z.enum(['indoor', 'outdoor']).describe('Whether this is an indoor or outdoor map'),
      detailLevel: z.enum(['close-up', 'wide']).describe(
        'close-up: room/small-area scale (~5ft per grid square); wide: regional or multi-room scale'
      ),
      collectionId: z.string().optional().describe('Active collection ID to tag this map'),
    }),
    execute: async ({ name, userRequest, terrain, setting, perspective, detailLevel, collectionId }) => {
      const narrative = await generateNarrative({ userRequest, terrain, setting });
      const enhancedRaw = await enhanceMapPrompt.execute!(
        {
          userRequest: narrative,
          ambiance: activeCollection?.ambiance ?? '',
          terrain,
          setting,
          perspective,
          detailLevel,
        },
        { toolCallId: '', messages: [] }
      );
      const enhanced = typeof enhancedRaw === 'string' ? enhancedRaw : narrative;

      if (generateCollectionMap && collectionReferenceUrl) {
        return generateCollectionMap.execute!(
          { enhancedPrompt: enhanced, name, collectionId, referenceImageUrl: collectionReferenceUrl },
          { toolCallId: '', messages: [] }
        );
      }

      return generateEncounterMap.execute!(
        { enhancedPrompt: enhanced, name, collectionId },
        { toolCallId: '', messages: [] }
      );
    },
    toModelOutput: ({ output }: { output: unknown }) => {
      const o = safeJsonParse(output);
      if (isImageOutput(o)) return { type: 'text' as const, value: `Map generated: ${o.label}` };
      return { type: 'text' as const, value: String(output) };
    },
  });

  return new ToolLoopAgent({
    model: vertex(GEMINI_MODEL),
    instructions: GM_SYSTEM_PROMPT + collectionContext,
    tools: { ...gmStubTools, mapAgent: mapAgentTool },
  });
}

// Keep type export for consumers
export type RootAgentMessage = InferAgentUIMessage<ReturnType<typeof createRootAgent>>;
