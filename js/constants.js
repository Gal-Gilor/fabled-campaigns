/**
 * Application constants and configuration
 */

// Global variable to store generated map data
// eslint-disable-next-line prefer-const
let currentMapData = null;

// Single source of truth for setting options
const SETTING_OPTIONS = [
  { value: 'tavern', label: 'Tavern' },
  { value: 'village', label: 'Village' },
  { value: 'fortress', label: 'Fortress' },
  { value: 'temple', label: 'Temple', selected: true },
  { value: 'ruins', label: 'Ruins' },
  { value: 'cave', label: 'Cave' },
  { value: 'campsite', label: 'Campsite' },
  { value: 'trading-post', label: 'Trading Post' },
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'market', label: 'Market' },
  { value: 'library', label: 'Library' },
  { value: 'ship', label: 'Ship' },
  { value: 'sewer', label: 'Sewer' }
];

// Setting icons for UI display
const SETTING_ICONS = {
  tavern: '🍺',
  village: '🏘️',
  fortress: '🏰',
  temple: '⛪',
  ruins: '🏛️',
  cave: '🕳️',
  campsite: '🏕️',
  'trading-post': '🏪',
  dungeon: '⛓️',
  market: '⚖️',
  library: '📚',
  ship: '⛵',
  sewer: '💧'
};

// Expose to global scope for browser usage
window.SETTING_OPTIONS = SETTING_OPTIONS;
window.SETTING_ICONS = SETTING_ICONS;
window.currentMapData = currentMapData;

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SETTING_OPTIONS,
    SETTING_ICONS
  };
}