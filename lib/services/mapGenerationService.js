/**
 * Map Generation Service
 * Business logic for map name and description generation
 */

const { TERRAIN_ELEMENTS } = require('../nameConstants');
const SimpleNameService = require('../simpleNameService');

/**
 * Generate a map name based on terrain and setting
 * @param {Object} params - Generation parameters
 * @param {string} params.terrain - Terrain type
 * @param {string} params.setting - Setting type (optional)
 * @returns {string} Generated map name
 */
function generateMapName({ terrain, setting }) {
  if (setting) {
    // Try to use SimpleNameService for setting-based names
    try {
      const nameService = new SimpleNameService();
      const nameResult = nameService.generateNames('place', { type: setting, terrain });
      if (nameResult.success && nameResult.names.length > 0) {
        return nameResult.names[0];
      }
    } catch (error) {
      console.warn('SimpleNameService failed, using fallback:', error.message);
    }
    
    // Fallback for setting-based names
    const terrainCapitalized = terrain.charAt(0).toUpperCase() + terrain.slice(1);
    const settingCapitalized = setting.charAt(0).toUpperCase() + setting.slice(1);
    return `The ${terrainCapitalized} ${settingCapitalized}`;
  } else {
    // Generate terrain-only name
    const terrainCapitalized = terrain.charAt(0).toUpperCase() + terrain.slice(1);
    return `${terrainCapitalized} Terrain`;
  }
}

/**
 * Generate a map description based on terrain and setting
 * @param {Object} params - Generation parameters
 * @param {string} params.terrain - Terrain type
 * @param {string} params.setting - Setting type (optional)
 * @returns {string} Generated map description
 */
function generateMapDescription({ terrain, setting }) {
  if (setting) {
    // For setting-based maps, create contextual descriptions
    return generateSettingDescription(terrain, setting);
  } else {
    // For terrain-only maps, use terrain-based descriptions
    return generateTerrainDescription(terrain);
  }
}

/**
 * Generate description for terrain-only maps
 * @param {string} terrain - Terrain type
 * @returns {string} Generated description
 */
function generateTerrainDescription(terrain) {
  const terrainData = TERRAIN_ELEMENTS[terrain];
  
  if (terrainData && terrainData.adjectives && terrainData.modifiers) {
    const adjective = getRandomElement(terrainData.adjectives);
    const modifier1 = getRandomElement(terrainData.modifiers);
    const modifier2 = getRandomElement(terrainData.modifiers);
    
    // Ensure modifiers are different
    const finalModifier2 = modifier2 === modifier1 
      ? getRandomElement(terrainData.modifiers.filter(m => m !== modifier1)) || modifier2
      : modifier2;
    
    return `${adjective} ${terrain} terrain with ${modifier1} and ${finalModifier2}, and visible gridlines.`;
  } else {
    return `A ${terrain} terrain map with visible gridlines.`;
  }
}

/**
 * Generate description for setting-based maps
 * @param {string} terrain - Terrain type
 * @param {string} setting - Setting type
 * @returns {string} Generated description
 */
function generateSettingDescription(terrain, setting) {
  const settingDescriptions = {
    tavern: `A cozy ${terrain} tavern where adventurers gather to rest, share tales, and plan their next quest.`,
    village: `A peaceful ${terrain} village with homes, shops, and friendly inhabitants living in harmony with the land.`,
    fortress: `An imposing ${terrain} fortress built for defense, with thick walls and strategic positioning.`,
    temple: `A sacred ${terrain} temple dedicated to ancient deities, filled with mystery and divine energy.`,
    dungeon: `A treacherous ${terrain} dungeon filled with hidden dangers, ancient traps, and forgotten treasures.`,
    castle: `A majestic ${terrain} castle, seat of power and symbol of nobility rising from the landscape.`,
    ruins: `Ancient ${terrain} ruins that whisper of a forgotten civilization, now reclaimed by nature.`,
    camp: `A temporary ${terrain} camp set up by travelers, merchants, or military forces passing through.`,
    tower: `A solitary ${terrain} tower standing tall against the elements, serving as watchtower or wizard's sanctuary.`,
    bridge: `A vital ${terrain} bridge spanning dangerous terrain, connecting distant lands and enabling safe passage.`
  };

  return settingDescriptions[setting] || `A ${setting} nestled within ${terrain} terrain, ready for adventure and exploration.`;
}

/**
 * Get random element from array
 * @param {Array} array - Array to select from
 * @returns {any} Random element
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Validate map generation parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validation result
 */
function validateMapGenerationParams(params) {
  const errors = [];
  
  if (!params.terrain) {
    errors.push('Terrain is required');
  }
  
  if (params.terrain && !TERRAIN_ELEMENTS[params.terrain]) {
    errors.push('Invalid terrain type');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create complete map metadata
 * @param {Object} params - Map parameters
 * @returns {Object} Complete map metadata
 */
function createMapMetadata(params) {
  const validation = validateMapGenerationParams(params);
  if (!validation.valid) {
    throw new Error(`Invalid map parameters: ${validation.errors.join(', ')}`);
  }
  
  const { name, description, terrain, setting, size = 'size-20x20', generationMode = 'detailed' } = params;
  
  return {
    name: name || generateMapName({ terrain, setting }),
    description: description || generateMapDescription({ terrain, setting }),
    terrain,
    setting: setting || null,
    size,
    generationMode,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  generateMapName,
  generateMapDescription,
  generateTerrainDescription,
  generateSettingDescription,
  validateMapGenerationParams,
  createMapMetadata
};