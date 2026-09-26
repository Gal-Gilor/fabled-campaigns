// Prompt builders for Nano Banana (GEMINI_IMAGE_MODEL in ./config).
// Nano Banana has no negativePrompt field, so every exclusion is written
// inline as a concrete scene property. Prompts are narrative prose, not
// keyword lists.

import { getAmbiancePromptLanguage } from './collections';
import type { Collection } from './collections';
import { generateSettingDescription, generateTerrainDescription } from './mapPrompts';

export const NANO_BANANA_NEGATION =
  'The map is completely unoccupied: no people, figures, creatures, characters, miniatures, or tokens anywhere. ' +
  'The image carries no text, labels, legends, names, frames, borders, or watermarks. ' +
  'Seen strictly from directly overhead; never from the side, front, or below. ' +
  'Tack-sharp focus across the whole map.';

export const NB_PROMPTING_BEST_PRACTICES = [
  '- Nano Banana has no negativePrompt parameter — express any "not X" constraint inline as a positive scene property.',
  '- Use conversational, imperative phrasing — "render the rocks as moss-covered granite" works better than tag-soup like "rocks, moss, granite, weathered".',
  '- Nano Banana ignores quality tokens such as "8K", "masterpiece", "Unreal Engine", and "ultra-detailed". Describe the actual material, lighting, and rendering qualities instead.',
  '- When the prompt requires literal text in the image, wrap it in quotes and specify font, weight, and case.',
  '- Output a single coherent prompt — no preamble, no quotes around the whole prompt, no commentary.',
].join('\n');

export interface SourceContext {
  /** The source artifact's stored prompt — useful style cues, may be null. */
  prompt: string | null;
  /** Active collection terrain, if any. */
  terrain: string | null;
  /** Active collection setting, if any. */
  setting: string | null;
  /** Active collection ambiance, if any. */
  ambiance: string | null;
  /** Active collection visual details, if any. */
  visualDetails: string | null;
}

function renderSourceContext(ctx: SourceContext): string {
  const parts: string[] = [];
  if (ctx.terrain) parts.push(`Terrain: ${ctx.terrain}`);
  if (ctx.setting) parts.push(`Setting: ${ctx.setting}`);
  if (ctx.ambiance) parts.push(`Mood: ${ctx.ambiance}`);
  if (ctx.visualDetails) parts.push(`Visual style: ${ctx.visualDetails}`);
  if (ctx.prompt) parts.push(`Original prompt (for style reference only): ${ctx.prompt}`);
  return parts.length ? `\nSource context:\n${parts.map((p) => `- ${p}`).join('\n')}` : '';
}

export function buildEditPrompt(params: {
  instruction: string;
  sourceContext: SourceContext;
}): string {
  const { instruction, sourceContext } = params;
  return [
    'You are editing the provided D&D encounter battle map.',
    'Apply the requested change as a focused edit, blending it into the surrounding pixels so the change reads as native.',
    'Preserve everything else, including composition, lighting, palette, brush style, terrain, and structures as in the source image.',
    'Maintaining the gridlines layer that covers terrain is most important. Reproduce every grid line at the exact same spacing, color, line weight, and opacity as the source. Any region you repaint must show the same grid lines as the surrounding pixels — gridlines must be continuous and seamless across the entire image, including replaced terrain.',
    `\nEdit instruction: ${instruction.trim()}`,
    renderSourceContext(sourceContext),
    `\nConstraints to maintain:\n- ${NANO_BANANA_NEGATION}`,
    '- Top-down orthographic perspective.',
    '- Sharp focus, painterly fantasy-cartography style.',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

export interface GenerationPromptParams {
  userRequest: string;
  ambiance?: string;
  terrain?: string;
  setting?: string;
  perspective?: 'indoor' | 'outdoor';
  mapScale?: MapScale;
  name?: string;
  collection?: Collection;
}

// Map size tiers, smallest to largest. Every square is roughly 5 feet;
// the tier sets how many squares the frame shows and how much detail to draw.
export const MAP_SCALES = ['small', 'standard', 'large', 'huge'] as const;
export type MapScale = (typeof MAP_SCALES)[number];
export const DEFAULT_MAP_SCALE: MapScale = 'standard';

const CAMERA_OPENING = 'A zoomed-out, top-down orthographic view from high above, straight down, of';

// Without an explicit frame size the model crops tight around one feature,
// so every scale states how many grid squares the image shows.
const FRAMING_SENTENCE =
  'The whole location fits inside the frame with open margin on every side; no wall, room, or feature is cut off ' +
  'by the image edge, and the view is never a close crop of a single object. Draw large, readable shapes and ' +
  'leave out small clutter such as papers, bottles, tools, and scattered debris.';

const GRID_CLAUSE =
  'A clearly visible, uniform square tactical grid of thin, crisp lines, in a color that contrasts with the ground beneath it, ' +
  'covers the entire playable area edge to edge and runs unbroken across every floor, slope, bridge, and elevation.';

const SCALE_SENTENCES: Record<MapScale, string> = {
  small:
    'This is a map of a small chamber, crevice, or tight passage: the frame shows 20 by 15 grid squares, each ' +
    'covering roughly 5 feet. Show the shape of the space and only its few key features.',
  standard:
    'This is a map of a single room or encounter area: the frame shows 24 by 18 grid squares, each covering roughly ' +
    '5 feet. Show the room\'s layout and its main furniture or features, each covering at least a couple of squares.',
  large:
    'This is a map of a large space such as a foyer, great hall, factory floor, or courtyard: the frame shows ' +
    '28 by 21 grid squares, each covering roughly 5 feet. Keep detail low: show the major structures, zones, and ' +
    'walkways rather than individual objects.',
  huge:
    'This is a map of a very large area such as a fortress, a district, or a stretch of wilderness: the frame shows ' +
    '40 by 30 grid squares, each covering roughly 5 feet. Show only the major landmarks, the overall layout, and the ' +
    'routes between them, with no small-scale detail.',
};

const INDOOR_SENTENCE =
  'This is an interior map: show the floor plan with its walls and doorways as if the roof were removed.';

function scaleSentence(mapScale: MapScale = DEFAULT_MAP_SCALE): string {
  return `${SCALE_SENTENCES[mapScale]} ${FRAMING_SENTENCE}`;
}

export function describeSubject(params: GenerationPromptParams): string {
  const request = params.userRequest.trim();
  if (request) return request;
  if (params.setting) return generateSettingDescription(params.setting);
  if (params.terrain) return generateTerrainDescription(params.terrain);
  return 'A fantasy battle map location.';
}

function collectionLines(collection?: Collection): string[] {
  if (!collection) return [];
  const lines: string[] = [];
  if (collection.ambiance) {
    lines.push(`Lighting and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}`);
  }
  if (collection.visualDetails) lines.push(`Visual details: ${collection.visualDetails}`);
  return lines;
}

const GENERATION_EXAMPLES = [
  {
    request: 'A map of a tavern',
    scale: 'standard',
    prompt:
      `${CAMERA_OPENING} the entire ground floor of a fantasy tavern, framed to show 24 by 18 grid squares of roughly ` +
      '5 feet each, with every outer wall visible and open margin around the building. The common room holds rows of ' +
      'long tables, a long bar along the west wall, and a wide stone fireplace along the north wall. A sunken fighting pit ' +
      'sits one level below the main floor, reached by two short flights of steps, and a balcony along the east wall is ' +
      'reached by a staircase. Rendered as a painterly fantasy battle map in warm wood and stone tones, lit by firelight ' +
      'from the hearth, with soft shadows that mark where the floor drops into the pit. A clearly visible, uniform square ' +
      'grid of thin, crisp black lines covers the entire playable area edge to edge, running unbroken across the pit floor, ' +
      `the stairs, and the balcony. ${NANO_BANANA_NEGATION}`,
  },
  {
    request: 'a forest clearing map',
    scale: 'large',
    prompt:
      `${CAMERA_OPENING} a forest clearing and the woods around it, framed to show 28 by 21 grid squares of roughly ` +
      '5 feet each, so the whole clearing and its edges sit inside the frame. A ring of standing stones sits at the ' +
      'center of a grassy clearing bordered by a dense tree canopy. A ravine with a stream cuts across the eastern side, ' +
      'a fallen log spans it as a bridge, and a dirt trail winds down the southern slope to the stream. Rendered as a ' +
      'painterly fantasy battle map in deep greens and earth tones under late-afternoon sunlight, with shadows along the ' +
      'ravine walls that show its depth. A clearly visible, uniform square grid of thin, crisp pale cream lines covers ' +
      'the entire playable area edge to edge, continuing across the canopy, the ravine floor, and the log bridge. ' +
      NANO_BANANA_NEGATION,
  },
  {
    request: 'a dungeon maze',
    scale: 'huge',
    prompt:
      `${CAMERA_OPENING} a sprawling dungeon maze, framed to show 40 by 30 grid squares of roughly 5 feet each, so the ` +
      'full network of passages sits inside the frame. Corridors of rough stone twist between chambers, several of them ' +
      'ending in dead ends. A wide chasm splits the center of the maze and is crossed by a single bridge, and stairs lead ' +
      'down from the northern passages to a lower level of chambers. Rendered as a painterly fantasy battle map in cold ' +
      'grey-blue stone tones lit by scattered wall sconces, with pitch-black shadow inside the chasm. A clearly visible, ' +
      'uniform square grid of thin, crisp white lines covers the entire playable area edge to edge, running across the ' +
      `corridors, the stairs, and the bridge. ${NANO_BANANA_NEGATION}`,
  },
];

/**
 * Meta-prompt for the text model that expands a map request into a single
 * Nano Banana image prompt.
 */
export function buildGenerationMetaPrompt(params: GenerationPromptParams): string {
  const { ambiance, terrain, setting, perspective, mapScale = DEFAULT_MAP_SCALE, name, collection } = params;

  const requestLines = [`Request: ${describeSubject(params)}`];
  if (name) requestLines.push(`Map name, for context only (do not render it as text): ${name}`);
  if (setting) requestLines.push(`Setting: ${setting}`);
  if (terrain) requestLines.push(`Terrain: ${terrain}`);
  if (perspective === 'indoor') requestLines.push(`Perspective: indoor. ${INDOOR_SENTENCE}`);
  else if (perspective === 'outdoor') requestLines.push('Perspective: outdoor.');
  if (ambiance) requestLines.push(`Mood: ${ambiance}`);
  requestLines.push(`Scale: ${mapScale}. ${scaleSentence(mapScale)}`);

  const consistency = collectionLines(collection);
  const consistencyBlock = collection && consistency.length
    ? [
      '',
      `Visual consistency: this map belongs to the "${collection.name}" collection. ` +
        'Describe these properties so the map matches the other maps in the collection:',
      ...consistency.map((line) => `- ${line}`),
    ]
    : [];

  const examples = GENERATION_EXAMPLES.map(
    (ex) => `Request: ${ex.request}\nScale: ${ex.scale}\nPrompt: ${ex.prompt}`,
  ).join('\n\n');

  return [
    'You write image prompts for Nano Banana, Google\'s image model, that produce top-down Dungeons & Dragons tactical battle maps.',
    '',
    'Expand the request below into one image prompt. The request is the foundation: keep its subject and its major features, ' +
      'and never replace or drop the subject. The map is seen from far above, so describe the location at the level of rooms, ' +
      'structures, terrain, and paths. Leave out small objects and fine surface detail even when the request mentions them.',
    '',
    'Write one narrative paragraph of plain sentences, not a keyword list. Cover these parts in order:',
    `1. View and scale. Open with "${CAMERA_OPENING}" followed by the subject, then state the scale given in the request, ` +
      'including how many grid squares the frame shows. Frame the whole location with open margin on every side; ' +
      'never zoom in on a single feature or let the image edge cut through walls or rooms.',
    '2. Subject. The location and its major features, each large enough to cover several grid squares, with their ' +
      'main materials (for example "a flagstone floor" or "a timber bar"). Do not list small props or surface details.',
    '3. Layout, elevation, and paths. Give the map more than one height level, such as raised platforms, pits, cliffs, or upper floors, ' +
      'and connect every level with stairs, ramps, ladders, bridges, or slopes so every area is reachable on foot. ' +
      'Leave open ground for movement and combat.',
    '4. Style and lighting. A painterly fantasy battle map with a simple color palette. Name the light source, its color, ' +
      'and the shadows it casts so changes in height read clearly from above.',
    '5. Grid overlay. This is the most important sentence in the prompt. Describe a clearly visible, uniform square grid of thin, ' +
      'crisp lines covering the entire playable area edge to edge and running unbroken across every elevation. ' +
      'Choose a line color that contrasts with the scene: dark lines on light ground, light lines on dark ground. ' +
      'Never describe the grid as faint, subtle, soft, or barely visible.',
    `6. Exclusions. End the prompt with this text, copied exactly: ${NANO_BANANA_NEGATION}`,
    '',
    'The map is empty of people and creatures, so avoid words that imply a crowd, such as "bustling", "crowded", or "occupied".',
    '',
    'Nano Banana prompting rules:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Examples:',
    '',
    examples,
    '',
    'Now write the prompt for this request:',
    ...requestLines,
    ...consistencyBlock,
    '',
    'Output only the prompt, no preamble, no quotes.',
  ].join('\n');
}

/**
 * Deterministic Nano Banana prompt used when the meta-prompt expansion fails.
 */
export function buildFallbackGenerationPrompt(params: GenerationPromptParams): string {
  const { userRequest, ambiance, terrain, setting, perspective, mapScale, collection } = params;

  // The map name is left out on purpose: quoted names tend to be rendered as text.
  const mapType = setting ?? terrain;
  const sentences = [
    mapType ? `${CAMERA_OPENING} a fantasy ${mapType} battle map.` : `${CAMERA_OPENING} a fantasy battle map.`,
  ];
  if (userRequest.trim() || mapType) {
    sentences.push(`${describeSubject(params).replace(/[.\s]+$/, '')}.`);
  }
  sentences.push(scaleSentence(mapScale));
  if (perspective === 'indoor') sentences.push(INDOOR_SENTENCE);
  if (ambiance) sentences.push(`The mood is ${ambiance}.`);
  sentences.push(
    'The map has several elevations connected by stairs, ramps, bridges, or slopes, so every area is reachable on foot, ' +
      'with open ground left for movement.',
    'Rendered in a painterly style with a simple color palette and overhead light that casts crisp shadows ' +
      'showing changes in height.',
  );
  if (collection?.ambiance) {
    sentences.push(`The light and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}.`);
  }
  if (collection?.visualDetails) sentences.push(`Include these visual details: ${collection.visualDetails}.`);
  sentences.push(GRID_CLAUSE, NANO_BANANA_NEGATION);

  return sentences.join(' ');
}
