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

export type Terrain = typeof VALID_TERRAINS[number];
export type Setting = typeof VALID_SETTINGS[number];

type TerrainData = { adjectives: string[]; modifiers: string[] };

const TERRAIN_ELEMENTS: Record<string, TerrainData> = {
  forest: {
    adjectives: ['Whispering', 'Ancient', 'Deep', 'Wild', 'Emerald', 'Shadowed', 'Thornwood', 'Silverleaf', 'Moss-covered', 'Elven'],
    modifiers: ['pines', 'oaks', 'willows', 'birches', 'cedars', 'maples', 'aspens', 'elms', 'firs', 'spruces'],
  },
  grassland: {
    adjectives: ['Rolling', 'Verdant', 'Endless', 'Golden', 'Windswept', 'Peaceful', 'Fertile', 'Sun-kissed', 'Wild', 'Pastoral'],
    modifiers: ['grass', 'flowers', 'herbs', 'seeds', 'winds', 'paths', 'streams', 'wildlife', 'skies'],
  },
  mountain: {
    adjectives: ['Towering', 'Snow-capped', 'Jagged', 'Windswept', 'Granite', 'Crystal', 'Storm-touched', 'Iron', "Eagle's", 'Cloudbreak'],
    modifiers: ['heights', 'slopes', 'passes', 'cliffs', 'crags', 'stones', 'rocks', 'boulders', 'ledges'],
  },
  desert: {
    adjectives: ['Burning', 'Endless', 'Shifting', 'Golden', 'Scorching', 'Mirage', 'Sandswept', 'Sun-baked', "Nomad's", 'Oasis'],
    modifiers: ['sands', 'stones', 'winds', 'mirages', 'cacti', 'bones', 'ruins', 'wells', 'springs', 'tracks'],
  },
  tundra: {
    adjectives: ['Frozen', 'Windswept', 'Barren', 'Ice-bound', 'Permafrost', 'Aurora', 'Polar', 'Blizzard', 'Glacier', 'Nordic'],
    modifiers: ['ice', 'snow', 'winds', 'cold', 'frost', 'storms', 'lights', 'icicles', 'tracks', 'crystals'],
  },
  jungle: {
    adjectives: ['Dense', 'Steaming', 'Verdant', 'Primal', 'Untamed', 'Lush', 'Tropical', 'Humid', 'Ancient', 'Overgrown'],
    modifiers: ['vines', 'leaves', 'ferns', 'lianas', 'blossoms', 'mist', 'trees', 'branches', 'roots', 'shadows'],
  },
  swamp: {
    adjectives: ['Murky', 'Mist-shrouded', 'Rotting', 'Fetid', 'Boggy', 'Willow', 'Crocodile', 'Stagnant', 'Poisonous', "Witch's"],
    modifiers: ['reeds', 'moss', 'mist', 'pools', 'gases', 'vines', 'roots', 'mud', 'lilies', 'frogs'],
  },
  ocean: {
    adjectives: ['Tidal', 'Coral', 'Storm-tossed', 'Pearl', 'Sapphire', 'Misty', "Siren's", 'Deep', 'Salt-spray', 'Windward'],
    modifiers: ['waves', 'tides', 'shores', 'reefs', 'pearls', 'shells', 'currents', 'depths', 'piers', 'storms'],
  },
  underground: {
    adjectives: ['Deep', 'Echoing', 'Crystal', 'Shadowed', 'Forgotten', 'Dwarf-carved', 'Glowing', 'Limestone', 'Stalactite', 'Hidden'],
    modifiers: ['crystals', 'stalactites', 'shadows', 'stones', 'pools', 'formations', 'minerals', 'veins', 'darkness', 'fungi'],
  },
  urban: {
    adjectives: ['Lantern-lit', 'Timber-framed', 'Sprawling', 'Ancient', 'Industrial', 'Noble', 'Merchant', 'Cobblestone', 'Walled', 'Metropolitan'],
    modifiers: ['buildings', 'streets', 'fountains', 'market stalls', 'gatehouses', 'rooftops', 'alleys', 'shops', 'inns', 'guildhalls'],
  },
  volcanic: {
    adjectives: ['Smoldering', 'Molten', 'Fiery', 'Ash-covered', 'Steaming', 'Lava-touched', 'Scorched', 'Blazing', 'Sulfurous', 'Burning'],
    modifiers: ['lava', 'ash', 'smoke', 'flames', 'heat', 'sulfur', 'steam', 'embers', 'magma', 'rock'],
  },
  industrial: {
    adjectives: ['Smoke-filled', 'Mechanized', 'Steam-powered', 'Clanking', 'Grimy', 'Forge-lit', 'Working', 'Noisy', 'Production', 'Rust-streaked'],
    modifiers: ['machinery', 'steam', 'smoke', 'conveyors', 'gears', 'pipes', 'furnaces', 'tools', 'rust', 'crates'],
  },
  indoor: {
    adjectives: ['Enclosed', 'Candlelit', 'Furnished', 'Comfortable', 'Sheltered', 'Private', 'Decorated', 'Warm', 'Spacious', 'Intimate'],
    modifiers: ['furniture', 'tapestries', 'candles', 'fireplaces', 'books', 'art', 'comfort', 'privacy', 'warmth', 'luxury'],
  },
};

const SETTING_DESCRIPTIONS = [
  'A cozy {{ setting }} with a crackling hearth, long wooden tables, and worn floorboards.',
  'An imposing {{ setting }} built for defense, with thick walls and strategic positioning.',
  'A sacred {{ setting }} dedicated to ancient deities, filled with mystery and divine energy.',
  'A treacherous {{ setting }} filled with hidden dangers, ancient traps, and forgotten treasures.',
  'Ancient {{ setting }} that whisper of a forgotten civilization, now reclaimed by nature.',
  'A vital {{ setting }} spanning dangerous terrain, connecting distant lands and enabling safe passage.',
  'A hidden {{ setting }} known only to those who seek it out or stumble upon it by chance.',
  'A cursed {{ setting }} where shadows linger longer than natural and whispers echo from empty chambers.',
  'A legendary {{ setting }} of weathered stone, carved with old runes and scarred by past battles.',
  'A fortified {{ setting }} with thick stone walls and battlements that have held through many sieges.',
];

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
