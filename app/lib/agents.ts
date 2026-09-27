import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';
import { GEMINI_MODEL, CHAT_THINKING, DEFAULT_IMAGE_SIZE, type ImageSize } from './config';
import { GM_SYSTEM_PROMPT } from './prompts';
import { gmStubTools } from './tools';
import {
  createGenerateEncounterMap,
  createEnhanceMapPrompt,
} from './mapTools';
import { createEditEncounterMap } from './imageEditTools';
import { VALID_TERRAINS, VALID_SETTINGS } from './mapPrompts';
import { MAP_SCALES, MAP_VIEWS, resolveMapView } from './nanoBananaPrompts';
import type { Collection } from './collections';
import type { UsageRecorder } from './usage';
import { getAmbiancePromptLanguage } from './collections';
import { vertex } from './vertexClient';
import { imageToolModelOutput } from './messageUtils';
import { ProgressTracker, saveStep, streamWithProgress } from './toolProgress';

export interface CampaignContext {
  name: string;
  lore: string;
}

// Composable "Campaign Context" section — phase 2 appends the campaign
// chronicle here. Kept ahead of the collection block so the static-per-campaign
// prefix stays byte-identical across requests (Gemini implicit caching).
// Exported so the chat route can reserve this block's actual length in the
// token window — the reserve can't drift from what is really injected.
export function buildCampaignContext(campaign?: CampaignContext): string {
  const lore = campaign?.lore.trim();
  if (!lore) return '';
  return (
    '\n\n## Campaign Lore\n' +
    `This session is part of the campaign "${campaign!.name}". The following lore is canon. ` +
    'Keep all narration, NPCs, and plot developments consistent with it:\n\n' +
    lore
  );
}

// Composable "Active Collection" section — injected when the user has a
// collection active, so generated maps stay visually consistent with it.
export function buildCollectionContext(collection?: Collection): string {
  if (!collection) return '';
  const parts: string[] = [
    `The user has activated the "${collection.name}" collection.`,
    'All maps generated in this session must visually match this collection:',
  ];
  if (collection.terrain) parts.push(`- Terrain: ${collection.terrain}`);
  if (collection.setting) parts.push(`- Setting: ${collection.setting}`);
  if (collection.ambiance)
    parts.push(`- Lighting/Atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}`);
  if (collection.visualDetails) parts.push(`- Visual details: ${collection.visualDetails}`);
  parts.push(
    'mapAgent applies these properties to every map automatically. Write userRequest as a scene that fits them; ' +
    'there is no need to repeat them.'
  );
  parts.push(
    'IMPORTANT: This collection already provides the atmosphere and terrain context. ' +
    'Any location type the user mentions is immediately "rich enough" — call mapAgent without asking for more details.'
  );
  parts.push(
    'Collection maps are drawn as dioramas of the whole place around the requested area, so prefer `large` or ' +
    '`huge` for mapScale, which sizes the whole diorama. Write userRequest as the requested room or area at its ' +
    'natural size, naming the place it sits in and what surrounds it, and never describe the room itself as ' +
    'sprawling or large-scale.'
  );
  return '\n\n## Active Collection\n' + parts.join('\n');
}

export function createRootAgent({
  userId,
  activeCollection,
  sessionId,
  campaignContext = '',
  usage,
  imageSize = DEFAULT_IMAGE_SIZE,
  guestHistory,
}: {
  userId: string | null;
  activeCollection?: Collection;
  sessionId?: string;
  // Output of buildCampaignContext; the chat route already builds it to size the token window
  campaignContext?: string;
  usage?: UsageRecorder;
  imageSize?: ImageSize;
  // Guests only: the request's serialized history, used to check edit sources
  guestHistory?: string;
}) {
  const collectionContext = buildCollectionContext(activeCollection);

  const enhanceMapPrompt = createEnhanceMapPrompt(activeCollection, usage);
  const generateEncounterMap = createGenerateEncounterMap(userId, sessionId, imageSize, usage);

  const mapAgentTool = tool({
    description: 'Generate a NEW D&D map image from scratch. Describe the scene in natural language — the tool handles image prompt engineering internally. Do NOT use this tool to modify an existing map; use editEncounterMap instead.',
    inputSchema: z.object({
      name: z.string().describe('An evocative D&D location name (e.g. "The Sunken Ossuary", "Thornwatch Pass")'),
      userRequest: z.string().describe(
        'Natural language description of the map scene: the story beat (who is where and why), the layout, the defining ' +
        'features, and the mood'
      ),
      terrain: z.enum(VALID_TERRAINS).optional().describe('Terrain type if identifiable'),
      setting: z.enum(VALID_SETTINGS).optional().describe('Specific building or location type if applicable'),
      perspective: z.enum(['indoor', 'outdoor']).describe('Whether this is an indoor or outdoor map'),
      mapScale: z.enum(MAP_SCALES).optional().describe(
        'How much area the map covers, in 5-ft squares (the grid cells on a battle map). ' +
        'small: 20x15, a small chamber, crevice, or tight passage; ' +
        'standard: 24x18, a single room (the default for rooms); ' +
        'large: 28x21, outdoor encounters (roads, woods, camps, ruins, ambushes) and big spaces such as foyers, ' +
        'great halls, factories, or courtyards; ' +
        'huge: 40x30, fortresses, districts, or battlefields; ' +
        'region: a continent, kingdom, country, or other vast land, drawn as satellite imagery from orbit without a ' +
        'tactical grid; its userRequest names the land\'s major geography (coasts, mountain ranges, rivers, ' +
        'forests, deserts) and only its few major cities, never buildings, castles, or roads. ' +
        'Maps of a building or named place are drawn as dioramas of the whole place around the requested area, and ' +
        'mapScale sizes that whole diorama, so size these up. Keep the room itself at its natural size in ' +
        'userRequest, naming the place it sits in, and never call the room sprawling or large-scale.'
      ),
      mapView: z.enum(MAP_VIEWS).optional().describe(
        'Camera angle. Omit to use the default: isometric for every map except region maps, which are top-down. ' +
        'Set \'top-down\' only when the user asks for an overhead, bird\'s-eye, orthographic, or top-down view.'
      ),
      battleMap: z.boolean().optional().describe(
        'Draws a tactical grid on the map. Set true when the user asks for a battle map, a battle or combat ' +
        'encounter, a grid, or a tactical map, or describes a fight about to happen, such as an ambush or an attack ' +
        'on the party. Omit for a plain location, such as a tavern or a wizard\'s library. Ignored for region maps.'
      ),
    }),
    execute: ({ name, userRequest, terrain, setting, perspective, mapScale, mapView, battleMap }, { abortSignal }) =>
      streamWithProgress(async (emit) => {
        // The server tags the map with the active collection; the model never picks one.
        const collectionId = activeCollection?.id;
        // A collection map with no requested size defaults to `large` — collection
        // maps are dioramas of a larger complex, not a single room.
        const scale = mapScale ?? (activeCollection ? 'large' : undefined);
        const progress = new ProgressTracker(`Drawing "${name}"`, `Drew "${name}"`, [
          {
            id: 'prompt',
            label: 'Plan the layout',
            activeLabel: 'Planning the layout...',
            doneLabel: 'Layout planned',
          },
          { id: 'image', label: 'Draw the map', activeLabel: 'Drawing the map', doneLabel: 'Drew the map' },
          ...(activeCollection && sessionId ? [saveStep(activeCollection.name)] : []),
        ], emit);

        const startedAt = Date.now();
        progress.start('prompt');
        const enhanced = await enhanceMapPrompt({
          userRequest,
          terrain,
          setting,
          perspective,
          mapScale: scale,
          mapView,
          battleMap,
          abortSignal,
        });
        progress.finish('prompt');
        const promptDoneAt = Date.now();

        const result = await generateEncounterMap({ enhancedPrompt: enhanced, name, collectionId, abortSignal, progress });
        const finishedAt = Date.now();
        console.info('[mapAgent] timings', {
          promptMs: promptDoneAt - startedAt,
          imageMs: finishedAt - promptDoneAt,
          totalMs: finishedAt - startedAt,
          mapScale: scale,
          mapView: resolveMapView(mapView, scale),
          battleMap: battleMap ?? false,
        });
        return result;
      }),
    toModelOutput: imageToolModelOutput('Map generated'),
  });

  return new ToolLoopAgent({
    model: vertex(GEMINI_MODEL),
    providerOptions: CHAT_THINKING,
    instructions: GM_SYSTEM_PROMPT + campaignContext + collectionContext,
    tools: {
      ...gmStubTools,
      mapAgent: mapAgentTool,
      editEncounterMap: createEditEncounterMap(userId, sessionId, imageSize, usage, guestHistory),
    },
    onStepFinish: async ({ usage: stepUsage }) => {
      await usage?.recordText('chat', GEMINI_MODEL, stepUsage);
    },
  });
}
