// Prompt builders for Nano Banana (GEMINI_IMAGE_MODEL in ./config).
// Nano Banana has no negativePrompt field, so every exclusion is written
// inline as a concrete scene property. Prompts are narrative prose, not
// keyword lists.

import { getAmbiancePromptLanguage } from './collections';
import type { Collection } from './collections';
import { generateSettingDescription, generateTerrainDescription } from './mapPrompts';

// Camera angles a map can be drawn from. Every map defaults to isometric except
// region maps (kingdoms, countries), which are top-down; an explicit view wins.
export const MAP_VIEWS = ['isometric', 'top-down'] as const;
export type MapView = (typeof MAP_VIEWS)[number];

export function resolveMapView(view?: MapView, mapScale?: MapScale): MapView {
  // A region overview has no isometric form, so it is always top-down.
  if (mapScale === 'region') return 'top-down';
  return view ?? 'isometric';
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
    'Preserve everything else, including composition, lighting, palette, brush style, rendering style, terrain, and structures as in the source image.',
    'Maintaining the gridlines layer that covers terrain is most important. Reproduce every grid line at the exact same spacing, color, line weight, and opacity as the source. Any region you repaint must show the same grid lines as the surrounding pixels — gridlines must be continuous and seamless across the entire image, including replaced terrain.',
    `\nEdit instruction: ${instruction.trim()}`,
    renderSourceContext(sourceContext),
    `\nConstraints to maintain:\n- ${NANO_BANANA_NEGATION_BASE}`,
    `- ${EDIT_VIEW_CONSTRAINT}`,
    '- Sharp focus, in the same rendering style as the source image.',
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

// Map size tiers, smallest to largest. On the tactical tiers every square is
// roughly 5 feet and the tier sets how many squares the frame shows. `region`
// is an overview of a kingdom or country: no tactical grid at all.
export const MAP_SCALES = ['small', 'standard', 'large', 'huge', 'region'] as const;
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
  'by the image edge, and the view is never a close crop of a single object.';

// How much detail each view's style allows. Both keep the defining fixtures
// and ban clutter; the game style adds material and decorative detail.
const DETAIL_SENTENCES: Record<MapView, string> = {
  isometric:
    'The furniture and fixtures that define the place stay, drawn as clear, readable shapes with rich material ' +
    'texture and decorative detail on the fixtures, walls, and floor. The floor stays open for movement and free of ' +
    'clutter piles such as heaps of papers, bottles, loose tools, and debris, and its texture stays subtle enough ' +
    'that the grid reads clearly over it.',
  'top-down':
    'The furniture and fixtures that define the place stay, drawn as clear, readable shapes, and the floor is free of ' +
    'incidental clutter such as papers, bottles, loose tools, and debris.',
};

// Rendering style per view: classic tabletop maps for top-down, a modern
// isometric computer-game look for isometric. Real rendering qualities only;
// Nano Banana ignores quality tokens.
const STYLES: Record<MapView, string> = {
  isometric:
    'A high-detail rendered scene in the style of a modern isometric computer game, with distinct materials such as ' +
    'worn stone, grained wood, and forged iron. Light comes from sources inside the scene, such as torches, braziers, ' +
    'or windows, and casts directional shadows, with soft contact shadows where objects meet the floor. The color is ' +
    'rich but controlled, with clear depth between the floor, the walls, and the objects.',
  'top-down':
    'A classic tabletop battle map in a clean, hand-drawn style, with flat color fills from a limited palette and ' +
    'crisp dark outlines around walls and objects. The lighting is soft and even, with only light shadows that mark ' +
    'changes in height, and surface texture is minimal, so the map reads clearly on a table screen or a print.',
};

// Grid lines in the floor's own seam color disappear into planks and flagstones.
// A square grid always runs parallel to planks in one direction, so contrast has
// to come from hue and line weight, not from direction.
const GRID_CONTRAST =
  'Plank and board seams are dark, so over wood floors the grid lines are pale, such as cream or white, heavier than ' +
  'the seams, and a different hue from them; each plank is narrower than a grid cell, so most seams fall inside the ' +
  'cells rather than on grid lines. Over pale stone the grid lines are dark and heavier than the mortar lines. The ' +
  'grid always reads as an overlay on top of the floor pattern.';

const GRID_CLAUSES: Record<MapView, string> = {
  isometric:
    'A clearly visible, uniform diamond-shaped isometric grid of crisp lines, heavier than the floor\'s own seams, in a color that contrasts with the ' +
    'ground beneath it, covers the entire playable area edge to edge; each tile is a diamond (rhombus) about twice as ' +
    'wide as it is tall, laid flat on the floor or ground and following the 30-degree angle, and the grid runs ' +
    `unbroken across the whole playable area, including any slopes, stairs, or bridges. ${GRID_CONTRAST}`,
  'top-down':
    'A clearly visible, uniform square tactical grid of crisp lines, heavier than the floor\'s own seams, in a color that contrasts with the ground beneath it, ' +
    'covers the entire playable area edge to edge and runs unbroken across the whole playable area, including any slopes, ' +
    `stairs, or bridges. ${GRID_CONTRAST}`,
};

const REGION_NO_GRID = 'There are no grid lines of any kind anywhere on the map.';

// The grid description the meta-prompt's grid rule asks the text model to write.
const GRID_RULE_DESCRIPTIONS: Record<MapView, string> = {
  isometric:
    'a clearly visible, uniform diamond-shaped isometric grid of crisp lines heavier than the floor\'s own seams, where each tile is a diamond ' +
    '(rhombus) about twice as wide as it is tall, laid flat on the floor or ground and following the 30-degree angle, ' +
    'covering the entire playable area edge to edge and running unbroken across the whole playable area and any change in height',
  'top-down':
    'a clearly visible, uniform square grid of crisp lines heavier than the floor\'s own seams, covering the entire playable area edge to edge ' +
    'and running unbroken across the whole playable area and any change in height',
};

// What one grid cell is called in each view: the full count noun and the short noun.
const GRID_UNITS: Record<MapView, { count: string; short: string }> = {
  isometric: { count: 'tiles', short: 'tiles' },
  'top-down': { count: 'grid squares', short: 'squares' },
};

// For large and huge maps both views simplify the layout. In the game style that
// means fewer distinct objects, not flatter rendering.
const LARGE_SCALE_DETAIL: Record<MapView, string> = {
  isometric:
    'Keep the layout simple: the major structures, the routes, and the separate pieces of cover that matter to the ' +
    'encounter, rather than small decorative objects, each still rendered with full material detail.',
  'top-down':
    'Keep detail low: the major structures, the routes, and the separate pieces of cover that matter to the ' +
    'encounter, rather than small decorative objects.',
};

const HUGE_SCALE_DETAIL: Record<MapView, string> = {
  isometric:
    'Show only the major landmarks, the overall layout, and the routes between them, with few distinct objects, ' +
    'each still rendered with full material detail.',
  'top-down':
    'Show only the major landmarks, the overall layout, and the routes between them, with no small-scale detail.',
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
      'This is a map of a large space such as a foyer, great hall, factory floor, or courtyard, or an outdoor ' +
      'encounter area such as a stretch of road, woods, or a camp: the frame shows ' +
      `28 by 21 ${count}, each covering roughly 5 feet. ${LARGE_SCALE_DETAIL[view]}`,
    huge:
      'This is a map of a very large area such as a fortress, a district, or a stretch of wilderness: the frame shows ' +
      `40 by 30 ${count}, each covering roughly 5 feet. ${HUGE_SCALE_DETAIL[view]}`,
    region: REGION_SCALE_SENTENCE,
  };
}

// Region maps are overviews for travel and worldbuilding, not combat maps: no
// grid, no 5-foot scale, and settlements shrink to small symbols.
const REGION_STYLE =
  'A classic hand-drawn map with flat color fills from a limited palette and crisp dark outlines around the ' +
  'coastlines, rivers, forests, and mountain ranges. The lighting is soft and even, with light shading on the ' +
  'mountain slopes, so the land reads clearly at a glance.';

const REGION_SCALE_SENTENCE =
  'This is an overview map of a vast area such as a kingdom, a country, or a dominion. It shows the land\'s terrain ' +
  'regions, mountain ranges, rivers, forests, coastlines, roads, and settlements drawn as small symbols, with the ' +
  'whole land inside the frame and open margin on every side. It is not a combat map and has no tactical grid.';

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
  // The framing and detail sentences talk about walls, rooms, and floors, which a region map has none of.
  if (mapScale === 'region') return REGION_SCALE_SENTENCE;
  return `${SCALE_SENTENCES[view][mapScale]} ${FRAMING_SENTENCE} ${DETAIL_SENTENCES[view]}`;
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
      'the center with open aisles between them, and a wide stone fireplace stands against the north wall. Drawn as a ' +
      'classic tabletop battle map in a clean, hand-drawn style, with flat fills of warm wood and stone colors, crisp ' +
      'dark outlines around the walls, the bar, and every table, and soft, even light with only light shadows beside ' +
      'the furniture. A clearly visible, uniform square grid of thin, crisp black lines covers ' +
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
      'between the table and the shelves. Drawn as a classic tabletop battle map in a clean, hand-drawn style, with flat ' +
      'fills of deep wood and brass colors, crisp dark outlines around the shelves, the table, and the lectern, and soft, ' +
      'even light with only light shadows beside each shelf. A clearly visible, uniform square grid of ' +
      'crisp pale cream lines, heavier than the dark plank seams, covers the entire playable area edge to edge, ' +
      `running unbroken across the floor and the table. ${TOP_DOWN_NEGATION}`,
  },
  {
    request: 'a forest clearing map',
    scale: 'large',
    prompt:
      `${TOP_DOWN_OPENING} a forest clearing and the woods around it, framed to show 28 by 21 grid squares of roughly ` +
      '5 feet each, so the whole clearing and its edges sit inside the frame. A ring of standing stones sits at the ' +
      'center of a grassy clearing bordered by a dense tree canopy. A ravine with a stream cuts across the eastern side, ' +
      'a fallen log spans it as a bridge, and a dirt trail winds down the southern slope to the stream. Drawn as a ' +
      'classic tabletop battle map in a clean, hand-drawn style, with flat fills of greens and earth colors, crisp dark ' +
      'outlines around the stones, the tree canopy, and the ravine edges, and soft, even light with a light shadow ' +
      'along the ravine walls that marks its depth. A clearly visible, uniform square grid of thin, crisp pale cream lines covers ' +
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
      'down from the northern passages to a lower level of chambers drawn in the northeast corner. Drawn as a classic ' +
      'tabletop battle map in a clean, hand-drawn style, with flat fills of cold grey-blue stone colors, crisp dark ' +
      'outlines around every wall and the chasm edge, and soft, even light, with a flat black fill marking the depth ' +
      'of the chasm. A clearly visible, ' +
      'uniform square grid of thin, crisp white lines covers the entire playable area edge to edge, running across the ' +
      `corridors, the stairs, and the bridge. ${TOP_DOWN_NEGATION}`,
  },
];

// Two indoor rooms (far walls carry the fixtures, near walls cut away) and one
// outdoor encounter, which shows story-driven placement and open ground.
const ISOMETRIC_EXAMPLES: GenerationExample[] = [
  {
    request: 'The party is ambushed by bandits on a forest road',
    scale: 'large',
    prompt:
      `${ISOMETRIC_OPENING} a stretch of forest road where bandits wait in ambush, framed to show 28 by 21 tiles of ` +
      'roughly 5 feet each, with the whole scene and open margin around it. A packed-dirt road three tiles wide runs ' +
      'diagonally through the middle of the map from one edge to the other, and a fallen oak lies across it near the ' +
      'center, blocking wagons. On both sides of the road, separate oak and pine trees, clusters of boulders, and ' +
      'thick bushes stand a few tiles apart with open forest floor between them, giving hiding spots within a short ' +
      'dash of the fallen oak. On a low rise off the north side of the road, a small bandit camp holds a cold fire ' +
      'pit, two lean-to shelters, and a stack of stolen crates, linked to the road by a narrow footpath. More than half ' +
      'the map is open, walkable ground. Rendered as a high-detail scene in the style of a modern isometric computer ' +
      'game: rough bark, mossy granite, packed earth with wheel ruts, and weathered canvas on the lean-tos. Late ' +
      'afternoon sunlight slants through gaps in the canopy and casts long directional shadows from each trunk, with ' +
      'soft contact shadows under the boulders and the fallen oak. The color is rich but controlled, and the road, ' +
      'the undergrowth, and the trees separate clearly in depth. A clearly visible, uniform diamond-shaped isometric ' +
      'grid of thin, crisp pale cream lines, each tile a diamond about twice as wide as it is tall, lies flat on the ' +
      'ground at the 30-degree angle and covers the entire playable area edge to edge, running unbroken across the ' +
      `road, the forest floor, and the camp. ${ISOMETRIC_NEGATION}`,
  },
  {
    request: 'A map of a tavern',
    scale: 'standard',
    prompt:
      `${ISOMETRIC_OPENING} the ground floor of a fantasy tavern, framed to show 24 by 18 tiles of roughly 5 feet each, ` +
      'with the whole room and open margin around it. The room is a cutaway: the far north and west walls stand at full ' +
      'height, and the near south and east walls are cut away to low stubs, so the whole floor is visible. The common ' +
      'room is a single level with a flagstone floor. A long timber bar with shelves of casks behind it runs along the ' +
      'west wall, a wide stone fireplace stands against the north wall, and rows of long tables and benches fill the ' +
      'center with open aisles between them. Rendered as a high-detail scene in the style of a modern isometric ' +
      'computer game: worn flagstones with chipped edges, grained oak tables and benches, and forged iron bands on the ' +
      'casks. The fire in the hearth and iron lanterns on the far walls cast warm directional shadows across the floor, ' +
      'with soft contact shadows under every table and bench. The color is rich but controlled, and the floor, walls, ' +
      'and furniture separate clearly in depth. A clearly visible, ' +
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
      'between the table and the shelves. Rendered as a high-detail scene in the style of a modern isometric computer ' +
      'game: grained dark oak shelves with carved crowns, rows of leather book spines, polished brass rings on the ' +
      'orrery, and worn planks underfoot. Floating candles and a tall arched window in the west wall cast directional ' +
      'shadows away from the shelves, with soft contact shadows under the table and the lectern. The color is rich but ' +
      'controlled, and the floor, walls, and furniture separate clearly in depth. A clearly visible, uniform ' +
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

// Region maps get their own example so the model never copies a tactical grid.
const REGION_NEGATION = `${nanoBananaNegation('top-down')} ${REGION_NO_GRID}`;
const REGION_EXAMPLES: GenerationExample[] = [
  {
    request: 'a map of the kingdom of Valdmoor',
    scale: 'region',
    prompt:
      `${TOP_DOWN_OPENING} the kingdom of Valdmoor, an overview map with the whole kingdom inside the frame and open ` +
      'margin on every side. A mountain range runs along the northern border, a wide river flows south from the ' +
      'mountains to a bay on the eastern coast, a dark forest covers the western hills, and farmland fills the river ' +
      'valley. Roads link a walled capital at the river mouth to three smaller towns, and every settlement is a small ' +
      'symbol rather than a detailed street plan. Drawn as a classic hand-drawn map with flat fills of greens, browns, ' +
      'and blues, crisp dark outlines around the coast, the rivers, and the forest edges, and soft, even light with ' +
      `light shading on the mountain slopes. ${REGION_NEGATION}`,
  },
];

// Joined once at module load: the examples never change at runtime.
const GENERATION_EXAMPLES_TEXT: Record<MapView, string> = {
  isometric: joinExamples(ISOMETRIC_EXAMPLES),
  'top-down': joinExamples(TOP_DOWN_EXAMPLES),
};
const REGION_EXAMPLES_TEXT = joinExamples(REGION_EXAMPLES);

// The meta-prompt's detail guidance per view. Top-down describes the map as seen
// from far above; isometric only as zoomed out, so it doesn't pull toward top-down.
const DETAIL_GUIDANCE: Record<MapView, string> = {
  isometric:
    'The map is a zoomed-out view of the whole location, so describe it at the level of rooms, structures, terrain, ' +
    'paths, and large fixtures. Add the furniture and fixtures that define this kind of place, such as an armory\'s ' +
    'weapon racks and armor stands, a library\'s bookshelves, or a tavern\'s bar and tables. Give the fixtures, walls, ' +
    'and floor rich material texture and decorative detail, but leave out clutter piles, and keep the floor open and ' +
    'the layout readable.',
  'top-down':
    'The map is seen from far above, so describe the location at the level of rooms, structures, terrain, paths, and ' +
    'large fixtures. Add the furniture and fixtures that define this kind of place, such as an armory\'s weapon racks ' +
    'and armor stands, a library\'s bookshelves, or a tavern\'s bar and tables. Leave out only incidental clutter and ' +
    'fine surface texture.',
};

// What rule 4 asks the text model to say about light, per view.
const LIGHTING_GUIDANCE: Record<MapView, string> = {
  isometric:
    'Name each light source inside the scene, its color, and the directional and contact shadows it casts, so walls, ' +
    'fixtures, and any changes in height read clearly.',
  'top-down':
    'Name the light and its color, and keep shadows light: just enough to mark walls, fixtures, and any changes in height.',
};

// Short names the meta-prompt uses when it refers to the view and grid.
const VIEW_NAMES: Record<MapView, { view: string; grid: string }> = {
  isometric: { view: 'isometric', grid: 'diamond-shaped isometric' },
  'top-down': { view: 'top-down', grid: 'square' },
};

// A map is only useful at the table if its parts sit where the story needs
// them, so the text model plans the encounter before describing it.
const ENCOUNTER_DESIGN_STEP = [
  'Before writing, plan the encounter silently. Do not write this plan out; use it to decide what the prompt describes.',
  '- Read the story: who is here, why, what the party is doing, and what happens next. An ambush on a forest road needs ' +
    'the road the party travels, hiding spots on both flanks within a short dash of it, something that blocks the road, ' +
    'and a place the attackers camp or fall back to.',
  '- Place everything where it would really be: a kitchen beside the dining hall, a camp near water, a guard post ' +
    'watching the entrance, a road that runs through the scene instead of ending in the middle of it.',
  '- Size things for a 5-foot grid: a tree trunk covers 1 square, a wagon 2 by 4, a road 2 to 3 squares wide, a ' +
    'doorway 1 square.',
  '- Keep the play space open: at least half of the walkable area is open ground, and cover stands as separate ' +
    'pieces with room to move between them. Add only the rooms and areas the story needs.',
  '- If the scale is too small for everything the story implies, describe the most important slice of the scene ' +
    'rather than cramming it all in.',
].join('\n');

/** Meta-prompt for region maps: a gridless overview of a kingdom or country. */
function buildRegionMetaPrompt(params: GenerationPromptParams, view: MapView): string {
  const { ambiance, terrain, setting, collection } = params;
  const requestLines = [`Request: ${describeSubject(params)}`];
  if (setting) requestLines.push(`Setting: ${setting}`);
  if (terrain) requestLines.push(`Terrain: ${terrain}`);
  if (ambiance) requestLines.push(`Mood: ${ambiance}`);
  requestLines.push(`Scale: region. ${REGION_SCALE_SENTENCE}`);
  const consistency = collectionLines(collection);
  const negation = `${nanoBananaNegation(view)} ${REGION_NO_GRID}`;

  return [
    'You write image prompts for Nano Banana, Google\'s image model, that produce overview maps of whole kingdoms and ' +
      'countries for a Dungeons & Dragons campaign.',
    '',
    'Expand the request below into one image prompt. Keep its subject and every place it names. Describe the land at ' +
      'the level of terrain regions, mountain ranges, rivers, forests, coastlines, roads, and settlements, and place ' +
      'them where they would really be: rivers run downhill from the mountains to the sea or a lake, towns sit on ' +
      'rivers, coasts, and crossroads, and roads link the settlements.',
    '',
    'Write one narrative paragraph of plain sentences, not a keyword list. Cover these parts in order:',
    `1. View. Open with "${CAMERA_OPENINGS[view]}" followed by the land's name or description, with the whole land ` +
      'inside the frame and open margin on every side.',
    '2. Geography. Where each region, range, river, and forest lies, in compass directions.',
    '3. Settlements and roads. Each settlement is a small symbol, never a detailed street plan.',
    `4. Style. ${REGION_STYLE}`,
    `5. Exclusions. End the prompt with this text, copied exactly: ${negation}`,
    '',
    'This is not a combat map: never describe a grid, squares, tiles, or a 5-foot scale.',
    '',
    ...(consistency.length ? ['Match these collection properties:', ...consistency.map((line) => `- ${line}`), ''] : []),
    'Nano Banana prompting rules:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Example:',
    '',
    REGION_EXAMPLES_TEXT,
    '',
    'Now write the prompt for this request:',
    ...requestLines,
    '',
    'Output only the prompt, no preamble, no quotes.',
  ].join('\n');
}

/**
 * Meta-prompt for the text model that expands a map request into a single
 * Nano Banana image prompt.
 */
export function buildGenerationMetaPrompt(params: GenerationPromptParams): string {
  const { ambiance, terrain, setting, perspective, mapScale = DEFAULT_MAP_SCALE, collection } = params;
  const view = resolveMapView(params.mapView, mapScale);
  if (mapScale === 'region') return buildRegionMetaPrompt(params, view);
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
      `and never replace or drop the subject. ${DETAIL_GUIDANCE[view]}`,
    '',
    ENCOUNTER_DESIGN_STEP,
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
      'At least half of the walkable area (the area inside the walls, on interior maps) is open ground. Place cover such ' +
      'as trees, boulders, bushes, and crates as separate pieces with gaps between them. On outdoor maps, never line the ' +
      'map edges with solid walls of foliage or rock; on interior and cave maps, walls stand where the structure\'s walls ' +
      'are. A single room keeps to its own walls: do not invent extra rooms, corridors, or partitions the request does ' +
      'not mention. Say where the open ground is.',
    `4. Style and lighting. Describe this rendering style, keeping every quality it names: ${STYLES[view]} ` +
      LIGHTING_GUIDANCE[view],
    `5. Grid overlay. This is the most important sentence in the prompt. Describe ${GRID_RULE_DESCRIPTIONS[view]}. ` +
      'Choose the line color by the floor\'s seams first, then by the ground\'s brightness: over wood planks, whose seams ' +
      'are dark, use pale cream or white lines; over pale stone use dark lines; otherwise dark lines on light ground and ' +
      'light lines on dark ground. The lines are heavier than the floor\'s own seams and mortar lines, and each plank is ' +
      'narrower than a grid cell, so the grid reads as an overlay. ' +
      'Never describe the grid as faint, subtle, soft, or barely visible.',
    `6. Exclusions. End the prompt with this text, copied exactly: ${nanoBananaNegation(view)}`,
    '',
    'The map is empty of people and creatures, so avoid words that imply a crowd, such as "bustling", "crowded", or "occupied".',
    '',
    'If the request belongs to a collection, the collection\'s lighting and visual details set the color, mood, and light ' +
      'sources, and the style in part 4 sets how the map is rendered.',
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
  const view = resolveMapView(params.mapView, mapScale);
  const isRegion = mapScale === 'region';
  const opening = CAMERA_OPENINGS[view];

  // The map name is left out on purpose: quoted names tend to be rendered as text.
  const mapType = setting ?? terrain;
  const kind = isRegion ? 'overview map' : 'battle map';
  const sentences = [
    mapType ? `${opening} a fantasy ${mapType} ${kind}.` : `${opening} a fantasy ${kind}.`,
  ];
  if (userRequest.trim() || mapType) {
    sentences.push(`${describeSubject(params).replace(/[.\s]+$/, '')}.`);
  }
  sentences.push(scaleSentence(view, mapScale));
  if (!isRegion && perspective === 'indoor') sentences.push(INDOOR_SENTENCES[view]);
  if (ambiance) sentences.push(`The mood is ${ambiance}.`);
  if (!isRegion) {
    sentences.push(
      'At least half the map is open, walkable ground, cover stands as separate pieces with room to move between ' +
        'them, and wherever the location has more than one level, every stair, ramp, or ladder connects two areas ' +
        'drawn on the map, never leading off the map or into a wall.',
    );
  }
  sentences.push(isRegion ? REGION_STYLE : STYLES[view]);
  if (collection?.ambiance) {
    sentences.push(`The light and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}.`);
  }
  if (collection?.visualDetails) sentences.push(`Include these visual details: ${collection.visualDetails}.`);
  if (isRegion) sentences.push(nanoBananaNegation(view), REGION_NO_GRID);
  else sentences.push(GRID_CLAUSES[view], nanoBananaNegation(view));

  return sentences.join(' ');
}
