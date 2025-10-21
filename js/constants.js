/**
 * Application constants and configuration
 */

// Global variable to store generated map data
 
let currentMapData = null;

/**
 * A global Map to store all generated map data for download access.
 * 
 * - **Key**: A unique identifier for each map (e.g., `mapData.id`).
 * - **Value**: The map data object containing all relevant information about the map.
 * 
 * Lifecycle:
 * - Maps are added using the `setCurrentMapData` function.
 * - Maps can be retrieved by ID using the `getMapDataById` function.
 * - The Map persists all generated maps until explicitly cleared or the application is reset.
 */
const allMapsData = new Map();

// Single source of truth for setting options
const SETTING_OPTIONS = [
  { value: 'tavern', label: 'Tavern' },
  { value: 'village', label: 'Village' },
  { value: 'fortress', label: 'Fortress' },
  { value: 'castle', label: 'Castle' },
  { value: 'tower', label: 'Tower' },
  { value: 'temple', label: 'Temple', selected: true },
  { value: 'ruins', label: 'Ruins' },
  { value: 'cave', label: 'Cave' },
  { value: 'mine', label: 'Mine' },
  { value: 'campsite', label: 'Campsite' },
  { value: 'crossroads', label: 'Crossroads' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'trading-post', label: 'Trading Post' },
  { value: 'docks', label: 'Docks' },
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'market', label: 'Market' },
  { value: 'arena', label: 'Arena' },
  { value: 'academy', label: 'Academy' },
  { value: 'library', label: 'Library' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'graveyard', label: 'Graveyard' },
  { value: 'ship', label: 'Ship' },
  { value: 'sewer', label: 'Sewer' }
];

// Quest-specific constants for Define the Journey page
const GENRE_OPTIONS = [
  { value: 'fantasy', label: 'Fantasy', selected: true },
  { value: 'sci-fi', label: 'Science Fiction' },
  { value: 'horror', label: 'Horror' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'urban-fantasy', label: 'Urban Fantasy' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'western', label: 'Western' },
  { value: 'post-apocalyptic', label: 'Post-Apocalyptic' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'space-opera', label: 'Space Opera' }
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'exploration', label: 'Exploration', selected: true },
  { value: 'political-intrigue', label: 'Political Intrigue' },
  { value: 'dungeon-crawl', label: 'Dungeon Crawl' },
  { value: 'rescue-mission', label: 'Rescue Mission' },
  { value: 'mystery-investigation', label: 'Mystery Investigation' },
  { value: 'war-campaign', label: 'War Campaign' },
  { value: 'heist', label: 'Heist' },
  { value: 'survival', label: 'Survival' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'diplomatic-mission', label: 'Diplomatic Mission' }
];


/**
 * Helper functions for managing map state (without visual indicators)
 */
function setCurrentMapData(mapData) {
  currentMapData = mapData;
  // Store in all maps collection for download access
  allMapsData.set(mapData.id, mapData);
}

function getCurrentMapData() {
  return currentMapData;
}

function hasCurrentMapData() {
  return currentMapData !== null;
}

function clearCurrentMapData() {
  currentMapData = null;
}

/**
 * Get map data by ID from storage
 * @param {string} mapId - The ID of the map to retrieve
 * @returns {Object|null} The map data or null if not found
 */
function getMapDataById(mapId) {
  return allMapsData.get(mapId) || null;
}

// Expose to global scope for browser usage
window.SETTING_OPTIONS = SETTING_OPTIONS;
window.GENRE_OPTIONS = GENRE_OPTIONS;
window.CAMPAIGN_TYPE_OPTIONS = CAMPAIGN_TYPE_OPTIONS;
window.currentMapData = currentMapData;
window.allMapsData = allMapsData;
window.setCurrentMapData = setCurrentMapData;
window.getCurrentMapData = getCurrentMapData;
window.hasCurrentMapData = hasCurrentMapData;
window.clearCurrentMapData = clearCurrentMapData;
window.getMapDataById = getMapDataById;

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SETTING_OPTIONS,
    GENRE_OPTIONS,
    CAMPAIGN_TYPE_OPTIONS
  };
}
