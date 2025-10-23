/**
 * Map utility functions
 * Helper functions for map generation and processing
 */

/**
 * Generates a random fantasy location name
 * @returns {string} A randomly generated name like "The Golden Haven"
 */
function generateRandomName() {
  const adjectives = [
    'Golden',
    'Silver',
    'Ancient',
    'Mystic',
    'Royal',
    'Hidden',
    'Sacred',
    'Lost',
    'Enchanted',
    'Forgotten'
  ];
  const nouns = [
    'Haven',
    'Lodge',
    'Keep',
    'Hall',
    'Inn',
    'Sanctuary',
    'Chamber',
    'Grove',
    'Rest',
    'Refuge'
  ];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `The ${adjective} ${noun}`;
}

/**
 * Generates a default description based on the selected setting or terrain type
 * Uses constants from js/constants.js for DRY principle
 * @param {string} settingOrTerrain - The location type (tavern, village, forest, etc.)
 * @returns {string} A descriptive text appropriate for the setting or terrain
 */
function generateDefaultDescription(settingOrTerrain) {
  // Check if it's a terrain type - these have specific descriptions
  if (window.TERRAIN_DESCRIPTIONS && window.TERRAIN_DESCRIPTIONS[settingOrTerrain]) {
    return window.TERRAIN_DESCRIPTIONS[settingOrTerrain];
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
window.generateRandomName = generateRandomName;
window.generateDefaultDescription = generateDefaultDescription;
window.downloadMap = downloadMap;
