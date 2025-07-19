/**
 * Map utility functions
 * Helper functions for map generation and processing
 */

/**
 * Generates a random fantasy location name
 * @returns {string} A randomly generated name like "The Golden Haven"
 */
function generateRandomName() {
  const adjectives = ['Golden', 'Silver', 'Ancient', 'Mystic', 'Royal', 'Hidden', 'Sacred', 'Lost', 'Enchanted', 'Forgotten'];
  const nouns = ['Haven', 'Lodge', 'Keep', 'Hall', 'Inn', 'Sanctuary', 'Chamber', 'Grove', 'Rest', 'Refuge'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `The ${adjective} ${noun}`;
}

/**
 * Generates a default description based on the selected setting type
 * @param {string} setting - The location type (tavern, village, fortress, etc.)
 * @returns {string} A descriptive text appropriate for the setting
 */
function generateDefaultDescription(setting) {
  const descriptions = {
    // Setting descriptions
    tavern: 'A cozy gathering place with warm lighting and the smell of hearty food.',
    village: 'A peaceful settlement with winding paths and friendly faces.',
    fortress: 'An imposing military stronghold with thick walls and strategic defenses.',
    castle: 'A grand noble residence with high walls, towers, and impressive architecture.',
    tower: 'A tall structure reaching toward the sky, offering commanding views of the surrounding lands.',
    temple: 'A sacred space filled with divine energy and ancient wisdom.',
    ruins: 'Crumbling remnants of a once-great structure, mysterious and weathered.',
    cave: 'A natural shelter carved from stone, echoing with hidden secrets.',
    mine: 'Deep excavated tunnels where precious metals and gems are extracted from the earth.',
    campsite: 'A temporary refuge under the open sky, simple but secure.',
    crossroads: 'A crucial intersection where multiple paths meet, often marked by signposts and travelers.',
    bridge: 'A vital crossing over water or chasm, connecting distant shores or lands.',
    'trading-post': 'A bustling hub of commerce where travelers gather to trade.',
    docks: 'A busy waterfront where ships are loaded and unloaded, filled with maritime activity.',
    dungeon: 'A dark and dangerous place with locked doors and hidden traps.',
    market: 'A vibrant square filled with merchants, goods, and the sounds of haggling.',
    arena: 'A circular battleground where warriors compete for glory and crowds cheer.',
    academy: 'A place of learning and magical study, with laboratories and lecture halls.',
    library: 'A quiet hall of knowledge, with towering shelves of ancient books and scrolls.',
    workshop: 'A crafting space filled with tools, materials, and the sounds of creation.',
    graveyard: 'A solemn resting place for the dead, with weathered headstones and ancient tombs.',
    ship: 'The wooden deck of a vessel at sea, with rigging overhead and waves below.',
    sewer: 'A foul-smelling network of tunnels beneath a city, dark and damp.',
        
    // Terrain descriptions (for terrain-only generation)
    forest: 'Ancient woods where sunlight filters through a verdant canopy, perfect for exploration and adventure.',
    grassland: 'Rolling fields of verdant grass with gentle hills and peaceful meadows.',
    hills: 'Undulating terrain with rolling slopes, scattered groves, and commanding overlooks.',
    mountain: 'Towering peaks and rocky terrain with strategic vantage points and hidden caves.',
    desert: 'Vast stretches of golden sand and scorching heat, with oases and mysterious ruins.',
    tundra: 'Frozen wilderness with howling winds, ice formations, and hardy wildlife.',
    jungle: 'Dense tropical wilderness with tangled vines, exotic wildlife, and hidden temples.',
    swamp: 'Murky wetlands with twisted trees, mysterious mists, and treacherous waters.',
    ocean: 'Endless waters with crashing waves, coral reefs, and hidden depths.',
    coastal: 'Rocky shores where land meets sea, with tide pools and weathered cliffs.',
    underground: 'Deep caverns and tunnels with echoing chambers and hidden secrets.',
    underdark: 'The vast underground realm filled with bioluminescent fungi, crystal formations, and strange creatures.',
    badlands: 'Harsh wasteland of cracked earth and twisted rock formations.',
    feywild: 'A magical realm where reality bends, colors are more vivid, and ancient fey magic permeates the air.',
    shadowfell: 'A dark reflection of the world, where shadows linger and the air carries whispers of the dead.',
    urban: 'Bustling cityscape with cobblestone streets, towering buildings, and busy markets.',
    volcanic: 'Smoldering landscape with lava flows, steaming vents, and scorched terrain.',
    industrial: 'Mechanized landscape with steam-powered machinery, forges, and workshops.',
    indoor: 'Elegant interior spaces with comfortable furnishings and refined atmosphere.'
  };
  return descriptions[setting] || 'An interesting location waiting to be explored.';
}

/**
 * Maps setting types to appropriate default terrain types
 * @param {string} setting - The location type
 * @returns {string} The most appropriate terrain type for this setting
 */
function getDefaultTerrain(setting) {
  const defaultTerrains = {
    tavern: 'grassland',
    village: 'grassland',
    fortress: 'mountain',
    castle: 'hills',
    tower: 'hills',
    temple: 'forest',
    ruins: 'badlands',
    cave: 'underground',
    mine: 'mountain',
    campsite: 'forest',
    crossroads: 'grassland',
    bridge: 'coastal',
    'trading-post': 'grassland',
    docks: 'coastal',
    dungeon: 'underground',
    market: 'urban',
    arena: 'urban',
    academy: 'urban',
    library: 'indoor',
    workshop: 'urban',
    graveyard: 'hills',
    ship: 'ocean',
    sewer: 'underground'
  };
  return defaultTerrains[setting] || 'grassland';
}

/**
 * Downloads the generated map as a PNG file
 * @param {string} mapId - The ID of the map to download
 */
function downloadMap(mapId) {
  if (!currentMapData || currentMapData.id !== mapId) {
    alert('Map data not found');
    return;
  }
    
  try {
    // Create download link
    const link = document.createElement('a');
    link.download = `${currentMapData.name.replace(/[^a-z0-9]/gi, '_')}_map.png`;
    link.href = currentMapData.imageUrl;
        
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

/**
 * Downloads a sample/demo map with generated placeholder content
 * @param {string} mapId - The ID of the sample map to download
 */
function downloadSampleMap(mapId) {
  // Create a simple placeholder image for demo
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 800;
  canvas.height = 600;
    
  // Create different colors for different maps
  const mapColors = {
    'riverside-keep': { start: '#6b7280', end: '#3b82f6' },
    'sunken-crypts': { start: '#1f2937', end: '#6366f1' },
    'whisperleaf-village': { start: '#059669', end: '#10b981' }
  };
    
  const colors = mapColors[mapId] || { start: '#6b7280', end: '#3b82f6' };
    
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);
    
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
    
  // Add map name
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
    
  const mapNames = {
    'riverside-keep': 'Riverside Keep',
    'sunken-crypts': 'Sunken Crypts',
    'whisperleaf-village': 'Whisperleaf Village'
  };
    
  ctx.fillText(mapNames[mapId] || 'Sample Map', canvas.width / 2, canvas.height / 2);
    
  // Download the image
  const link = document.createElement('a');
  link.download = `${mapNames[mapId] || 'sample-map'}.png`;
  link.href = canvas.toDataURL('image/png');
    
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
    
  showDownloadFeedback();
}

// Expose functions to global scope for inline onclick handlers
window.generateRandomName = generateRandomName;
window.generateDefaultDescription = generateDefaultDescription;
window.getDefaultTerrain = getDefaultTerrain;
window.downloadMap = downloadMap;
window.downloadSampleMap = downloadSampleMap;