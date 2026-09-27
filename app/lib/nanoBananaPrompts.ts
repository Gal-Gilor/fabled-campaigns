// Prompt builders for Nano Banana (GEMINI_IMAGE_MODEL in ./config).
// Nano Banana has no negativePrompt field, so every exclusion is written
// inline as a concrete scene property. Prompts are narrative prose, not
// keyword lists.

import { getAmbiancePromptLanguage } from './collections';
import type { Collection } from './collections';
import { generateSettingDescription, generateTerrainDescription } from './mapPrompts';
import type { Setting } from './mapPrompts';

// Camera angles a map can be drawn from. Every map defaults to isometric except
// region maps (kingdoms, countries), which are top-down; an explicit view wins.
export const MAP_VIEWS = ['isometric', 'top-down'] as const;
export type MapView = (typeof MAP_VIEWS)[number];

export function resolveMapView(view?: MapView, mapScale?: MapScale): MapView {
  // A region overview has no isometric form, so it is always top-down.
  if (mapScale === 'region') return 'top-down';
  return view ?? 'isometric';
}

// How the scene sits in the frame. A `field` map fills the frame with the
// playable area. A `diorama` is a zoomed-out game-level model: the place and
// its grounds on a cut-out block of ground against a dark background.
export type MapFraming = 'field' | 'diorama';

/**
 * Isometric maps of a building or named place (a `setting`), and every
 * isometric map in a collection, are dioramas. Open-field encounters, top-down
 * maps, and region maps keep the field framing.
 */
function resolveMapFraming(view: MapView, params: GenerationPromptParams): MapFraming {
  // Region maps are always top-down (resolveMapView), so the view test covers them.
  return view === 'isometric' && (params.setting || params.collection) ? 'diorama' : 'field';
}

const NEGATION_OCCUPANCY_AND_TEXT =
  'The map is completely unoccupied: no people, figures, creatures, characters, miniatures, or tokens anywhere. ' +
  'The image carries no text, labels, legends, names, frames, borders, or watermarks.';
const NEGATION_FOCUS = 'Tack-sharp focus across the whole map.';

/** View-agnostic exclusions: no occupants, no text, sharp focus. */
export const NANO_BANANA_NEGATION_BASE = `${NEGATION_OCCUPANCY_AND_TEXT} ${NEGATION_FOCUS}`;

const CAMERA_CONSTRAINTS: Record<MapView, string> = {
  isometric:
    'Seen from one corner in a true isometric projection, looking down at about 35 degrees; never straight down, ' +
    'never from ground level or a low angle, and with no perspective distortion, so parallel lines stay parallel.',
  'top-down': 'Seen strictly from directly overhead; never from the side, front, or below.',
};

/** Full exclusion text for a view: occupants, text, camera constraint, focus. */
export function nanoBananaNegation(view: MapView): string {
  return `${NEGATION_OCCUPANCY_AND_TEXT} ${CAMERA_CONSTRAINTS[view]} ${NEGATION_FOCUS}`;
}

const EDIT_VIEW_CONSTRAINT =
  'Keep the exact camera angle of the source image, and its grid shape and geometry if it has a grid: an isometric ' +
  'source stays isometric, with its diamond grid if it has one, and a top-down source stays top-down, with its ' +
  'square grid if it has one. Keep the source\'s framing: a diorama keeps its ground block, cut sides, and dark ' +
  'background.';

const EDIT_ZOOM_CONSTRAINT =
  'Keep the source\'s zoom level and extent exactly: the output shows the same whole area at the same size in the ' +
  'frame, with the same number of grid cells across and down (if it has a grid) and every edge of the source scene ' +
  'still in view. ' +
  'On a diorama, the whole ground block stays in frame with the same margin of dark background around it. ' +
  'Never zoom in, crop, or enlarge the scene, and never frame a smaller part of the venue than the source shows.';

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
  /** Name of the collection the source map belongs to, if any. */
  collectionName: string | null;
  /** Active collection terrain, if any. */
  terrain: string | null;
  /** Active collection setting, if any. */
  setting: string | null;
  /** Active collection lighting and atmosphere, as prompt language, if any. */
  ambiance: string | null;
  /** Active collection visual details, if any. */
  visualDetails: string | null;
}

function renderSourceContext(ctx: SourceContext): string {
  const parts: string[] = [];
  if (ctx.terrain) parts.push(`Terrain: ${ctx.terrain}`);
  if (ctx.setting) parts.push(`Setting: ${ctx.setting}`);
  if (ctx.ambiance) parts.push(`Lighting and atmosphere: ${ctx.ambiance}`);
  if (ctx.visualDetails) parts.push(`Visual details: ${ctx.visualDetails}`);
  if (ctx.prompt) parts.push(`Original prompt (for style reference only): ${ctx.prompt}`);
  if (!parts.length) return '';
  const heading = ctx.collectionName
    ? `Collection "${ctx.collectionName}" (keep any new content consistent with it):`
    : 'Source context:';
  return `\n${heading}\n${parts.map((p) => `- ${p}`).join('\n')}`;
}

// Only battle maps carry a grid, so an edit keeps whichever state the source has
// unless the instruction explicitly asks to add or remove one.
const EDIT_GRID_RULE =
  'If the source has grid lines, maintaining the gridlines layer that covers terrain is most important. Reproduce every grid line at the exact same spacing, color, line weight, and opacity as the source. Any region you repaint must show the same grid lines as the surrounding pixels — gridlines must be continuous and seamless across every area the source grid covers (on a diorama, the block\'s top surface only, never its cut sides or background), including replaced terrain. ' +
  'If the source has no grid lines, the edited map has none either. Only an edit instruction that explicitly asks to add or remove a grid changes this: an added grid is a clearly visible, uniform grid of crisp lines with cells of about 5 feet, diamond-shaped on an isometric map and square on a top-down map, covering the whole playable area (on a diorama, the block\'s top surface only); a removed grid leaves the terrain underneath intact.';

export function buildEditPrompt(params: {
  instruction: string;
  sourceContext: SourceContext;
}): string {
  const { instruction, sourceContext } = params;
  return [
    'You are editing the provided D&D map.',
    'Apply the requested change as a focused edit, blending it into the surrounding pixels so the change reads as native.',
    'Preserve everything else, including composition, zoom, lighting, palette, brush style, rendering style, terrain, and structures as in the source image.',
    EDIT_GRID_RULE,
    `\nEdit instruction: ${instruction.trim()}`,
    renderSourceContext(sourceContext),
    `\nConstraints to maintain:\n- ${NANO_BANANA_NEGATION_BASE}`,
    `- ${EDIT_VIEW_CONSTRAINT}`,
    `- ${EDIT_ZOOM_CONSTRAINT}`,
    '- Sharp focus, in the same rendering style as the source image.',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

export interface GenerationPromptParams {
  userRequest: string;
  terrain?: string;
  setting?: string;
  perspective?: 'indoor' | 'outdoor';
  mapScale?: MapScale;
  mapView?: MapView;
  collection?: Collection;
  /** Draw a tactical grid. Only battle maps have one; region maps never do. */
  battleMap?: boolean;
}

// Map size tiers, smallest to largest. On the tactical tiers every square is
// roughly 5 feet and the tier sets how many squares the frame shows. `region`
// is an overview of a kingdom or country: no tactical grid at all.
export const MAP_SCALES = ['small', 'standard', 'large', 'huge', 'region'] as const;
export type MapScale = (typeof MAP_SCALES)[number];
export const DEFAULT_MAP_SCALE: MapScale = 'standard';

const CAMERA_OPENINGS: Record<MapView, string> = {
  isometric:
    'A zoomed-out isometric view, as in a classic isometric strategy game, with the camera looking down at about ' +
    '35 degrees and turned 45 degrees to the scene, so floor edges run diagonally at 30 degrees from the horizontal ' +
    'and walls and objects show their tops and two sides, of',
  'top-down': 'A zoomed-out, top-down orthographic view from high above, straight down, of',
};

// Without an explicit frame size the model crops tight around one feature,
// so every scale states how many grid cells the image shows.
const FRAMING_SENTENCE =
  'The whole location fits inside the frame with open margin on every side; no wall, room, or feature is cut off ' +
  'by the image edge, and the view is never a close crop of a single object.';

// A diorama frames the block rather than the location itself. DIORAMA_BASE
// already says the whole block fits inside the frame, so this does not repeat it.
const DIORAMA_FRAMING_SENTENCE =
  'No part of the block, and no wall, room, or feature on it, is cut off by the image edge, and the view is never ' +
  'a close crop of a single object.';

// The requested area is the diorama's subject; the rest of the block is context.
const DIORAMA_FOCUS_SENTENCE =
  'The requested area takes most of the block\'s top surface, and the surroundings fill the margin around it.';

// The negation's "no frames, borders" refers to drawn borders; a modelled block
// edge on a plain background does not read as one, so no carve-out is added.
const DIORAMA_BASE =
  'The whole scene is a detailed game-level diorama for a tabletop role-playing game, standing on a square block ' +
  'of ground whose cut sides show layers of soil and rock, on a plain, dark, featureless background; the whole ' +
  'block and a margin of background fit inside the frame.';

// What surrounds the requested area on a diorama's block depends on the kind of
// place. These sentences replace INDOOR_SENTENCES.isometric on a diorama and go
// in the request lines and the fallback, never in the examples.
// Built settlements have their own structures on the block (DIORAMA_GROUNDS);
// open-air places are just land running to the block's edges, with no invented
// buildings.
type DioramaSettingKind = 'building' | 'built-settlement' | 'open-air' | 'underground' | 'ship';

const DIORAMA_SETTING_KIND: Record<Setting, DioramaSettingKind> = {
  tavern: 'building',
  castle: 'building',
  fortress: 'building',
  tower: 'building',
  temple: 'building',
  academy: 'building',
  library: 'building',
  workshop: 'building',
  'trading-post': 'building',
  arena: 'building',
  village: 'built-settlement',
  market: 'built-settlement',
  docks: 'built-settlement',
  crossroads: 'open-air',
  bridge: 'open-air',
  campsite: 'open-air',
  graveyard: 'open-air',
  ruins: 'open-air',
  cave: 'underground',
  mine: 'underground',
  dungeon: 'underground',
  sewer: 'underground',
  ship: 'ship',
};

// An indoor map of a building: the building itself is the cutaway.
const DIORAMA_BUILDING =
  'The main building is a cutaway: its roof is removed and its near walls are cut low, so the rooms show from ' +
  'above, while its outer walls, entrance, and chimney or tower stubs stay visible. The rest of the block holds ' +
  'the grounds around it: paths, a yard, outbuildings, fences, and trees.';

// An outdoor map of a building, such as its courtyard or gate: the building
// still stands on the block, but the outdoor area is the focus.
const DIORAMA_BUILDING_OUTDOOR =
  'The main building stands at the center of the block as a cutaway, its roof removed and its near walls cut low, ' +
  'with its outer walls, entrance, and chimney or tower stubs visible. The requested outdoor area, such as a ' +
  'courtyard or a gate, is the focus, with the building\'s grounds around it: paths, a yard, outbuildings, fences, ' +
  'and trees.';

const DIORAMA_GROUNDS =
  'The requested area sits among its surroundings on the block: nearby buildings have their roofs removed and ' +
  'their near walls cut low, with walls, paths, and grounds around them.';

// Open-air places (a campsite, a crossroads, a stretch of wilderness) have no
// buildings of their own. The block is just land running to its edges, so
// nothing invents structures around a forest ambush or a campsite.
function dioramaTerrainSentence(collection?: Collection): string {
  const terrain = collection?.terrain ?? 'land';
  return `The surrounding ${terrain} continues around the requested area to the block's edges.`;
}

// Ruins are open-air but still leave low structure behind.
const DIORAMA_RUINS_CLAUSE = 'Broken walls and foundations sit low among the surroundings.';

const DIORAMA_UNDERGROUND =
  'The chambers are carved into the block\'s rock: the rock above is cut away so the floors show from above, and ' +
  'the block\'s cut sides show the rock and passages around them.';

const DIORAMA_SHIP =
  'The ship sits in a strip of water along a dock on the block, shown as a cutaway with its upper deck cut open ' +
  'so the decks below show.';

// Collection maps built on structure — a building, a built settlement, or an
// underground complex — or any indoor map: the requested area is one part of a
// larger complex. Never added for terrain-only or open-air maps, which have no
// complex of rooms and walls to surround it with.
const DIORAMA_COMPLEX =
  'The requested area is one part of a larger complex: the adjoining rooms, buildings, walls, and grounds of the ' +
  'complex surround it, with roofs removed and near walls cut low, and the requested area stays the focus with the ' +
  'most detail.';

// Kinds whose surroundings are already built structure, so a collection's
// larger-complex sentence (DIORAMA_COMPLEX) reads naturally alongside them.
const COMPLEX_ELIGIBLE_KINDS: ReadonlySet<DioramaSettingKind> = new Set(['building', 'built-settlement', 'underground']);

function isSetting(setting: string): setting is Setting {
  return Object.hasOwn(DIORAMA_SETTING_KIND, setting);
}

// Kinds where the Setting names a place (a building, a settlement, a cave
// system, a ship) and the request may name one room or area inside it. Each
// lists the ordinary rooms or areas the rest of the place shows, so the
// requested room's purpose never spreads to the whole place.
type PlaceKind = Exclude<DioramaSettingKind, 'open-air'>;

const PLACE_OTHER_AREAS: Record<PlaceKind, string> = {
  building: 'a great hall or common room, a stair, a guard room, and corridors',
  'built-settlement': 'neighbouring houses, stalls, and lanes',
  underground: 'side tunnels and plain chambers',
  ship: 'other decks and cabins',
};

// The place's own shell, which fills the block around the requested room.
const PLACE_SHELL: Record<PlaceKind, string> = {
  building: 'its outer walls, towers or roofline stubs, and gate or entrance, with its yard or grounds at the edges',
  'built-settlement': 'its buildings, lanes, and edges out to the block\'s sides',
  underground: 'its rock walls and passages out to the block\'s cut sides',
  ship: 'its hull, masts, and rails, with the water and dock around it',
};

interface DioramaPlace {
  /** The place's name as prose, e.g. "castle" or "trading post". */
  name: string;
  /** The same name with its indefinite article, e.g. "an academy". */
  withArticle: string;
  kind: PlaceKind;
}

/** The request's setting, or else the collection's, with its diorama kind. */
function dioramaSetting(params: GenerationPromptParams): { setting: Setting; kind: DioramaSettingKind } | null {
  const setting = params.setting ?? params.collection?.setting;
  if (!setting || !isSetting(setting)) return null;
  return { setting, kind: DIORAMA_SETTING_KIND[setting] };
}

/**
 * The place a diorama shows, from the request's setting or else the
 * collection's. Null for open-air settings and when no setting is known, where
 * the request itself is the whole scene.
 */
function dioramaPlace(params: GenerationPromptParams): DioramaPlace | null {
  const known = dioramaSetting(params);
  if (!known) return null;
  const { setting, kind } = known;
  if (kind === 'open-air') return null;
  const name = setting.replace(/-/g, ' ');
  const article = /^[aeiou]/.test(name) ? 'an' : 'a';
  return { name, withArticle: `${article} ${name}`, kind };
}

// Replaces DIORAMA_FOCUS_SENTENCE when the Setting names a place: the place
// fills the block and a requested room takes only part of it. Worded to hold
// for a whole-place request too, since the fallback prompt cannot tell which
// kind of request it has.
function placeFocusSentence(place: DioramaPlace): string {
  return `The ${place.name} fills the block's top surface; a requested room or area within it sits near the middle ` +
    'and takes about a third of it.';
}

// Image-prompt prose for the fallback: the rest of the place keeps its own
// purposes, and the requested area's fixtures stay inside it.
function placeAreasSentence(place: DioramaPlace): string {
  return `The requested area keeps its fixtures inside its own walls; the ${place.name}'s ` +
    `other visible areas, such as ${PLACE_OTHER_AREAS[place.kind]}, keep their own ordinary purposes and are drawn ` +
    'simply.';
}

// Meta-prompt instruction: separates the place (the Setting) from the room or
// area the request names, so "a castle's armory" never turns the whole castle
// into an armory.
function placeRoomRule(place: DioramaPlace): string {
  const { name, withArticle, kind } = place;
  return `The Setting names the place on the block, ${withArticle}; the request names either the whole ${name} or ` +
    `one room or area inside it. For one room or area, name the ${name} first and the room second in the opening, ` +
    `as in "of ${withArticle}, centred on its armory", never with the room as the opening's subject. The ${name} ` +
    `is the cutaway and fills the block, showing ${PLACE_SHELL[kind]}. The room sits inside it near the middle ` +
    'with the most detail, about a third of the block\'s top surface, with its defining fixtures inside that room ' +
    `only. The ${name}'s other visible areas, such as ` +
    `${PLACE_OTHER_AREAS[kind]}, keep their own ordinary purposes and are drawn simply. Never give the whole ` +
    `${name} the room's purpose, and never call the room itself sprawling or large-scale; size belongs to the ` +
    `block. When the request names the whole ${name}, the opening names only the ${name}, with no "centred on" ` +
    `phrase, and the ${name} itself is the subject.`;
}

/**
 * The sentences that describe what surrounds the requested area on a diorama's
 * block. Shared by the meta-prompt's request lines and the fallback prompt.
 * The setting kind comes from the request's own setting first, falling back to
 * the collection's setting, so a collection's setting is not lost when the
 * agent omits it from the request (it is told not to repeat collection
 * properties). A diorama with no known setting kind (a terrain-only
 * collection) is treated as a building when indoor and as open terrain
 * otherwise, so a wilderness collection never gains invented buildings.
 */
function dioramaContextSentences(params: GenerationPromptParams): string[] {
  const { perspective, collection } = params;
  const known = dioramaSetting(params);
  const kind = known?.kind;
  const indoor = perspective === 'indoor';
  const terrainSentence = dioramaTerrainSentence(collection);
  let main: string;
  switch (kind) {
    case 'building':
      main = indoor ? DIORAMA_BUILDING : DIORAMA_BUILDING_OUTDOOR;
      break;
    case 'built-settlement':
      main = DIORAMA_GROUNDS;
      break;
    case 'open-air':
      main = terrainSentence;
      break;
    case 'underground':
      main = DIORAMA_UNDERGROUND;
      break;
    case 'ship':
      main = DIORAMA_SHIP;
      break;
    default:
      main = indoor ? DIORAMA_BUILDING : terrainSentence;
  }
  const sentences = [main];
  if (kind === 'open-air' && known?.setting === 'ruins') sentences.push(DIORAMA_RUINS_CLAUSE);
  if (collection && (indoor || (kind && COMPLEX_ELIGIBLE_KINDS.has(kind)))) sentences.push(DIORAMA_COMPLEX);
  return sentences;
}

// How much detail each view's style allows. Both keep only the few defining
// fixtures and ban clutter and decorative filler; the game style adds material
// detail, not more props.
const DETAIL_SENTENCES: Record<MapView, string> = {
  isometric:
    'Only the few furniture pieces and fixtures that define the place stay, each with a clear purpose, drawn as ' +
    'crisp, readable shapes with physically based materials and hand-crafted detail on the fixtures and walls. ' +
    'Less is more: no decorative filler such as scattered barrels, sacks, pots, signs, flags, or trinkets, and ' +
    'the floor stays open for movement and free of clutter piles such as heaps of papers, bottles, loose tools, ' +
    'and debris.',
  'top-down':
    'Only the few furniture pieces and fixtures that define the place stay, drawn as clear, readable shapes, and the ' +
    'floor is free of decorative filler and incidental clutter such as papers, bottles, loose tools, and debris.',
};

// On a battle map, the isometric floor texture has to stay quiet under the grid.
const ISOMETRIC_GRID_TEXTURE_SENTENCE = 'Its texture stays subtle enough that the grid reads clearly over it.';

function detailSentence(view: MapView, grid: boolean): string {
  return grid && view === 'isometric'
    ? `${DETAIL_SENTENCES.isometric} ${ISOMETRIC_GRID_TEXTURE_SENTENCE}`
    : DETAIL_SENTENCES[view];
}

// Rendering style per view: classic tabletop maps for top-down, a premium
// isometric role-playing game in real-time 3D for isometric. Genre words, not
// game titles, and real rendering qualities only; Nano Banana ignores quality
// tokens. "Matte" keeps the 3D look from turning glossy.
const STYLES: Record<MapView, string> = {
  isometric:
    'An isometric 3D scene in the style of a premium modern isometric role-playing game rendered in ' +
    'real-time 3D, with physically based materials such as worn stone, grained wood, forged iron, and woven cloth ' +
    'in a matte finish, never glossy. Soft ambient occlusion darkens corners and the ground under objects, and ' +
    'subtle bounced light lifts the shade. Silhouettes are crisp and readable, and the architecture carries ' +
    'hand-crafted detail. Everything keeps grounded, lifelike proportions and a muted natural palette, so nothing ' +
    'looks like a toy, a plastic miniature, or a cartoon prop, and colors are never candy-bright or oversaturated. ' +
    'Light comes from sources inside the scene, such as torches, braziers, or windows, and casts directional ' +
    'shadows, with warm pools of light set against cool shade.',
  'top-down':
    'A classic tabletop map in a clean, hand-drawn style, with flat color fills from a limited palette and ' +
    'crisp dark outlines around walls and objects. The lighting is soft and even, with only light shadows that mark ' +
    'changes in height, and surface texture is minimal, so the map reads clearly on a table screen or a print.',
};

// gemini-2.5-flash-image draws triangles when a third line direction creeps in,
// so the isometric grid names its two directions outright.
const ISOMETRIC_GRID_DIRECTIONS =
  'the lines run in exactly two diagonal directions, with no horizontal or vertical grid lines, so every cell is ' +
  'the same closed diamond';

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
    `ground beneath it, covers the entire playable area edge to edge; ${ISOMETRIC_GRID_DIRECTIONS}, each tile a ` +
    'diamond (rhombus) about twice as wide as it is tall, laid flat on the floor or ground and following the ' +
    '30-degree angle, and the grid runs unbroken across the whole playable area, including any slopes, stairs, or ' +
    `bridges. ${GRID_CONTRAST}`,
  'top-down':
    'A clearly visible, uniform square tactical grid of crisp lines, heavier than the floor\'s own seams, in a color that contrasts with the ground beneath it, ' +
    'covers the entire playable area edge to edge and runs unbroken across the whole playable area, including any slopes, ' +
    `stairs, or bridges. ${GRID_CONTRAST}`,
};

// On a diorama the grid covers only the block's walkable top, never its cut
// sides or the background around it.
const DIORAMA_GRID_CLAUSE =
  'A clearly visible, uniform diamond-shaped isometric grid of crisp lines, heavier than the floor\'s own seams, in ' +
  'a color that contrasts with the ground beneath it, covers the whole walkable top surface of the block, its ' +
  `floors, yards, and paths; ${ISOMETRIC_GRID_DIRECTIONS}, each tile a diamond (rhombus) about twice as wide as it ` +
  'is tall, laid flat on the floor or ground and following the 30-degree angle, and the grid runs unbroken across ' +
  'the top surface, including any slopes, stairs, or bridges, but never onto the block\'s cut sides or the ' +
  `background. ${GRID_CONTRAST}`;

function gridClause(view: MapView, framing: MapFraming): string {
  return framing === 'diorama' ? DIORAMA_GRID_CLAUSE : GRID_CLAUSES[view];
}

// What a region map leaves out, as inline scene properties: every cartographic
// ornament, anything built, and anything that hides the land.
// Only battle maps carry a grid; every other map says outright that it has none,
// since the image model otherwise tends to add one to a tabletop map.
const NO_GRID_SENTENCE = 'The ground carries no grid lines, tile outlines, or square markings.';

function negation(view: MapView, grid: boolean): string {
  return grid ? nanoBananaNegation(view) : `${nanoBananaNegation(view)} ${NO_GRID_SENTENCE}`;
}

const REGION_NEGATION_EXTRA =
  'The land carries no grid lines, political borders, dotted routes, compass roses, scale bars, map symbols, or ' +
  'icons. No castles, towers, walls, buildings, ships, or monuments are visible anywhere. The sky over the land is ' +
  'free of clouds, and the image shows no map interface, logos, or on-screen controls.';

const REGION_NEGATION = `${nanoBananaNegation('top-down')} ${REGION_NEGATION_EXTRA}`;

// The grid description the meta-prompt's grid rule asks the text model to write.
const GRID_RULE_DESCRIPTIONS: Record<MapView, string> = {
  isometric:
    'a clearly visible, uniform diamond-shaped isometric grid of crisp lines heavier than the floor\'s own seams, where ' +
    `${ISOMETRIC_GRID_DIRECTIONS}, each tile a diamond (rhombus) about twice as wide as it is tall, laid flat on the ` +
    'floor or ground and following the 30-degree angle, covering the entire playable area edge to edge and running ' +
    'unbroken across the whole playable area and any change in height',
  'top-down':
    'a clearly visible, uniform square grid of crisp lines heavier than the floor\'s own seams, covering the entire playable area edge to edge ' +
    'and running unbroken across the whole playable area and any change in height',
};

const DIORAMA_GRID_RULE_DESCRIPTION =
  'a clearly visible, uniform diamond-shaped isometric grid of crisp lines heavier than the floor\'s own seams, where ' +
  `${ISOMETRIC_GRID_DIRECTIONS}, each tile a diamond (rhombus) about twice as wide as it is tall, laid flat on the ` +
  'floor or ground and following the 30-degree angle, covering the whole walkable top surface of the block (its ' +
  'floors, yards, and paths) and running unbroken across it and any change in height, but never onto the block\'s ' +
  'cut sides or the background';

function gridRuleDescription(view: MapView, framing: MapFraming): string {
  return framing === 'diorama' ? DIORAMA_GRID_RULE_DESCRIPTION : GRID_RULE_DESCRIPTIONS[view];
}

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

// Each tactical tier's size in 5-foot cells. Battle maps state the cell count;
// gridless maps state the same area in feet, so the zoom level matches.
const SCALE_CELLS: Record<Exclude<MapScale, 'region'>, [number, number]> = {
  small: [20, 15],
  standard: [24, 18],
  large: [28, 21],
  huge: [40, 30],
};

function buildScaleSentences(
  view: MapView,
  framing: MapFraming = 'field',
  grid = true,
): Record<MapScale, string> {
  const { count, short } = GRID_UNITS[view];
  // A diorama's size is the block's top surface, not the whole frame.
  const shows = framing === 'diorama' ? 'the block\'s top surface is' : 'the frame shows';
  const size = (tier: keyof typeof SCALE_CELLS) => {
    const [w, h] = SCALE_CELLS[tier];
    return grid
      ? `${shows} ${w} by ${h} ${count}, each covering roughly 5 feet`
      : `${shows} an area about ${w * 5} by ${h * 5} feet`;
  };
  const featureSize = grid ? `each covering at least a couple of ${short}` : 'each several feet across';
  return {
    small:
      `This is a map of a small chamber, crevice, or tight passage: ${size('small')}. Show the shape of the space ` +
      'and only its few key features and fixtures.',
    standard:
      `This is a map of a single room or encounter area: ${size('standard')}. Show the room's layout and its main ` +
      `furniture or features, ${featureSize}.`,
    large:
      'This is a map of a large space such as a foyer, great hall, factory floor, or courtyard, or an outdoor ' +
      `encounter area such as a stretch of road, woods, or a camp: ${size('large')}. ${LARGE_SCALE_DETAIL[view]}`,
    huge:
      `This is a map of a very large area such as a fortress, a district, or a stretch of wilderness: ` +
      `${size('huge')}. ${HUGE_SCALE_DETAIL[view]}`,
    region: REGION_SCALE_SENTENCE,
  };
}

// Region maps are overviews for travel and worldbuilding, not combat maps: no
// grid, no 5-foot scale. They read as satellite imagery, so only what is visible
// from orbit appears; map symbols invite castle icons and roads at every town.
const REGION_OPENING = 'A true-color satellite image, looking straight down from orbit, of';

const REGION_STYLE =
  'Rendered as a cloud-free satellite mosaic in natural color: deep ocean blue fades to turquoise shallows along ' +
  'the coasts, lowlands are green, drylands are tan and ochre, and high peaks are gray-brown rock capped with snow. ' +
  'Mountain ranges take soft relief shading from a low sun in the northwest, and forests read as dark green canopy ' +
  'texture. The finish is matte and photographic, with clear air and no haze.';

const REGION_SCALE_SENTENCE =
  'This is an overview of a vast area such as a continent, a kingdom, or a country, seen from hundreds of miles up, ' +
  'with the whole land inside the frame and a margin of sea or neighboring land on every side. From that height, ' +
  'single trees, buildings, walls, bridges, and roads are too small to see: forests show as dark green canopy ' +
  'texture, mountain ranges as ridged relief, and a city only as a small, pale, irregular patch of cleared land and ' +
  'fields. It is not a combat map and has no tactical grid.';

// Keyed by grid (battle map) or plain, then by view.
type GridKey = 'grid' | 'plain';
const gridKey = (grid: boolean): GridKey => (grid ? 'grid' : 'plain');

const SCALE_SENTENCES: Record<GridKey, Record<MapView, Record<MapScale, string>>> = {
  grid: {
    isometric: buildScaleSentences('isometric'),
    'top-down': buildScaleSentences('top-down'),
  },
  plain: {
    isometric: buildScaleSentences('isometric', 'field', false),
    'top-down': buildScaleSentences('top-down', 'field', false),
  },
};
const DIORAMA_SCALE_SENTENCES: Record<GridKey, Record<MapScale, string>> = {
  grid: buildScaleSentences('isometric', 'diorama'),
  plain: buildScaleSentences('isometric', 'diorama', false),
};

const INDOOR_SENTENCES: Record<MapView, string> = {
  isometric:
    'This is an interior map drawn as a cutaway room: the two far walls stand at full height, and the two near walls ' +
    'are cut away or drawn as low stubs, so the whole floor is visible.',
  'top-down':
    'This is an interior map: show the floor plan with its walls and doorways as if the roof were removed.',
};

function scaleSentence(
  view: MapView,
  mapScale: MapScale = DEFAULT_MAP_SCALE,
  framing: MapFraming = 'field',
  dioramaFocus: string = DIORAMA_FOCUS_SENTENCE,
  grid = true,
): string {
  // The framing and detail sentences talk about walls, rooms, and floors, which a region map has none of.
  if (mapScale === 'region') return REGION_SCALE_SENTENCE;
  const key = gridKey(grid);
  if (framing === 'diorama') {
    return (
      `${DIORAMA_SCALE_SENTENCES[key][mapScale]} ${dioramaFocus} ${DIORAMA_FRAMING_SENTENCE} ` +
      detailSentence(view, grid)
    );
  }
  return `${SCALE_SENTENCES[key][view][mapScale]} ${FRAMING_SENTENCE} ${detailSentence(view, grid)}`;
}

function describeSubject(params: GenerationPromptParams): string {
  const request = params.userRequest.trim();
  if (request) return request;
  if (params.setting) return generateSettingDescription(params.setting);
  if (params.terrain) return generateTerrainDescription(params.terrain);
  return 'A fantasy location.';
}

// The collection's terrain and setting, phrased as the world its maps share, e.g.
// "forest terrain, in a dungeon setting" (either half may be missing). Shared by
// the collection block below and the fallback prompt's world sentence, so both
// describe the world the same way.
function collectionWorldPhrase(collection?: Collection): string | null {
  const parts = [
    collection?.terrain && `${collection.terrain} terrain`,
    collection?.setting && `a ${collection.setting} setting`,
  ].filter((part): part is string => Boolean(part));
  if (!parts.length) return null;
  return parts.join(', in ');
}

// Every property the collection sets, one line each, in the words the text model
// is told to carry into the prompt. Terrain and setting are folded into one World
// line (never bare "Terrain:"/"Setting:" lines, which collide with the request's
// own Terrain/Setting lines and invite the model to relocate the subject).
function collectionLines(collection?: Collection): string[] {
  if (!collection) return [];
  const lines: string[] = [];
  const world = collectionWorldPhrase(collection);
  if (world) lines.push(`World: this collection's maps are set in ${world}`);
  if (collection.ambiance) {
    lines.push(`Lighting and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}`);
  }
  if (collection.visualDetails) lines.push(`Visual details: ${collection.visualDetails}`);
  return lines;
}

function collectionBlock(collection?: Collection): string[] {
  const lines = collectionLines(collection);
  if (!collection || !lines.length) return [];
  return [`Collection "${collection.name}":`, ...lines.map((line) => `- ${line}`)];
}

// How the text model uses a collection block. Shared by both meta-prompts.
const COLLECTION_RULE =
  'If a Collection block follows the request, the map must match the other maps in that collection, but the ' +
  'request\'s own location always stays the subject: a tavern request stays a tavern even inside a dungeon-setting ' +
  'collection. Carry every line of the block into the prompt nearly word for word: the World line only shapes the ' +
  'surroundings, materials, and palette around that subject, never the subject itself; the lighting and atmosphere ' +
  'line goes into the lighting sentence, where it replaces the style\'s default light sources; and every visual ' +
  'detail line goes into the style sentence. The rendering style itself stays as described.';

interface GenerationExample {
  request: string;
  /** Request lines shown between the request and the scale, as a real request would carry them. */
  setting?: string;
  perspective?: 'indoor' | 'outdoor';
  scale: MapScale;
  /** Collection lines shown after the request, as a real request would carry them. */
  collection?: string[];
  prompt: string;
}

// The collection the example prompts use, so the model sees its lines carried
// into the prompt nearly word for word.
const EXAMPLE_COLLECTION_LINES = [
  'Collection "Frostmarch":',
  '- World: this collection\'s maps are set in tundra terrain, in a ruins setting',
  '- Lighting and atmosphere: pale silver moonlight, deep blue shadows, crisp cold night',
  '- Visual details: frost-rimed stone, pale blue banners',
];

const TOP_DOWN_OPENING = CAMERA_OPENINGS['top-down'];
const ISOMETRIC_OPENING = CAMERA_OPENINGS.isometric;

// Example helpers: battle-map examples size the frame in grid cells and carry a
// grid sentence; gridless examples size it in feet and have no grid sentence.
const exampleFrame = (grid: boolean, w: number, h: number, unit: string) =>
  grid ? `${w} by ${h} ${unit} of roughly 5 feet each` : `an area about ${w * 5} by ${h * 5} feet`;
const exampleGrid = (grid: boolean, sentence: string) => (grid ? `${sentence} ` : '');
const pick = (grid: boolean, gridText: string, plainText: string) => (grid ? gridText : plainText);

// Every example puts the grid sentence (on battle maps) right after the frame,
// states a count for each singular feature, and keeps to about 150 to 220 words
// before the exclusions, because gemini-2.5-flash-image weighs early text most
// and adds features to long, loose prompts.
const topDownExamples = (grid: boolean): GenerationExample[] => [
  {
    request: 'A map of a tavern',
    scale: 'standard',
    prompt:
      `${TOP_DOWN_OPENING} the entire ground floor of a fantasy tavern, framed to show ` +
      `${exampleFrame(grid, 24, 18, 'grid squares')}, with every outer wall visible and open margin around the ` +
      'building. ' +
      exampleGrid(grid,
        'A clearly visible, uniform square grid of thin, crisp black lines covers the entire playable area edge to ' +
        'edge, running unbroken across the floor, the tables, and the bar.') +
      'The common room is a single level with a flagstone floor. One long timber ' +
      'bar runs along the west wall, four long tables with benches fill the center with open aisles between them, and ' +
      'one wide stone fireplace stands against the north wall. Drawn as a classic tabletop map in a clean, ' +
      'hand-drawn style, with flat fills of warm wood and stone colors, crisp dark outlines around the walls, the bar, ' +
      `and every table, and soft, even light with only light shadows beside the furniture. ${negation('top-down', grid)}`,
  },
  {
    request: 'a wizard\'s library',
    scale: 'standard',
    collection: EXAMPLE_COLLECTION_LINES,
    prompt:
      `${TOP_DOWN_OPENING} a wizard's library set within a ruined tundra keep, framed to show ` +
      `${exampleFrame(grid, 24, 18, 'grid squares')}, with all four walls and the one door visible and open margin ` +
      'around the room. ' +
      exampleGrid(grid,
        'A clearly visible, uniform square grid of crisp pale cream lines, heavier than the dark plank seams, covers ' +
        'the entire playable area edge to edge, running unbroken across the floor and the table.') +
      'The room is a single level with a dark oak plank floor. Tall ' +
      'bookshelves line the north, east, and west walls, one large reading table stands in the center, one carved ' +
      'lectern faces it from the south wall, and one brass orrery sits in the northeast corner, leaving open floor ' +
      'between the table and the shelves. Drawn as a classic tabletop map in a clean, hand-drawn style, with ' +
      'flat fills of deep wood and brass colors, frost-rimed stone walls, pale blue banners between the shelves, and ' +
      'crisp dark outlines around the shelves, the table, and the lectern. Pale silver moonlight lies evenly over the ' +
      `room, with deep blue shadows beside each shelf and the feel of a crisp cold night. ${negation('top-down', grid)}`,
  },
  {
    request: 'a forest clearing map',
    scale: 'large',
    prompt:
      `${TOP_DOWN_OPENING} a forest clearing and the woods around it, framed to show ` +
      `${exampleFrame(grid, 28, 21, 'grid squares')}, so the whole clearing and its edges sit inside the frame. ` +
      exampleGrid(grid,
        'A clearly visible, uniform square grid of thin, crisp pale cream lines covers the entire playable area edge ' +
        'to edge, continuing across the canopy, the ravine floor, and the log bridge.') +
      'One ring of standing stones sits at the center of a grassy clearing ' +
      'bordered by separate tree canopies with gaps between them. A single ravine with one stream cuts across the ' +
      'eastern side, one fallen log spans it as a bridge, and one dirt trail winds down the southern slope to the ' +
      'stream. Drawn as a classic tabletop map in a clean, hand-drawn style, with flat fills of greens and ' +
      'earth colors, crisp dark outlines around the stones, the canopies, and the ravine edges, and soft, even light ' +
      `with a light shadow along the ravine walls that marks its depth. ${negation('top-down', grid)}`,
  },
  {
    request: 'a dungeon maze',
    scale: 'huge',
    prompt:
      `${TOP_DOWN_OPENING} a sprawling dungeon maze, framed to show ${exampleFrame(grid, 40, 30, 'grid squares')}, ` +
      'so the full network of passages sits inside the frame. ' +
      exampleGrid(grid,
        'A clearly visible, uniform square grid of thin, crisp white lines covers the entire playable area edge to ' +
        'edge, running across the corridors, the stairs, and the bridge.') +
      'Corridors of rough stone twist between chambers, several of them ending in dead ends. One wide chasm splits ' +
      'the center of the maze and is crossed by a single bridge, and one stair leads down from the northern passages ' +
      'to a lower level of chambers in the northeast corner. Drawn as a classic tabletop map in a clean, ' +
      'hand-drawn style, with flat fills of cold grey-blue stone colors, crisp dark outlines around every wall and the ' +
      `chasm edge, soft, even light, and a flat black fill marking the depth of the chasm. ${negation('top-down', grid)}`,
  },
];

const ISOMETRIC_GRID_EXAMPLE = (color: string, runs: string) =>
  `A clearly visible, uniform diamond-shaped isometric grid of thin, crisp ${color} lines covers the entire ` +
  `playable area edge to edge; ${ISOMETRIC_GRID_DIRECTIONS}, each tile a diamond about twice as wide as it is ` +
  `tall, lying flat on the ground at the 30-degree angle and running unbroken across ${runs}.`;

const DIORAMA_GRID_EXAMPLE = (color: string, runs: string) =>
  `A clearly visible, uniform diamond-shaped isometric grid of thin, crisp ${color} lines covers the block's ` +
  `walkable top; ${ISOMETRIC_GRID_DIRECTIONS}, each tile a diamond about twice as wide as it is tall, lying flat ` +
  `at the 30-degree angle across ${runs}, never on the cut sides or the background.`;

const ISOMETRIC_STYLE_EXAMPLE = 'Rendered as a matte, physically based isometric role-playing game scene:';

// Field examples: one outdoor encounter, which shows story-driven placement and
// open ground, and one indoor room with no setting (far walls carry the
// fixtures, near walls cut away). Isometric's camera opening and grid sentence
// run longer than top-down's, so these keep to about 200 to 260 words before the
// exclusion text rather than 150 to 220.
const isometricFieldExamples = (grid: boolean): GenerationExample[] => [
  {
    request: 'The party is ambushed by bandits on a forest road',
    perspective: 'outdoor',
    scale: 'large',
    prompt:
      `${ISOMETRIC_OPENING} a stretch of forest road where bandits wait in ambush, framed to show ` +
      `${exampleFrame(grid, 28, 21, 'tiles')}, with open margin around the scene. ` +
      exampleGrid(grid, ISOMETRIC_GRID_EXAMPLE('pale cream', 'the road, the forest floor, and the camp')) +
      `A single packed-dirt road ${pick(grid, 'three tiles', 'about 15 feet')} wide runs diagonally from edge to ` +
      'edge, and no other roads or paths cross the map. One fallen oak blocks it near the center. Trees, boulders, ' +
      `and bushes stand ${pick(grid, 'a few tiles', 'a few paces')} apart on both sides. North of the road, one ` +
      'bandit camp holds one cold fire pit, two lean-to shelters, and crates. More than half the map stays open ' +
      `ground. ${ISOMETRIC_STYLE_EXAMPLE} rough bark, mossy ` +
      'granite, and packed earth. Afternoon sunlight casts long directional shadows, warm against cool shade, with ' +
      `soft ambient occlusion under the bushes. ${negation('isometric', grid)}`,
  },
  {
    request: 'A guard room with weapon racks',
    perspective: 'indoor',
    scale: 'standard',
    prompt:
      `${ISOMETRIC_OPENING} a stone guard room, framed to show ${exampleFrame(grid, 24, 18, 'tiles')}, with open ` +
      'margin around the room. ' +
      exampleGrid(grid, ISOMETRIC_GRID_EXAMPLE('black', 'the flagstones and under the table')) +
      'The room is a cutaway: the far north and west walls stand at full height, and the near south and east walls ' +
      'are low stubs, so the whole floor is visible. The floor is a single level of pale flagstone. Weapon ' +
      'racks line the north wall, one iron-bound door opens in the west wall, one oak table with two benches ' +
      'stands in the center, and one brazier burns in the northeast corner, leaving open floor around the table. ' +
      `${ISOMETRIC_STYLE_EXAMPLE} worn flagstones, grained oak, and forged iron. The brazier casts warm directional ` +
      `shadows against cool shade, with soft ambient occlusion under the table. ${negation('isometric', grid)}`,
  },
];

// Diorama examples: a whole-place request (the tavern), and a collection map of
// one room inside a place (the tower's library), which names the place first. The diorama and cutaway sentences add about 60 words,
// so these keep to about 240 to 300 words before the exclusion text.
const isometricDioramaExamples = (grid: boolean): GenerationExample[] => [
  {
    request: 'A map of a tavern',
    setting: 'tavern',
    perspective: 'indoor',
    scale: 'standard',
    prompt:
      `${ISOMETRIC_OPENING} a fantasy roadside tavern. ${DIORAMA_BASE} The block's top surface is ` +
      `${exampleFrame(grid, 24, 18, 'tiles')}. ` +
      exampleGrid(grid, DIORAMA_GRID_EXAMPLE('black', 'the floor, the yard, and the path')) +
      'The tavern is a cutaway, roof removed and near walls cut low, with its outer walls, door, and chimney stub ' +
      'visible. Inside, one long timber bar runs along the west wall, one stone fireplace stands ' +
      'against the north wall, and four tables with benches fill the center with open aisles. Outside, ' +
      `one dirt path leads from the door past one stable, a fence, and two oaks. ` +
      `${ISOMETRIC_STYLE_EXAMPLE} worn flagstones, grained oak, and rough plaster. The hearth casts warm directional ` +
      `light against the cool evening yard, with soft ambient occlusion under the furniture. ${negation('isometric', grid)}`,
  },
  {
    request: 'a wizard\'s library',
    setting: 'tower',
    perspective: 'indoor',
    scale: 'large',
    collection: EXAMPLE_COLLECTION_LINES,
    prompt:
      `${ISOMETRIC_OPENING} a ruined tundra tower, centred on its wizard's library. ${DIORAMA_BASE} The block's ` +
      `top surface is ${exampleFrame(grid, 28, 21, 'tiles')}. ` +
      exampleGrid(grid, DIORAMA_GRID_EXAMPLE('pale cream', 'the floors and the courtyard')) +
      'The library, the adjoining stair hall, and the tower\'s curved outer wall are cut away, roofs removed and ' +
      'near walls cut low, beside one small courtyard. The library stays the focus: tall bookshelves line its north ' +
      'and west walls, one reading table stands in the center, and one lectern faces it. One stair leads from the ' +
      `hall down to the courtyard. ${ISOMETRIC_STYLE_EXAMPLE} grained oak, frost-rimed stone, and pale blue banners. ` +
      'Pale silver moonlight falls over the tower, with deep blue shadows, a crisp cold night, and soft ambient ' +
      `occlusion under the furniture. ${negation('isometric', grid)}`,
  },
];

function joinExamples(examples: GenerationExample[]): string {
  return examples
    .map((ex) => [
      `Request: ${ex.request}`,
      ...(ex.setting ? [`Setting: ${ex.setting}`] : []),
      ...(ex.perspective ? [`Perspective: ${ex.perspective}.`] : []),
      `Scale: ${ex.scale}`,
      ...(ex.collection ?? []),
      `Prompt: ${ex.prompt}`,
    ].join('\n'))
    .join('\n\n');
}

// Region maps get their own example so the model never copies a tactical grid.
const REGION_EXAMPLES: GenerationExample[] = [
  {
    request: 'a map of the kingdom of Valdmoor, with its capital at the river mouth',
    scale: 'region',
    prompt:
      `${REGION_OPENING} the kingdom of Valdmoor, with the whole kingdom inside the frame and a margin of sea and ` +
      'neighboring land on every side. One mountain range runs along the northern border, its snow-capped ridges ' +
      'casting soft relief shadows. One wide river flows south from the mountains, joined by two tributaries, and ' +
      'meets the sea in a bay on the eastern coast. One dark green forest covers the western hills, and a patchwork ' +
      'of pale green and tan farmland fills the river valley. The capital is a single small, pale patch of cleared ' +
      'land at the river mouth. Rendered as a cloud-free satellite mosaic in natural color: deep ocean blue fades to ' +
      'turquoise shallows along the coast, and the finish is matte and photographic, with clear air and no haze. ' +
      REGION_NEGATION,
  },
];

// Joined once at module load: the examples never change at runtime.
// Keyed by view and framing, so a prompt never sees field and diorama examples
// mixed, and by grid, so a gridless map never copies a grid sentence.
type ExampleSet = 'top-down' | 'isometric-field' | 'isometric-diorama';
const EXAMPLE_BUILDERS: Record<ExampleSet, (grid: boolean) => GenerationExample[]> = {
  'top-down': topDownExamples,
  'isometric-field': isometricFieldExamples,
  'isometric-diorama': isometricDioramaExamples,
};
const GENERATION_EXAMPLES_TEXT = Object.fromEntries(
  Object.entries(EXAMPLE_BUILDERS).map(([set, build]) => [
    set,
    { grid: joinExamples(build(true)), plain: joinExamples(build(false)) },
  ]),
) as Record<ExampleSet, Record<GridKey, string>>;

function exampleSet(view: MapView, framing: MapFraming): ExampleSet {
  if (view === 'top-down') return 'top-down';
  return framing === 'diorama' ? 'isometric-diorama' : 'isometric-field';
}
const REGION_EXAMPLES_TEXT = joinExamples(REGION_EXAMPLES);

// The meta-prompt's detail guidance per view. Top-down describes the map as seen
// from far above; isometric only as zoomed out, so it doesn't pull toward top-down.
const DETAIL_GUIDANCE: Record<MapView, string> = {
  isometric:
    'The map is a zoomed-out view of the whole location, so describe it at the level of rooms, structures, terrain, ' +
    'paths, and large fixtures. Add only the few furniture pieces and fixtures that define this kind of place, such ' +
    'as an armory\'s weapon racks and armor stands, a library\'s bookshelves, or a tavern\'s bar and tables. Less ' +
    'is more: name few props, each with a purpose in the scene or the encounter, and never add decorative filler ' +
    'for flavor. Give the fixtures, walls, and floor real material texture, leave out clutter piles, and keep the ' +
    'floor open and the layout readable.',
  'top-down':
    'The map is seen from far above, so describe the location at the level of rooms, structures, terrain, paths, and ' +
    'large fixtures. Add only the few furniture pieces and fixtures that define this kind of place, such as an ' +
    'armory\'s weapon racks and armor stands, a library\'s bookshelves, or a tavern\'s bar and tables. Less is more: ' +
    'leave out decorative filler, incidental clutter, and fine surface texture.',
};

// What part 5 asks the text model to say about light, per view.
const LIGHTING_GUIDANCE: Record<MapView, string> = {
  isometric:
    'Name each light source inside the scene, its color, and the directional shadows it casts, set warm pools of ' +
    'light against cool shade, and keep soft ambient occlusion in corners and under objects, so walls, fixtures, and ' +
    'any changes in height read clearly.',
  'top-down':
    'Name the light and its color, and keep shadows light: just enough to mark walls, fixtures, and any changes in height.',
};

// Short names the meta-prompt uses when it refers to the view and grid.
const VIEW_NAMES: Record<MapView, { view: string; grid: string }> = {
  isometric: { view: 'isometric', grid: 'diamond-shaped isometric' },
  'top-down': { view: 'top-down', grid: 'square' },
};

// A map is only useful at the table if its parts sit where the story needs
// them, so the text model plans the encounter before describing it. On battle
// maps sizes are given in the view's own grid unit (tiles on isometric maps,
// squares on top-down); on gridless maps, in feet.
function encounterDesignStep(view: MapView, framing: MapFraming = 'field', grid = true): string {
  const { short } = GRID_UNITS[view];
  const one = short.replace(/s$/, '');
  const sizes = grid
    ? `- Size things for ${short} of about 5 feet: a tree trunk covers 1 ${one}, a wagon 2 by 4, a road 2 to 3 ` +
      `${short} wide, a doorway 1 ${one}.`
    : '- Size things in feet: a tree trunk is about 5 feet across, a wagon 10 by 20 feet, a road 10 to 15 feet ' +
      'wide, a doorway about 5 feet.';
  const scope = framing === 'diorama'
    ? 'The requested area gets the detail; the surroundings stay simple.'
    : 'Add only the rooms and areas the story needs.';
  return [
    'Before writing, plan the encounter silently. Do not write this plan out; use it to decide what the prompt describes.',
    '- Read the story: who is here, why, what the party is doing, and what happens next. An ambush on a forest road needs ' +
      'the road the party travels, hiding spots on both flanks within a short dash of it, something that blocks the road, ' +
      'and a place the attackers camp or fall back to.',
    '- Place everything where it would really be: a kitchen beside the dining hall, a camp near water, a guard post ' +
      'watching the entrance, a road that runs through the scene instead of ending in the middle of it.',
    sizes,
    '- Keep the play space open: at least half of the walkable area is open ground, and cover stands as separate ' +
      `pieces with room to move between them. ${scope}`,
    '- If the scale is too small for everything the story implies, describe the most important slice of the scene ' +
      'rather than cramming it all in.',
  ].join('\n');
}

// gemini-2.5-flash-image loses track of long prompts, so the paragraph has a budget.
// Isometric's camera opening and grid sentence run longer than top-down's, so its
// budget is wider; region maps are always top-down (see resolveMapView).
const LENGTH_RULES: Record<MapView, string> = {
  isometric:
    'Keep the paragraph to about 200 to 260 words before the closing exclusion text. Spend the words on the grid, ' +
    'the layout, and the named features, not on repeated adjectives.',
  'top-down':
    'Keep the paragraph to about 150 to 220 words before the closing exclusion text. Spend the words on the grid, ' +
    'the layout, and the named features, not on repeated adjectives.',
};

// The diorama and cutaway sentences add about 60 words to an isometric prompt.
const DIORAMA_LENGTH_RULE =
  'Keep the paragraph to about 240 to 300 words before the closing exclusion text. Spend the words on the grid, ' +
  'the requested area, and the named features, and keep the surroundings on the block brief.';

function lengthRule(view: MapView, framing: MapFraming, grid = true): string {
  const rule = framing === 'diorama' ? DIORAMA_LENGTH_RULE : LENGTH_RULES[view];
  // A gridless map spends no words on a grid.
  return grid
    ? rule
    : rule
      .replace('the grid, the layout, and', 'the layout and')
      .replace('the grid, the requested area, and', 'the requested area and');
}

// A clean overview needs fewer words than a battle map.
const REGION_LENGTH_RULE =
  'Keep the paragraph to about 120 to 180 words before the closing exclusion text. Spend the words on the shape of ' +
  'the land and its major features, not on repeated adjectives.';

// A collection's lighting and visual details describe torches, banners, and
// stonework at tactical scale, which have no place on a view from orbit.
// The region block carries only the World line (see regionCollectionBlock).
const REGION_COLLECTION_RULE =
  'If a Collection block follows the request, its World line shapes only the climate, land cover, and palette: a ' +
  'tundra collection gives a colder, paler land. The request\'s own land always stays the subject.';

function regionCollectionBlock(collection?: Collection): string[] {
  const world = collectionWorldPhrase(collection);
  if (!collection || !world) return [];
  return [`Collection "${collection.name}":`, `- World: this collection's maps are set in ${world}`];
}

/** Meta-prompt for region maps: a gridless satellite view of a continent, kingdom, or country. */
function buildRegionMetaPrompt(params: GenerationPromptParams): string {
  const { terrain, collection } = params;
  // A setting names a building or venue, which has no place on a view of a whole land.
  const requestLines = [`Request: ${params.userRequest.trim() || 'A fantasy kingdom.'}`];
  if (terrain) requestLines.push(`Dominant land type: ${terrain}`);
  requestLines.push(`Scale: region. ${REGION_SCALE_SENTENCE}`);

  return [
    'You write image prompts for Nano Banana, Google\'s image model, that produce overview maps of whole continents, ' +
      'kingdoms, and countries for a Dungeons & Dragons campaign, rendered as satellite imagery.',
    '',
    'Expand the request below into one image prompt. Keep its subject and every place it names.',
    '',
    'Describe only what is visible from orbit: the shape of the coastline, mountain ranges, major rivers and lakes, ' +
      'and zones of forest, grassland, desert, marsh, ice, and farmland, each with its color and texture. Never name a ' +
      'building, castle, tower, wall, bridge, ship, monument, or single tree. A fantasy feature the request names, ' +
      'such as a blighted waste, a crystal desert, or a great crater, becomes a zone of land color and texture at ' +
      'that scale, never an object.',
    '',
    'Settlements and roads. Show only the cities the request names, each as a small, pale, irregular patch of ' +
      'cleared land at its location; leave out villages and towns it does not name. Leave out roads unless the ' +
      'request names one, and then draw it as a single faint, thin line.',
    '',
    'Make the land believable: rivers run downhill from highlands to the sea or a lake, tributaries join a river ' +
      'rather than split from it except at a delta, the windward side of a mountain range is greener and its lee ' +
      'side drier, and cities sit on coasts, rivers, and mountain passes.',
    '',
    'Give a count for each major feature, such as "one mountain range" or "two major rivers", and add no range, ' +
      'river, lake, or sea the request does not name or clearly imply.',
    '',
    'Write one narrative paragraph of plain sentences, not a keyword list. Cover these parts in order:',
    `1. View. Open with "${REGION_OPENING}" followed by the land's name or description, with the whole land inside ` +
      'the frame and a margin of sea or neighboring land on every side.',
    '2. Geography. Where each mountain range, river, lake, and coast lies, in compass directions.',
    '3. Land cover. The zones of forest, grassland, desert, farmland, and other ground, with their colors and textures.',
    '4. Cities. Each named city as a small pale patch at its location. Skip this part if the request names none.',
    `5. Style. ${REGION_STYLE}`,
    `6. Exclusions. End the prompt with this text, copied exactly: ${REGION_NEGATION}`,
    '',
    'This is not a combat map: never describe a grid, squares, tiles, or a 5-foot scale.',
    '',
    REGION_LENGTH_RULE,
    '',
    REGION_COLLECTION_RULE,
    '',
    'Nano Banana prompting rules:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Example:',
    '',
    REGION_EXAMPLES_TEXT,
    '',
    'Now write the prompt for this request:',
    ...requestLines,
    ...regionCollectionBlock(collection),
    '',
    'Output only the prompt, no preamble, no quotes.',
  ].join('\n');
}

/**
 * Meta-prompt for the text model that expands a map request into a single
 * Nano Banana image prompt.
 */
export function buildGenerationMetaPrompt(params: GenerationPromptParams): string {
  const { terrain, setting, perspective, mapScale = DEFAULT_MAP_SCALE, collection } = params;
  const view = resolveMapView(params.mapView, mapScale);
  if (mapScale === 'region') return buildRegionMetaPrompt(params);
  const units = GRID_UNITS[view].count;
  const names = VIEW_NAMES[view];
  const framing = resolveMapFraming(view, params);
  const isDiorama = framing === 'diorama';
  const grid = params.battleMap ?? false;

  const requestLines = [`Request: ${describeSubject(params)}`];
  if (setting) requestLines.push(`Setting: ${setting}`);
  if (terrain) requestLines.push(`Terrain: ${terrain}`);
  if (perspective === 'indoor') {
    requestLines.push(isDiorama ? 'Perspective: indoor.' : `Perspective: indoor. ${INDOOR_SENTENCES[view]}`);
  } else if (perspective === 'outdoor') requestLines.push('Perspective: outdoor.');
  const place = isDiorama ? dioramaPlace(params) : null;
  if (isDiorama) {
    const dioramaLine = [...dioramaContextSentences(params), ...(place ? [placeRoomRule(place)] : [])];
    requestLines.push(`Diorama: ${dioramaLine.join(' ')}`);
  }
  const focus = place ? placeFocusSentence(place) : DIORAMA_FOCUS_SENTENCE;
  requestLines.push(`Scale: ${mapScale}. ${scaleSentence(view, mapScale, framing, focus, grid)}`);

  // With a place, the opening names the place before the requested room.
  const openingSubject = place
    ? 'the place and then the requested room or area, as the Diorama line says'
    : 'the subject';
  const viewPart = isDiorama
    ? `View, diorama, and scale. Open with "${CAMERA_OPENINGS[view]}" followed by ${openingSubject}, then write this ` +
      `diorama sentence nearly word for word: "${DIORAMA_BASE}" Then state the scale given in the request, ` +
      `including ${grid ? `how many ${units} the block's top surface is` : 'the size of the block\'s top surface in feet'}. Never zoom in on a single feature or let the image ` +
      'edge cut through the block.'
    : `View and scale. Open with "${CAMERA_OPENINGS[view]}" followed by the subject, then state the scale given in the request, ` +
      `including ${grid ? `how many ${units} the frame shows` : 'the size of the area the frame shows, in feet'}. Frame the whole location with open margin on every side; ` +
      'never zoom in on a single feature or let the image edge cut through walls or rooms.';
  const gridPlacement = isDiorama ? 'right after the view and the diorama sentence' : 'right after the view';
  const noNewFeatures = isDiorama
    ? 'and never add a road, river, or other major feature the request does not name beyond the simple ' +
      'surroundings a diorama shows. Describe the requested area first and in the most detail, then what surrounds ' +
      'it on the block, as the request\'s Diorama line describes.' +
      (place
        ? ' The requested room\'s fixtures stay inside that room, and the rest of the place keeps its own ordinary ' +
          'purposes.'
        : '')
    : 'and never add a road, river, path, room, or other major feature the request does not name.';
  const roomBoundary = isDiorama
    ? 'The requested area keeps to its own walls: do not invent extra rooms, corridors, or partitions inside it. The ' +
      'adjoining rooms and grounds on the block are context, kept simple and drawn in the same style.'
    : 'A single room keeps to its own walls: do not invent extra rooms, corridors, or partitions the request does ' +
      'not mention.';
  const keepLine = !grid
    ? `Keep the ${names.view} camera opening${isDiorama ? ', the diorama sentence,' : ''} and the closing ` +
      'exclusion text with its camera constraint.'
    : isDiorama
      ? `Keep the ${names.view} camera opening, the diorama sentence, the ${names.grid} grid right after them, and ` +
        'the closing exclusion text with its camera constraint.'
      : `Keep the ${names.view} camera opening, the ${names.grid} grid right after it, and the closing exclusion ` +
        'text with its camera constraint.';

  // Only battle maps carry the grid part; the parts are numbered after the list is built.
  const gridPart = grid
    ? `Grid overlay. This is the most important sentence in the prompt, so it comes ${gridPlacement}. Describe ${gridRuleDescription(view, framing)}. ` +
      'Choose the line color by the floor\'s seams first, then by the ground\'s brightness: over wood planks, whose seams ' +
      'are dark, use pale cream or white lines; over pale stone use dark lines; otherwise dark lines on light ground and ' +
      'light lines on dark ground. The lines are heavier than the floor\'s own seams and mortar lines, and each plank is ' +
      'narrower than a grid cell, so the grid reads as an overlay. ' +
      'Never describe the grid as faint, subtle, soft, or barely visible.'
    : null;
  const parts = [
    viewPart,
    gridPart,
    'Subject. The location, its major features, and the furniture and fixtures that define it, each drawn as a clear shape ' +
      `${grid ? `covering whole ${units}` : 'at its real size'}, with their main materials (for example "a flagstone floor" or "a timber bar"). ` +
      'Name every feature the request mentions in the request\'s own words: if it says "lockers", write "lockers", never a ' +
      'similar object such as chests. Say where each one stands, for example "weapon racks line the north and east walls, a row of iron lockers stands ' +
      'along the south wall, and armor stands flank the door". Give a count for every singular feature, such as ' +
      `"a single road", "one fallen oak", or "two lean-to shelters", ${noNewFeatures} When the request names one ` +
      'road, river, or path, say that no other roads or paths cross the map.',
    'Layout and paths. Match the layout to the location. A single room stays on one floor level unless the request says ' +
      'otherwise. Use height changes only where the place has them, such as sloping terrain, multi-level buildings, pits, or ' +
      'balconies. Every stair, ramp, or ladder connects two areas drawn on the map; none leads off the map or into a wall. ' +
      'At least half of the walkable area (the area inside the walls, on interior maps) is open ground. Place cover such ' +
      'as trees, boulders, bushes, and crates as separate pieces with gaps between them. On outdoor maps, never line the ' +
      'map edges with solid walls of foliage or rock; on interior and cave maps, walls stand where the structure\'s walls ' +
      `are. ${roomBoundary} Say where the open ground is.`,
    `Style and lighting. Describe this rendering style, keeping every quality it names: ${STYLES[view]} ` +
      LIGHTING_GUIDANCE[view],
    `Exclusions. End the prompt with this text, copied exactly: ${negation(view, grid)}`,
  ]
    .filter((part): part is string => part !== null)
    .map((part, i) => `${i + 1}. ${part}`);

  return [
    `You write image prompts for Nano Banana, Google's image model, that produce ${names.view} Dungeons & Dragons ${grid ? 'tactical battle maps' : 'maps'}.`,
    '',
    'Expand the request below into one image prompt. The request is the foundation: keep its subject and every feature it names, ' +
      `and never replace or drop the subject. ${DETAIL_GUIDANCE[view]}`,
    '',
    encounterDesignStep(view, framing, grid),
    '',
    'Write one narrative paragraph of plain sentences, not a keyword list. Cover these parts in order:',
    ...parts,
    '',
    lengthRule(view, framing, grid),
    '',
    'The map is empty of people and creatures, so avoid words that imply a crowd, such as "bustling", "crowded", or "occupied".',
    '',
    COLLECTION_RULE,
    '',
    'Nano Banana prompting rules:',
    NB_PROMPTING_BEST_PRACTICES,
    '',
    'Examples:',
    '',
    GENERATION_EXAMPLES_TEXT[exampleSet(view, framing)][gridKey(grid)],
    '',
    'Now write the prompt for this request:',
    ...requestLines,
    ...collectionBlock(collection),
    '',
    `Output only the prompt, no preamble, no quotes. ${keepLine}`,
  ].join('\n');
}

/**
 * Deterministic Nano Banana prompt used when the meta-prompt expansion fails.
 * Like the expanded prompts, a battle map's grid clause comes right after the view and scale.
 */
export function buildFallbackGenerationPrompt(params: GenerationPromptParams): string {
  const { userRequest, terrain, setting, perspective, mapScale, collection } = params;
  const view = resolveMapView(params.mapView, mapScale);
  const isRegion = mapScale === 'region';
  const opening = isRegion ? REGION_OPENING : CAMERA_OPENINGS[view];
  const framing = resolveMapFraming(view, params);
  const isDiorama = framing === 'diorama';
  // Region maps never carry a grid.
  const grid = !isRegion && (params.battleMap ?? false);

  // The map name is left out on purpose: quoted names tend to be rendered as text.
  // A setting names a venue, which has no place on a region map.
  const mapType = isRegion ? terrain : (setting ?? terrain);
  // "Map" on a region invites cartographic symbols, so a region is just a land,
  // and the request itself names it in the opening.
  const kind = isRegion ? 'land' : grid ? 'battle map' : 'map';
  const regionSubject = isRegion ? userRequest.trim().replace(/[.\s]+$/, '') : '';
  const sentences = [
    regionSubject
      ? `${opening} ${regionSubject}.`
      : mapType ? `${opening} a fantasy ${mapType} ${kind}.` : `${opening} a fantasy ${kind}.`,
  ];
  if (isDiorama) sentences.push(DIORAMA_BASE);
  const place = isDiorama ? dioramaPlace(params) : null;
  sentences.push(scaleSentence(view, mapScale, framing, place ? placeFocusSentence(place) : DIORAMA_FOCUS_SENTENCE, grid));
  if (grid) sentences.push(gridClause(view, framing));
  // A region's request is already in the opening, and the terrain and setting
  // descriptions describe battle-map scenes.
  if (!isRegion && (userRequest.trim() || mapType)) {
    sentences.push(`${describeSubject(params).replace(/[.\s]+$/, '')}.`);
  }
  if (isRegion) {
    if (collection?.terrain) sentences.push(`The land's climate and palette match ${collection.terrain} terrain.`);
  } else {
    const world = collectionWorldPhrase(collection);
    if (world) sentences.push(`The surroundings match a world set in ${world}.`);
  }
  if (isDiorama) {
    sentences.push(...dioramaContextSentences(params));
    if (place) sentences.push(placeAreasSentence(place));
  } else if (!isRegion && perspective === 'indoor') sentences.push(INDOOR_SENTENCES[view]);
  if (!isRegion) {
    sentences.push(
      'At least half the map is open, walkable ground, cover stands as separate pieces with room to move between ' +
        'them, and wherever the location has more than one level, every stair, ramp, or ladder connects two areas ' +
        'drawn on the map, never leading off the map or into a wall.',
    );
  }
  sentences.push(isRegion ? REGION_STYLE : STYLES[view]);
  // A collection's light sources and visual details are too small to see from orbit.
  if (!isRegion && collection?.ambiance) {
    sentences.push(`The light and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}.`);
  }
  if (!isRegion && collection?.visualDetails) {
    sentences.push(`Include these visual details: ${collection.visualDetails}.`);
  }
  sentences.push(isRegion ? REGION_NEGATION : negation(view, grid));

  return sentences.join(' ');
}
