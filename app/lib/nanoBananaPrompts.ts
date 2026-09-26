// Prompt builders for Nano Banana (GEMINI_IMAGE_MODEL in ./config).
// Nano Banana has no negativePrompt field, so every exclusion is written
// inline as a concrete scene property. Prompts are narrative prose, not
// keyword lists.

import { getAmbiancePromptLanguage } from './collections';
import type { Collection } from './collections';
import { generateSettingDescription, generateTerrainDescription } from './mapPrompts';

// Camera angles a map can be drawn from. Indoor maps default to isometric,
// outdoor maps to top-down; an explicit view always wins.
export const MAP_VIEWS = ['isometric', 'top-down'] as const;
export type MapView = (typeof MAP_VIEWS)[number];

export function resolveMapView(view?: MapView, perspective?: 'indoor' | 'outdoor'): MapView {
  if (view) return view;
  return perspective === 'indoor' ? 'isometric' : 'top-down';
}

const NEGATION_OCCUPANCY_AND_TEXT =
  'The map is completely unoccupied: no people, figures, creatures, characters, miniatures, or tokens anywhere. ' +
  'The image carries no text, labels, legends, names, frames, borders, or watermarks.';
const NEGATION_FOCUS = 'Tack-sharp focus across the whole map.';

/** View-agnostic exclusions: no occupants, no text, sharp focus. */
export const NANO_BANANA_NEGATION_BASE = `${NEGATION_OCCUPANCY_AND_TEXT} ${NEGATION_FOCUS}`;

const CAMERA_CONSTRAINTS: Record<MapView, string> = {
  isometric:
    'Seen at a consistent 30-degree isometric angle from one corner; never straight down, never from ground level, ' +
    'and with no perspective distortion, so parallel lines stay parallel.',
  'top-down': 'Seen strictly from directly overhead; never from the side, front, or below.',
};

/** Full exclusion text for a view: occupants, text, camera constraint, focus. */
export function nanoBananaNegation(view: MapView): string {
  return `${NEGATION_OCCUPANCY_AND_TEXT} ${CAMERA_CONSTRAINTS[view]} ${NEGATION_FOCUS}`;
}

const EDIT_VIEW_CONSTRAINT =
  'Keep the exact camera angle, grid shape, and grid geometry of the source image: an isometric source stays ' +
  'isometric with its diamond grid, and a top-down source stays top-down with its square grid.';

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
    `\nConstraints to maintain:\n- ${NANO_BANANA_NEGATION_BASE}`,
    `- ${EDIT_VIEW_CONSTRAINT}`,
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
  mapView?: MapView;
  collection?: Collection;
}

// Map size tiers, smallest to largest. Every square is roughly 5 feet;
// the tier sets how many squares the frame shows and how much detail to draw.
export const MAP_SCALES = ['small', 'standard', 'large', 'huge'] as const;
export type MapScale = (typeof MAP_SCALES)[number];
export const DEFAULT_MAP_SCALE: MapScale = 'standard';

const CAMERA_OPENINGS: Record<MapView, string> = {
  isometric:
    'A zoomed-out isometric view, with the camera tilted 30 degrees and looking down from one corner so that walls ' +
    'and objects show their tops and two sides, of',
  'top-down': 'A zoomed-out, top-down orthographic view from high above, straight down, of',
};

// Without an explicit frame size the model crops tight around one feature,
// so every scale states how many grid cells the image shows.
const FRAMING_SENTENCE =
  'The whole location fits inside the frame with open margin on every side; no wall, room, or feature is cut off ' +
  'by the image edge, and the view is never a close crop of a single object. The furniture and fixtures that ' +
  'define the place stay, drawn as clear, readable shapes, and the floor is free of incidental clutter such as ' +
  'papers, bottles, loose tools, and debris.';

const GRID_CLAUSES: Record<MapView, string> = {
  isometric:
    'A clearly visible, uniform diamond-shaped isometric grid of thin, crisp lines, in a color that contrasts with the ' +
    'ground beneath it, covers the entire playable area edge to edge; each tile is a diamond (rhombus) about twice as ' +
    'wide as it is tall, laid flat on the floor and following the 30-degree angle, and the grid runs unbroken across ' +
    'the whole floor, including any slopes, stairs, or bridges.',
  'top-down':
    'A clearly visible, uniform square tactical grid of thin, crisp lines, in a color that contrasts with the ground beneath it, ' +
    'covers the entire playable area edge to edge and runs unbroken across the whole floor, including any slopes, stairs, or bridges.',
};

// The grid description the meta-prompt's grid rule asks the text model to write.
const GRID_RULE_DESCRIPTIONS: Record<MapView, string> = {
  isometric:
    'a clearly visible, uniform diamond-shaped isometric grid of thin, crisp lines, where each tile is a diamond ' +
    '(rhombus) about twice as wide as it is tall, laid flat on the floor and following the 30-degree angle, ' +
    'covering the entire playable area edge to edge and running unbroken across the whole floor and any change in height',
  'top-down':
    'a clearly visible, uniform square grid of thin, crisp lines covering the entire playable area edge to edge ' +
    'and running unbroken across the whole floor and any change in height',
};

// What one grid cell is called in each view: the full count noun and the short noun.
const GRID_UNITS: Record<MapView, { count: string; short: string }> = {
  isometric: { count: 'tiles', short: 'tiles' },
  'top-down': { count: 'grid squares', short: 'squares' },
};

function buildScaleSentences(view: MapView): Record<MapScale, string> {
  const { count, short } = GRID_UNITS[view];
  return {
    small:
      `This is a map of a small chamber, crevice, or tight passage: the frame shows 20 by 15 ${count}, each ` +
      'covering roughly 5 feet. Show the shape of the space and only its few key features and fixtures.',
    standard:
      `This is a map of a single room or encounter area: the frame shows 24 by 18 ${count}, each covering roughly ` +
      `5 feet. Show the room's layout and its main furniture or features, each covering at least a couple of ${short}.`,
    large:
      'This is a map of a large space such as a foyer, great hall, factory floor, or courtyard: the frame shows ' +
      `28 by 21 ${count}, each covering roughly 5 feet. Keep detail low: show the major structures, zones, and ` +
      'walkways rather than individual objects.',
    huge:
      'This is a map of a very large area such as a fortress, a district, or a stretch of wilderness: the frame shows ' +
      `40 by 30 ${count}, each covering roughly 5 feet. Show only the major landmarks, the overall layout, and the ` +
      'routes between them, with no small-scale detail.',
  };
}

const SCALE_SENTENCES: Record<MapView, Record<MapScale, string>> = {
  isometric: buildScaleSentences('isometric'),
  'top-down': buildScaleSentences('top-down'),
};

const INDOOR_SENTENCES: Record<MapView, string> = {
  isometric:
    'This is an interior map drawn as a cutaway room: the two far walls stand at full height, and the two near walls ' +
    'are cut away or drawn as low stubs, so the whole floor is visible.',
  'top-down':
    'This is an interior map: show the floor plan with its walls and doorways as if the roof were removed.',
};

function scaleSentence(view: MapView, mapScale: MapScale = DEFAULT_MAP_SCALE): string {
  return `${SCALE_SENTENCES[view][mapScale]} ${FRAMING_SENTENCE}`;
}

function describeSubject(params: GenerationPromptParams): string {
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

interface GenerationExample {
  request: string;
  scale: MapScale;
  prompt: string;
}

const TOP_DOWN_OPENING = CAMERA_OPENINGS['top-down'];
const TOP_DOWN_NEGATION = nanoBananaNegation('top-down');
const ISOMETRIC_OPENING = CAMERA_OPENINGS.isometric;
const ISOMETRIC_NEGATION = nanoBananaNegation('isometric');

const TOP_DOWN_EXAMPLES: GenerationExample[] = [
  {
    request: 'A map of a tavern',
    scale: 'standard',
    prompt:
      `${TOP_DOWN_OPENING} the entire ground floor of a fantasy tavern, framed to show 24 by 18 grid squares of roughly ` +
      '5 feet each, with every outer wall visible and open margin around the building. The common room is a single ' +
      'level with a flagstone floor. A long timber bar runs along the west wall, rows of long tables and benches fill ' +
      'the center with open aisles between them, and a wide stone fireplace stands against the north wall. Rendered as ' +
      'a painterly fantasy battle map in warm wood and stone tones, lit by firelight from the hearth that casts soft ' +
      'shadows beside the tables and the bar. A clearly visible, uniform square grid of thin, crisp black lines covers ' +
      `the entire playable area edge to edge, running unbroken across the floor, the tables, and the bar. ${TOP_DOWN_NEGATION}`,
  },
  {
    request: 'a wizard\'s library',
    scale: 'standard',
    prompt:
      `${TOP_DOWN_OPENING} a wizard's library, framed to show 24 by 18 grid squares of roughly 5 feet each, with all four ` +
      'walls and the door visible and open margin around the room. The room is a single level with a dark oak plank ' +
      'floor. Tall bookshelves line the north, east, and west walls, a large reading table stands in the center, a ' +
      'carved lectern faces it from the south wall, and a brass orrery sits in the northeast corner, leaving open floor ' +
      'between the table and the shelves. Rendered as a painterly fantasy battle map in deep wood and brass tones, lit by ' +
      'floating candles that cast soft shadows beside each shelf and the table. A clearly visible, uniform square grid of ' +
      'thin, crisp black lines covers the entire playable area edge to edge, running unbroken across the floor and ' +
      `the table. ${TOP_DOWN_NEGATION}`,
  },
  {
    request: 'a forest clearing map',
    scale: 'large',
    prompt:
      `${TOP_DOWN_OPENING} a forest clearing and the woods around it, framed to show 28 by 21 grid squares of roughly ` +
      '5 feet each, so the whole clearing and its edges sit inside the frame. A ring of standing stones sits at the ' +
      'center of a grassy clearing bordered by a dense tree canopy. A ravine with a stream cuts across the eastern side, ' +
      'a fallen log spans it as a bridge, and a dirt trail winds down the southern slope to the stream. Rendered as a ' +
      'painterly fantasy battle map in deep greens and earth tones under late-afternoon sunlight, with shadows along the ' +
      'ravine walls that show its depth. A clearly visible, uniform square grid of thin, crisp pale cream lines covers ' +
      'the entire playable area edge to edge, continuing across the canopy, the ravine floor, and the log bridge. ' +
      TOP_DOWN_NEGATION,
  },
  {
    request: 'a dungeon maze',
    scale: 'huge',
    prompt:
      `${TOP_DOWN_OPENING} a sprawling dungeon maze, framed to show 40 by 30 grid squares of roughly 5 feet each, so the ` +
      'full network of passages sits inside the frame. Corridors of rough stone twist between chambers, several of them ' +
      'ending in dead ends. A wide chasm splits the center of the maze and is crossed by a single bridge, and stairs lead ' +
      'down from the northern passages to a lower level of chambers drawn in the northeast corner. Rendered as a ' +
      'painterly fantasy battle map in cold grey-blue stone tones lit by scattered wall sconces, with pitch-black ' +
      'shadow inside the chasm. A clearly visible, ' +
      'uniform square grid of thin, crisp white lines covers the entire playable area edge to edge, running across the ' +
      `corridors, the stairs, and the bridge. ${TOP_DOWN_NEGATION}`,
  },
];

// Both isometric examples are indoor rooms: the far walls carry the fixtures,
// and the near walls are cut away so the floor stays visible.
const ISOMETRIC_EXAMPLES: GenerationExample[] = [
  {
    request: 'A map of a tavern',
    scale: 'standard',
    prompt:
      `${ISOMETRIC_OPENING} the ground floor of a fantasy tavern, framed to show 24 by 18 tiles of roughly 5 feet each, ` +
      'with the whole room and open margin around it. The room is a cutaway: the far north and west walls stand at full ' +
      'height, and the near south and east walls are cut away to low stubs, so the whole floor is visible. The common ' +
      'room is a single level with a flagstone floor. A long timber bar with shelves of casks behind it runs along the ' +
      'west wall, a wide stone fireplace stands against the north wall, and rows of long tables and benches fill the ' +
      'center with open aisles between them. Rendered as a painterly fantasy battle map in warm wood and stone tones, ' +
      'lit by firelight from the hearth that casts soft shadows beside the tables and the bar. A clearly visible, ' +
      'uniform diamond-shaped isometric grid of thin, crisp black lines, each tile a diamond about twice as wide as it ' +
      'is tall, lies flat on the floor at the 30-degree angle and covers the entire floor edge to edge, running unbroken ' +
      `beneath the tables and the bar. ${ISOMETRIC_NEGATION}`,
  },
  {
    request: 'a wizard\'s library',
    scale: 'standard',
    prompt:
      `${ISOMETRIC_OPENING} a wizard's library, framed to show 24 by 18 tiles of roughly 5 feet each, with the whole ` +
      'room and open margin around it. The room is a cutaway: the far north and west walls stand at full height, and ' +
      'the near south and east walls are drawn as low stubs, so the whole floor is visible. The room is a single level ' +
      'with a dark oak plank floor. Tall bookshelves line the north and west walls, a brass orrery stands in the corner ' +
      'where they meet, a large reading table stands in the center, and a carved lectern faces it, leaving open floor ' +
      'between the table and the shelves. Rendered as a painterly fantasy battle map in deep wood and brass tones, lit ' +
      'by floating candles that cast soft shadows beside each shelf and the table. A clearly visible, uniform ' +
      'diamond-shaped isometric grid of thin, crisp pale cream lines, each tile a diamond about twice as wide as it is ' +
      'tall, lies flat on the floor at the 30-degree angle and covers the entire floor edge to edge, running unbroken ' +
      `beneath the table and the lectern. ${ISOMETRIC_NEGATION}`,
  },
];

function joinExamples(examples: GenerationExample[]): string {
  return examples
    .map((ex) => `Request: ${ex.request}\nScale: ${ex.scale}\nPrompt: ${ex.prompt}`)
    .join('\n\n');
}

// Joined once at module load: the examples never change at runtime.
const GENERATION_EXAMPLES_TEXT: Record<MapView, string> = {
  isometric: joinExamples(ISOMETRIC_EXAMPLES),
  'top-down': joinExamples(TOP_DOWN_EXAMPLES),
};

// Short names the meta-prompt uses when it refers to the view and grid.
const VIEW_NAMES: Record<MapView, { view: string; grid: string }> = {
  isometric: { view: 'isometric', grid: 'diamond-shaped isometric' },
  'top-down': { view: 'top-down', grid: 'square' },
};

/**
 * Meta-prompt for the text model that expands a map request into a single
 * Nano Banana image prompt.
 */
export function buildGenerationMetaPrompt(params: GenerationPromptParams): string {
  const { ambiance, terrain, setting, perspective, mapScale = DEFAULT_MAP_SCALE, collection } = params;
  const view = resolveMapView(params.mapView, perspective);
  const units = GRID_UNITS[view].count;
  const names = VIEW_NAMES[view];

  const requestLines = [`Request: ${describeSubject(params)}`];
  if (setting) requestLines.push(`Setting: ${setting}`);
  if (terrain) requestLines.push(`Terrain: ${terrain}`);
  if (perspective === 'indoor') requestLines.push(`Perspective: indoor. ${INDOOR_SENTENCES[view]}`);
  else if (perspective === 'outdoor') requestLines.push('Perspective: outdoor.');
  if (ambiance) requestLines.push(`Mood: ${ambiance}`);
  requestLines.push(`Scale: ${mapScale}. ${scaleSentence(view, mapScale)}`);

  const consistency = collectionLines(collection);
  const consistencyBlock = collection && consistency.length
    ? [
      '',
      `Visual consistency: this map belongs to the "${collection.name}" collection. ` +
        'Describe these properties so the map matches the other maps in the collection:',
      ...consistency.map((line) => `- ${line}`),
    ]
    : [];

  return [
    `You write image prompts for Nano Banana, Google's image model, that produce ${names.view} Dungeons & Dragons tactical battle maps.`,
    '',
    'Expand the request below into one image prompt. The request is the foundation: keep its subject and every feature it names, ' +
      'and never replace or drop the subject. The map is seen from far above, so describe the location at the level of rooms, ' +
      'structures, terrain, paths, and large fixtures. Add the furniture and fixtures that define this kind of place, such as an ' +
      'armory\'s weapon racks and armor stands, a library\'s bookshelves, or a tavern\'s bar and tables. Leave out only ' +
      'incidental clutter and fine surface texture.',
    '',
    'Write one narrative paragraph of plain sentences, not a keyword list. Cover these parts in order:',
    `1. View and scale. Open with "${CAMERA_OPENINGS[view]}" followed by the subject, then state the scale given in the request, ` +
      `including how many ${units} the frame shows. Frame the whole location with open margin on every side; ` +
      'never zoom in on a single feature or let the image edge cut through walls or rooms.',
    '2. Subject. The location, its major features, and the furniture and fixtures that define it, each drawn as a clear shape ' +
      `covering whole ${units}, with their main materials (for example "a flagstone floor" or "a timber bar"). ` +
      'Name every feature the request mentions in the request\'s own words: if it says "lockers", write "lockers", never a ' +
      'similar object such as chests. Say where each one stands, for example "weapon racks line the north and east walls, a row of iron lockers stands ' +
      'along the south wall, and armor stands flank the door".',
    '3. Layout and paths. Match the layout to the location. A single room stays on one floor level unless the request says ' +
      'otherwise. Use height changes only where the place has them, such as sloping terrain, multi-level buildings, pits, or ' +
      'balconies. Every stair, ramp, or ladder connects two areas drawn on the map; none leads off the map or into a wall. ' +
      'Leave open floor for movement and combat.',
    '4. Style and lighting. A painterly fantasy battle map with a simple color palette. Name the light source, its color, ' +
      'and the shadows it casts so walls, fixtures, and any changes in height read clearly from above.',
    `5. Grid overlay. This is the most important sentence in the prompt. Describe ${GRID_RULE_DESCRIPTIONS[view]}. ` +
      'Choose a line color that contrasts with the scene: dark lines on light ground, light lines on dark ground. ' +
      'Never describe the grid as faint, subtle, soft, or barely visible.',
    `6. Exclusions. End the prompt with this text, copied exactly: ${nanoBananaNegation(view)}`,
    '',
    'The map is empty of people and creatures, so avoid words that imply a crowd, such as "bustling", "crowded", or "occupied".',
    '',
    'Nano Banana prompting rules:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Examples:',
    '',
    GENERATION_EXAMPLES_TEXT[view],
    '',
    'Now write the prompt for this request:',
    ...requestLines,
    ...consistencyBlock,
    '',
    `Output only the prompt, no preamble, no quotes. Keep the ${names.view} camera opening, the ${names.grid} grid, ` +
      'and the closing exclusion text with its camera constraint.',
  ].join('\n');
}

/**
 * Deterministic Nano Banana prompt used when the meta-prompt expansion fails.
 */
export function buildFallbackGenerationPrompt(params: GenerationPromptParams): string {
  const { userRequest, ambiance, terrain, setting, perspective, mapScale, collection } = params;
  const view = resolveMapView(params.mapView, perspective);
  const opening = CAMERA_OPENINGS[view];

  // The map name is left out on purpose: quoted names tend to be rendered as text.
  const mapType = setting ?? terrain;
  const sentences = [
    mapType ? `${opening} a fantasy ${mapType} battle map.` : `${opening} a fantasy battle map.`,
  ];
  if (userRequest.trim() || mapType) {
    sentences.push(`${describeSubject(params).replace(/[.\s]+$/, '')}.`);
  }
  sentences.push(scaleSentence(view, mapScale));
  if (perspective === 'indoor') sentences.push(INDOOR_SENTENCES[view]);
  if (ambiance) sentences.push(`The mood is ${ambiance}.`);
  sentences.push(
    'Open floor is left for movement, and wherever the location has more than one level, every stair, ramp, or ' +
      'ladder connects two areas drawn on the map, never leading off the map or into a wall.',
    'Rendered in a painterly style with a simple color palette and overhead light that casts crisp shadows ' +
      'showing walls, fixtures, and any changes in height.',
  );
  if (collection?.ambiance) {
    sentences.push(`The light and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}.`);
  }
  if (collection?.visualDetails) sentences.push(`Include these visual details: ${collection.visualDetails}.`);
  sentences.push(GRID_CLAUSES[view], nanoBananaNegation(view));

  return sentences.join(' ');
}
