/**
 * Map Generation Service
 * Business logic for map name and description generation
 */

const { TERRAIN_ELEMENTS } = require('../nameConstants');
const SimpleNameService = require('../simpleNameService');
const { SETTING_DESCRIPTIONS } = require('../../js/constants');

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
    const settingCapitalized = setting.charAt(0).toUpperCase() + setting.slice(1);
    if (terrain) {
      const terrainCapitalized = terrain.charAt(0).toUpperCase() + terrain.slice(1);
      return `The ${terrainCapitalized} ${settingCapitalized}`;
    } else {
      return `The ${settingCapitalized}`;
    }
  } else if (terrain) {
    // Generate terrain-only name
    const terrainCapitalized = terrain.charAt(0).toUpperCase() + terrain.slice(1);
    return `${terrainCapitalized} Terrain`;
  } else {
    return 'Unknown Location';
  }
}

/**
 * Generate a map description based on terrain and setting
 * @param {Object} params - Generation parameters
 * @param {string} params.terrain - Terrain type (optional)
 * @param {string} params.setting - Setting type (optional)
 * @returns {string} Generated map description
 */
function generateMapDescription({ terrain, setting }) {
  if (setting) {
    // For setting-based maps, create contextual descriptions
    return generateSettingDescription(setting);
  } else if (terrain) {
    // For terrain-only maps, use terrain-based descriptions
    return generateTerrainDescription(terrain);
  } else {
    return 'A fantasy battle map location.';
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
    const finalModifier2 =
      modifier2 === modifier1
        ? getRandomElement(terrainData.modifiers.filter(m => m !== modifier1)) || modifier2
        : modifier2;

    return `${adjective} ${terrain} terrain with ${modifier1} and ${finalModifier2}, and visible gridlines.`;
  } else {
    return `A ${terrain} terrain map with visible gridlines.`;
  }
}

/**
 * Generate description for setting-based maps
 * Randomly selects a template and replaces {{ setting }} placeholder
 * @param {string} setting - Setting type
 * @returns {string} Generated description
 */
function generateSettingDescription(setting) {
  // Randomly select a template from the array
  const template = getRandomElement(SETTING_DESCRIPTIONS);

  // Replace {{ setting }} placeholder with actual setting value
  return template.replace(/\{\{\s*setting\s*\}\}/g, setting);
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

  // At least one of terrain or setting must be provided
  if (!params.terrain && !params.setting) {
    errors.push('Either terrain or setting is required');
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

  const {
    name,
    description,
    terrain,
    setting,
    detailLevel = 'detail-low',
    generationMode = 'detailed'
  } = params;

  return {
    name: name || generateMapName({ terrain, setting }),
    description: description || generateMapDescription({ terrain, setting }),
    terrain,
    setting: setting || null,
    detailLevel,
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
