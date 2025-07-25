/**
 * Application constants and configuration
 */

// Global variable to store generated map data
// eslint-disable-next-line prefer-const
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
    SETTING_OPTIONS
  };
}
