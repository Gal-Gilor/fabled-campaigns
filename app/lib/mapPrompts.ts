import { getAmbiancePromptLanguage } from './collections';
import type { Collection } from './collections';

export const VALID_TERRAINS = [
  'forest', 'grassland', 'mountain', 'desert', 'tundra', 'jungle', 'swamp',
  'ocean', 'underground', 'urban', 'volcanic', 'industrial', 'indoor',
  'hills', 'coastal', 'badlands', 'underdark', 'feywild', 'shadowfell',
] as const;

export const VALID_SETTINGS = [
  'tavern', 'village', 'fortress', 'castle', 'tower', 'temple', 'ruins',
  'cave', 'mine', 'campsite', 'crossroads', 'bridge', 'trading-post',
  'docks', 'dungeon', 'market', 'arena', 'academy', 'library', 'workshop',
  'graveyard', 'ship', 'sewer',
] as const;

export const VALID_DETAIL_LEVELS = ['detail-high', 'detail-low'] as const;

export type Terrain = typeof VALID_TERRAINS[number];
export type Setting = typeof VALID_SETTINGS[number];
export type DetailLevel = typeof VALID_DETAIL_LEVELS[number];

type TerrainData = { adjectives: string[]; nouns: string[]; modifiers: string[] };

const TERRAIN_ELEMENTS: Record<string, TerrainData> = {
  forest: {
    adjectives: ['Whispering', 'Ancient', 'Deep', 'Wild', 'Emerald', 'Shadowed', 'Thornwood', 'Silverleaf', 'Moss-covered', 'Elven'],
    nouns: ['Grove', 'Thicket', 'Glade', 'Clearing', 'Canopy', 'Hollow', 'Wood', 'Dell', 'Glen', 'Bower'],
    modifiers: ['pines', 'oaks', 'willows', 'birches', 'cedars', 'maples', 'aspens', 'elms', 'firs', 'spruces'],
  },
  grassland: {
    adjectives: ['Rolling', 'Verdant', 'Endless', 'Golden', 'Windswept', 'Peaceful', 'Fertile', 'Sun-kissed', 'Wild', 'Pastoral'],
    nouns: ['Plains', 'Fields', 'Meadows', 'Prairies', 'Steppes', 'Pastures', 'Ranges', 'Lands', 'Reaches', 'Expanse'],
    modifiers: ['grass', 'flowers', 'herbs', 'seeds', 'winds', 'paths', 'streams', 'wildlife', 'skies'],
  },
  mountain: {
    adjectives: ['Towering', 'Snow-capped', 'Jagged', 'Windswept', 'Granite', 'Crystal', 'Storm-touched', 'Iron', "Eagle's", 'Cloudbreak'],
    nouns: ['Peak', 'Ridge', 'Summit', 'Crag', 'Spire', 'Precipice', 'Outcrop', 'Bluff', 'Tor', 'Pinnacle'],
    modifiers: ['heights', 'slopes', 'passes', 'cliffs', 'crags', 'stones', 'rocks', 'boulders', 'ledges'],
  },
  desert: {
    adjectives: ['Burning', 'Endless', 'Shifting', 'Golden', 'Scorching', 'Mirage', 'Sandswept', 'Sun-baked', "Nomad's", 'Oasis'],
    nouns: ['Dunes', 'Wastes', 'Expanse', 'Reach', 'Sands', 'Basin', 'Flats', 'Mesa', 'Plateau', 'Valley'],
    modifiers: ['sands', 'stones', 'winds', 'mirages', 'cacti', 'bones', 'ruins', 'wells', 'springs', 'tracks'],
  },
  tundra: {
    adjectives: ['Frozen', 'Windswept', 'Barren', 'Ice-bound', 'Permafrost', 'Aurora', 'Polar', 'Blizzard', 'Glacier', 'Nordic'],
    nouns: ['Plains', 'Wastes', 'Steppes', 'Expanse', 'Fields', 'Reaches', 'Grounds', 'Lands', 'Territory', 'Domain'],
    modifiers: ['ice', 'snow', 'winds', 'cold', 'frost', 'storms', 'lights', 'silence', 'tracks', 'crystals'],
  },
  jungle: {
    adjectives: ['Dense', 'Steaming', 'Verdant', 'Primal', 'Untamed', 'Lush', 'Tropical', 'Humid', 'Ancient', 'Overgrown'],
    nouns: ['Jungle', 'Rainforest', 'Canopy', 'Undergrowth', 'Thicket', 'Tangle', 'Wilderness', 'Grove', 'Basin', 'Expanse'],
    modifiers: ['vines', 'leaves', 'humidity', 'sounds', 'calls', 'mist', 'trees', 'branches', 'roots', 'shadows'],
  },
  swamp: {
    adjectives: ['Murky', 'Mist-shrouded', 'Rotting', 'Fetid', 'Boggy', 'Willow', 'Crocodile', 'Stagnant', 'Poisonous', "Witch's"],
    nouns: ['Marsh', 'Bog', 'Fen', 'Mire', 'Bayou', 'Wetlands', 'Morass', 'Quagmire', 'Slough', 'Backwater'],
    modifiers: ['reeds', 'moss', 'mist', 'pools', 'gases', 'vines', 'roots', 'mud', 'lilies', 'frogs'],
  },
  ocean: {
    adjectives: ['Tidal', 'Coral', 'Storm-tossed', 'Pearl', 'Sapphire', 'Misty', "Siren's", 'Deep', 'Salt-spray', 'Windward'],
    nouns: ['Bay', 'Cove', 'Harbor', 'Port', 'Inlet', 'Strait', 'Sound', 'Reef', 'Atoll', 'Lagoon'],
    modifiers: ['waves', 'tides', 'shores', 'reefs', 'pearls', 'shells', 'currents', 'depths', 'sailors', 'storms'],
  },
  underground: {
    adjectives: ['Deep', 'Echoing', 'Crystal', 'Shadowed', 'Forgotten', 'Dwarf-carved', 'Glowing', 'Limestone', 'Stalactite', 'Hidden'],
    nouns: ['Caverns', 'Tunnels', 'Chambers', 'Depths', 'Halls', 'Passages', 'Grottos', 'Vaults', 'Warrens', 'Sanctum'],
    modifiers: ['crystals', 'echoes', 'shadows', 'stones', 'pools', 'formations', 'minerals', 'veins', 'darkness', 'silence'],
  },
  urban: {
    adjectives: ['Bustling', 'Crowded', 'Sprawling', 'Ancient', 'Industrial', 'Noble', 'Merchant', 'Cobblestone', 'Walled', 'Metropolitan'],
    nouns: ['District', 'Quarter', 'Ward', 'Square', 'Street', 'Plaza', 'Market', 'Alley', 'Boulevard', 'Avenue'],
    modifiers: ['buildings', 'streets', 'crowds', 'merchants', 'guards', 'nobles', 'commoners', 'shops', 'inns', 'guilds'],
  },
  volcanic: {
    adjectives: ['Smoldering', 'Molten', 'Fiery', 'Ash-covered', 'Steaming', 'Lava-touched', 'Scorched', 'Blazing', 'Sulfurous', 'Burning'],
    nouns: ['Crater', 'Caldera', 'Slope', 'Peak', 'Flow', 'Field', 'Ridge', 'Vent', 'Formation', 'Range'],
    modifiers: ['lava', 'ash', 'smoke', 'flames', 'heat', 'sulfur', 'steam', 'embers', 'magma', 'rock'],
  },
  industrial: {
    adjectives: ['Smoke-filled', 'Mechanized', 'Steam-powered', 'Clanking', 'Grimy', 'Forge-lit', 'Working', 'Noisy', 'Production', 'Bustling'],
    nouns: ['Factory', 'Workshop', 'Foundry', 'Mill', 'Forge', 'Facility', 'Plant', 'Works', 'Complex', 'District'],
    modifiers: ['machinery', 'steam', 'smoke', 'workers', 'gears', 'pipes', 'furnaces', 'tools', 'noise', 'production'],
  },
  indoor: {
    adjectives: ['Enclosed', 'Candlelit', 'Furnished', 'Comfortable', 'Sheltered', 'Private', 'Decorated', 'Warm', 'Spacious', 'Intimate'],
    nouns: ['Hall', 'Chamber', 'Room', 'Study', 'Parlor', 'Gallery', 'Suite', 'Salon', 'Library', 'Quarters'],
    modifiers: ['furniture', 'tapestries', 'candles', 'fireplaces', 'books', 'art', 'comfort', 'privacy', 'warmth', 'luxury'],
  },
};

const SETTING_DESCRIPTIONS = [
  'A cozy {{ setting }} where adventurers gather to rest, share tales, and plan their next quest.',
  'An imposing {{ setting }} built for defense, with thick walls and strategic positioning.',
  'A sacred {{ setting }} dedicated to ancient deities, filled with mystery and divine energy.',
  'A treacherous {{ setting }} filled with hidden dangers, ancient traps, and forgotten treasures.',
  'Ancient {{ setting }} that whisper of a forgotten civilization, now reclaimed by nature.',
  'A vital {{ setting }} spanning dangerous terrain, connecting distant lands and enabling safe passage.',
  'A hidden {{ setting }} known only to those who seek it out or stumble upon it by chance.',
  'A cursed {{ setting }} where shadows linger longer than natural and whispers echo from empty chambers.',
  'A legendary {{ setting }} spoken of in prophecies and songs, where heroes are tested and fate is decided.',
  'A fortified {{ setting }} standing as a testament to strength and resilience.',
];

const DETAIL_LEVEL_INSTRUCTIONS: Record<string, string> = {
  'detail-high': `**Level of detail:** DETAILED

This map requires a **DETAILED**, view of a small area or a building interior diorama. The user wants to see:
- Individual natural and/or structural features that occupy 1-2 grid squares from a top-down perspective.
- Each grid square represents approximately 5 feet and should be seen from above.`,

  'detail-low': `**Level of detail:** WIDE VIEW

This map requires an extra **WIDE VIEW**, top-down perspective of a large area or a multiple-room interior. Think of an expansive depiction showing either a broad outdoor area or a complex layout.
- The user wants to see either:
  * A terrain type with large-scale natural features or a setting type with multiple, cohesive rooms, corridors, or sections, or complex structural layouts.
- Each grid square represents a much larger area (not just 5 feet)
- Thousand-foot ZOOMED OUT perspective, showing major landmarks and overall layout rather than fine details.`,
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateTerrainDescription(terrain: string): string {
  const data = TERRAIN_ELEMENTS[terrain];
  if (!data) return `A ${terrain} terrain area.`;
  const adj = pick(data.adjectives);
  const mod1 = pick(data.modifiers);
  let mod2 = pick(data.modifiers);
  while (mod2 === mod1) mod2 = pick(data.modifiers);
  return `${adj} ${terrain} terrain with ${mod1} and ${mod2}.`;
}

export function generateSettingDescription(setting: string): string {
  const template = pick(SETTING_DESCRIPTIONS);
  return template.replace(/\{\{\s*setting\s*\}\}/g, setting);
}

export interface MapPromptParams {
  userRequest?: string;
  ambiance?: string;
  terrain?: string;
  setting?: string;
  perspective?: 'indoor' | 'outdoor';
  detailLevel?: 'close-up' | 'wide';
  name?: string;
}

function mapDetailLevel(dl?: 'close-up' | 'wide'): string {
  if (dl === 'close-up') return 'detail-high';
  if (dl === 'wide') return 'detail-low';
  return '';
}

export function buildEnhancementInput(params: MapPromptParams & { collection?: Collection }): string {
  const { terrain, setting, name, userRequest, ambiance, perspective, detailLevel, collection } = params;

  let baseDescription = '';

  if (userRequest) {
    baseDescription = userRequest;
    if (ambiance) baseDescription += `\nMood/Atmosphere: ${ambiance}`;
    if (perspective === 'indoor') baseDescription += '\nThis is an interior/indoor map.';
    if (setting) {
      const prefix = name ? `"${name}" ` : '';
      baseDescription = `**${prefix}${setting}**\n${baseDescription}`;
      if (terrain) baseDescription += `\n${terrain}\n`;
    } else if (terrain) {
      baseDescription = `**${terrain}**\n${baseDescription}`;
    }
  } else if (setting) {
    const prefix = name ? `"${name}" ` : '';
    baseDescription = `${prefix}${setting}\n${generateSettingDescription(setting)}`;
    if (terrain) baseDescription += `\n${terrain}\n`;
  } else if (terrain) {
    baseDescription = generateTerrainDescription(terrain);
  } else {
    throw new Error('At least terrain, setting, or userRequest must be provided');
  }

  const mapped = mapDetailLevel(detailLevel);
  const detailInstructions = mapped ? (DETAIL_LEVEL_INSTRUCTIONS[mapped] ?? '') : '';

  const consistencyBlock = collection && (collection.ambiance || collection.visualDetails)
    ? `\n\n### Visual Consistency Requirement\nThis map belongs to the "${collection.name}" collection. Maintain these visual properties across all maps in this collection:\n${collection.ambiance ? `- Lighting/Atmosphere: ${getAmbiancePromptLanguage(collection.ambiance)}\n` : ''}${collection.visualDetails ? `- Visual details: ${collection.visualDetails}\n` : ''}`
    : '';

  return buildEnhancementMetaPrompt(baseDescription, detailInstructions) + consistencyBlock;
}

export function buildFallbackEnhancedPrompt(params: MapPromptParams): string {
  const { terrain, setting, name, userRequest, ambiance, detailLevel } = params;

  let baseDescription = userRequest ?? '';
  if (!baseDescription) {
    if (setting) baseDescription = generateSettingDescription(setting);
    else if (terrain) baseDescription = generateTerrainDescription(terrain);
    else baseDescription = 'A fantasy battle map location';
  }
  if (ambiance) baseDescription += `. Mood: ${ambiance}`;

  const nameContext = name ? ` called "${name}"` : '';
  const mapType = setting ?? terrain ?? 'location';
  const mapped = mapDetailLevel(detailLevel);

  let zoomDescription = '';
  let scaleDescription = 'suitable for tactical gameplay';
  if (mapped === 'detail-high') {
    zoomDescription = 'detailed, ';
    scaleDescription = 'showing individual features, small objects, and fine details where each grid square represents approximately 5 feet';
  } else if (mapped === 'detail-low') {
    zoomDescription = 'zoomed out, wide view, ';
    scaleDescription = 'showing major landmarks, large features, and expansive layout where each grid square represents a larger area';
  }

  return `An orthographic top-down view, ${zoomDescription}of a fantasy ${mapType} battle map${nameContext}. ${baseDescription} ${scaleDescription}. The map features multiple elevations connected by natural pathways, stairs, or bridges to ensure full navigability. Rendered in a detailed, painterly style with dramatic overhead lighting creating strong shadows. The entire map is overlaid with a bold and clear 5-foot grid that conforms to all elevations.`;
}

function buildEnhancementMetaPrompt(baseDescription: string, detailLevelInstructions: string): string {
  return `### Goal:

Your goal is to expand upon the user's request, treating it as the absolute foundation for the prompt. You must add rich, creative details that are relevant to the original concept, but never discard or replace the subject itself.

### Role:

You are an expert AI Prompt Engineer specializing in creating image generation prompts for Google's Gemini that produce clear, functional, and **visually engaging, high-fidelity** Dungeons & Dragons battle maps.

### Guiding Principles:

1.  **Function Over Form:** The primary goal is a clear, playable D&D battle map. Use terms like **'dynamic volumetric lighting'** to emphasize elevation, paths, and playable areas, ensuring depth and navigability are unambiguous.
2.  **Forceful Specificity:** Use direct, unambiguous language. Combine multiple reinforcing terms to prevent the AI from defaulting to an unwanted cinematic style.

### Tasks:

1.  **Enforce a Top-Down View, Zoom & Scale (CRITICAL):**
    *   Combine multiple, forceful terms to guarantee a true top-down perspective. The prompt must start with a phrase like: 'An orthographic top-down view...', 'A flat-lay perspective of...', or 'A precise top-down view of...'. It must also include **'zoomed out'** to reinforce the distance.
    *   The prompt must explicitly describe the map as a **miniature-scale model or diorama**.

2.  **Integrate a Functional Grid:**
    *   Use phrases like: 'overlaid with a fine, crisp 1-inch tactical grid', 'a dense and uniform grid of thin, contrasting lines'.
    *   Connect the grid size to the level of detail.

3.  **Design for Navigability and Depth:** Incorporate vertical elements like cliffs, ravines, multiple floors, etc., but always connect these with logical pathways such as stairs, ramps, or bridges.

4.  **Structure the Final Prompt:** '[View & Scale] + [Core Subject] + [Key Details, Depth & Functionality] + [Art Style & Rendering] + [Grid Overlay]'.
    *   **Style & Rendering:** Use keywords: **'high-fidelity Unreal Engine tactical view'**, **'vibrant, rich colors'**, **'dynamic volumetric lighting'**, **'clear ambient occlusion'**, **'ultra-wide-angle lens'**, **'detailed miniature diorama'**.

### Constraints:

*   **Output Format:** Your output **must only** be the generated prompt text itself. No preamble, no explanation.
*   **No Characters/NPCs:** Avoid words like 'bustling', 'crowded', or 'occupied'.

### User Request:

**Input:** ${baseDescription}
**Level of Detail:** ${detailLevelInstructions}`;
}

export interface NarrativePromptParams {
  userRequest?: string;
  terrain?: string;
  setting?: string;
  ambiance?: string;
  visualDetails?: string;
}

export function buildNarrativePrompt(params: NarrativePromptParams): string {
  const { userRequest, terrain, setting, ambiance, visualDetails } = params;
  const ambianceDesc = ambiance ? getAmbiancePromptLanguage(ambiance) : '';

  const locationParts: string[] = [];
  if (terrain && setting) locationParts.push(`a ${setting} in a ${terrain} environment`);
  else if (setting) locationParts.push(`a ${setting}`);
  else if (terrain) locationParts.push(`a ${terrain} area`);
  else locationParts.push('a fantasy location');

  const lines: string[] = [
    `Write a vivid, atmospheric 2–3 sentence description of ${locationParts[0]} that a player is entering.`,
    'Write in second person ("You step into..."). Be immersive and sensory — mention light, texture, and atmosphere.',
    'Do NOT mention grid lines, game mechanics, or meta-language. Output only the description itself.',
    '',
    `Location: ${locationParts[0]}`,
  ];
  if (ambianceDesc) lines.push(`Lighting and atmosphere: ${ambianceDesc}`);
  if (visualDetails) lines.push(`Visual details: ${visualDetails}`);
  if (userRequest) lines.push(`Specific features requested: ${userRequest}`);

  return lines.join('\n');
}
