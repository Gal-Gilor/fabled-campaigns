/**
 * Map utility functions
 * Helper functions for map generation and processing
 */

/**
 * Get random element from array
 * @param {Array} array - Array to select from
 * @returns {any} Random element
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate dynamic terrain description using TERRAIN_ELEMENTS
 * Mirrors server-side logic from lib/services/mapGenerationService.js:71-88
 * @param {string} terrain - Terrain type
 * @returns {string} Generated description
 */
function generateTerrainDescription(terrain) {
  const terrainData = window.TERRAIN_ELEMENTS[terrain];

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
 * Generates a default description based on the selected setting or terrain type
 * Uses constants from js/constants.js for DRY principle
 * @param {string} settingOrTerrain - The location type (tavern, village, forest, etc.)
 * @returns {string} A descriptive text appropriate for the setting or terrain
 */
function generateDefaultDescription(settingOrTerrain) {
  // Check if it's a terrain type - generate dynamic description using TERRAIN_ELEMENTS
  if (window.TERRAIN_ELEMENTS && window.TERRAIN_ELEMENTS[settingOrTerrain]) {
    return generateTerrainDescription(settingOrTerrain);
  }

  // Otherwise, it's a setting - use randomized template-based description
  if (window.SETTING_DESCRIPTIONS && window.SETTING_DESCRIPTIONS.length > 0) {
    // Randomly select a template for variety
    const template = window.SETTING_DESCRIPTIONS[
      Math.floor(Math.random() * window.SETTING_DESCRIPTIONS.length)
    ];

    // Replace {{ setting }} placeholder with actual setting value
    return template.replace(/\{\{\s*setting\s*\}\}/g, settingOrTerrain);
  }

  // Fallback if constants aren't loaded (shouldn't happen in normal usage)
  return 'An interesting location waiting to be explored.';
}

/**
 * Downloads the generated map as a PNG file
 * @param {string} mapId - The ID of the map to download
 */
function downloadMap(mapId) {
  // First check if it's the current map, otherwise look in all maps storage
  let mapData = null;
  if (currentMapData && currentMapData.id === mapId) {
    mapData = currentMapData;
  } else {
    mapData = window.getMapDataById(mapId);
  }

  if (!mapData) {
    alert('Map data not found');
    return;
  }

  try {
    // Create download link
    const link = document.createElement('a');
    const fileName = mapData.name
      ? `${mapData.name.replace(/[^a-z0-9]/gi, '_')}_map.png`
      : `terrain_map_${mapId.substring(0, 8)}.png`;
    link.download = fileName;
    link.href = mapData.imageUrl;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show feedback
    showDownloadFeedback();
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download map. Please try again.');
  }
}

// Expose functions to global scope for inline onclick handlers
window.generateDefaultDescription = generateDefaultDescription;
window.generateTerrainDescription = generateTerrainDescription;
window.getRandomElement = getRandomElement;
window.downloadMap = downloadMap;
