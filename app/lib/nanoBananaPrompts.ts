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
  detailLevel?: 'close-up' | 'wide';
  name?: string;
  collection?: Collection;
}

const CAMERA_OPENING = 'A top-down orthographic view, straight down, of';

const GRID_CLAUSE =
  'A clearly visible, uniform square tactical grid of thin, crisp lines, in a color that contrasts with the ground beneath it, ' +
  'covers the entire playable area edge to edge and runs unbroken across every floor, slope, bridge, and elevation.';

const SCALE_SENTENCES: Record<'close-up' | 'wide' | 'default', string> = {
  'close-up':
    'This is a close-up map of a small area: each grid square covers roughly 5 feet, so individual props and features ' +
    'are distinct and each fills one or two squares.',
  wide:
    'This is a wide map of a large area: each grid square covers far more than 5 feet, so the map shows major landmarks, ' +
    'the overall layout, and the routes between them rather than small props.',
  default: 'Each grid square covers roughly 5 feet, at a scale suited to tactical combat.',
};

const INDOOR_SENTENCE =
  'This is an interior map: show the floor plan with its walls and doorways as if the roof were removed.';

function scaleSentence(detailLevel?: 'close-up' | 'wide'): string {
  return SCALE_SENTENCES[detailLevel ?? 'default'];
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
    scale: 'close-up',
    prompt:
      `${CAMERA_OPENING} the ground floor of a fantasy tavern, where each grid square covers roughly 5 feet. ` +
      'The common room holds worn oak tables, three-legged stools, and a long bar of dark-stained planks, with a wide fieldstone ' +
      'fireplace along the north wall and embers glowing in its hearth. A sunken fighting pit with a sand floor sits one level ' +
      'below the main floor, reached by two short flights of stone steps, and a timber balcony along the east wall is reached by ' +
      'a staircase from the common room. Rendered as a painterly fantasy battle map with hand-painted wood grain and stone ' +
      'texture, warm firelight from the hearth, and soft shadows that mark where the floor drops into the pit. A clearly visible, ' +
      'uniform square grid of thin, crisp black lines covers the entire playable area edge to edge, running unbroken across the ' +
      `pit floor, the stairs, and the balcony. ${NANO_BANANA_NEGATION}`,
  },
  {
    request: 'a forest clearing map',
    scale: 'wide',
    prompt:
      `${CAMERA_OPENING} a large forest clearing, where each grid square covers far more than 5 feet and the map shows the ` +
      'full layout of the area. A ring of moss-covered standing stones sits at the center of a grassy clearing bordered by the ' +
      'dense canopy of old oaks and pines. A deep ravine with a rocky stream at its bottom cuts across the eastern side, a ' +
      'massive fallen log spans it as a bridge, and a narrow dirt trail winds down the southern slope to the stream bank. ' +
      'Rendered as a painterly fantasy battle map with hand-painted foliage, dappled late-afternoon sunlight, and deep shadows ' +
      'along the ravine walls that show its depth. A clearly visible, uniform square grid of thin, crisp pale cream lines ' +
      'covers the entire playable area edge to edge, continuing across the canopy, the ravine floor, and the log bridge. ' +
      NANO_BANANA_NEGATION,
  },
  {
    request: 'a dungeon maze',
    scale: 'wide',
    prompt:
      `${CAMERA_OPENING} a sprawling dungeon maze, where each grid square covers far more than 5 feet and the map shows the ` +
      'full network of passages. Narrow corridors of damp, rough-cut limestone twist between small chambers, several of them ' +
      'ending in dead ends. A wide chasm splits the center of the maze and is crossed by a single rope bridge of weathered ' +
      'planks, and worn stone stairs step down from the northern passages to a lower level of chambers. Rendered as a painterly ' +
      'fantasy battle map with cold blue light from wall sconces, dark wet stone textures, and pitch-black shadow inside the ' +
      'chasm. A clearly visible, uniform square grid of thin, crisp white lines covers the entire playable area edge to edge, ' +
      `running across the corridors, the stairs, and the bridge. ${NANO_BANANA_NEGATION}`,
  },
];

/**
 * Meta-prompt for the text model that expands a map request into a single
 * Nano Banana image prompt.
 */
export function buildGenerationMetaPrompt(params: GenerationPromptParams): string {
  const { ambiance, terrain, setting, perspective, detailLevel, name, collection } = params;

  const requestLines = [`Request: ${describeSubject(params)}`];
  if (name) requestLines.push(`Map name, for context only (do not render it as text): ${name}`);
  if (setting) requestLines.push(`Setting: ${setting}`);
  if (terrain) requestLines.push(`Terrain: ${terrain}`);
  if (perspective === 'indoor') requestLines.push(`Perspective: indoor. ${INDOOR_SENTENCE}`);
  else if (perspective === 'outdoor') requestLines.push('Perspective: outdoor.');
  if (ambiance) requestLines.push(`Mood: ${ambiance}`);
  requestLines.push(`Scale: ${detailLevel ?? 'standard'}. ${scaleSentence(detailLevel)}`);

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
    'Expand the request below into one image prompt. The request is the foundation: keep its subject and every feature it names, ' +
      'and add concrete details that fit it. Never replace or drop the subject.',
    '',
    'Write one narrative paragraph of plain sentences, not a keyword list. Cover these parts in order:',
    `1. View and scale. Open with "${CAMERA_OPENING}" followed by the subject, then state the scale given in the request.`,
    '2. Subject. The location and its main features, with specific materials and textures ' +
      '(for example "cracked flagstones with moss in the joints" rather than "stone floor").',
    '3. Layout, elevation, and paths. Give the map more than one height level, such as raised platforms, pits, cliffs, or upper floors, ' +
      'and connect every level with stairs, ramps, ladders, bridges, or slopes so every area is reachable on foot. ' +
      'Leave open ground for movement and combat.',
    '4. Style and lighting. A painterly fantasy battle map with hand-painted textures. Name the light source, its color, ' +
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
  const { userRequest, ambiance, terrain, setting, perspective, detailLevel, collection } = params;

  // The map name is left out on purpose: quoted names tend to be rendered as text.
  const mapType = setting ?? terrain;
  const sentences = [
    mapType ? `${CAMERA_OPENING} a fantasy ${mapType} battle map.` : `${CAMERA_OPENING} a fantasy battle map.`,
  ];
  if (userRequest.trim() || mapType) {
    sentences.push(`${describeSubject(params).replace(/[.\s]+$/, '')}.`);
  }
  sentences.push(scaleSentence(detailLevel));
  if (perspective === 'indoor') sentences.push(INDOOR_SENTENCE);
  if (ambiance) sentences.push(`The mood is ${ambiance}.`);
  sentences.push(
    'The map has several elevations connected by stairs, ramps, bridges, or slopes, so every area is reachable on foot, ' +
      'with open ground left for movement.',
    'Rendered in a painterly style with hand-painted textures and overhead light that casts crisp shadows ' +
      'showing changes in height.',
  );
  if (collection?.ambiance) {
    sentences.push(`The light and atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}.`);
  }
  if (collection?.visualDetails) sentences.push(`Include these visual details: ${collection.visualDetails}.`);
  sentences.push(GRID_CLAUSE, NANO_BANANA_NEGATION);

  return sentences.join(' ');
}
