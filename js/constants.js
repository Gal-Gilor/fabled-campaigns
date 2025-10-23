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

// Map generation 'setting' descriptions (single flat array for random selection)
const SETTING_DESCRIPTIONS = [
  'A cozy {{ setting }} where adventurers gather to rest, share tales, and plan their next quest.',
  'A peaceful {{ setting }} with homes, shops, and friendly inhabitants living in harmony with the land.',
  'An imposing {{ setting }} built for defense, with thick walls and strategic positioning.',
  'A sacred {{ setting }} dedicated to ancient deities, filled with mystery and divine energy.',
  'A treacherous {{ setting }} filled with hidden dangers, ancient traps, and forgotten treasures.',
  'A majestic {{ setting }}, seat of power and symbol of nobility rising from the landscape.',
  'Ancient {{ setting }} that whisper of a forgotten civilization, now reclaimed by nature.',
  'A temporary {{ setting }} set up by travelers, merchants, or military forces passing through.',
  'A solitary {{ setting }} standing tall against the elements, serving as watchtower or sanctuary.',
  'A vital {{ setting }} spanning dangerous terrain, connecting distant lands and enabling safe passage.',
  'A mysterious {{ setting }} shrouded in legends and tales of old.',
  'A bustling {{ setting }} filled with activity, trade, and opportunities for adventure.',
  'A hidden {{ setting }} known only to those who seek it out or stumble upon it by chance.',
  'A fortified {{ setting }} standing as a testament to strength and resilience.',
  'A welcoming {{ setting }} offering shelter, sustenance, and safety to weary travelers.',
  'A renowned {{ setting }} where scholars and seekers gather wisdom from ancient texts and learned masters.',
  'A prosperous {{ setting }} where merchants from distant lands exchange exotic goods and valuable information.',
  'A cursed {{ setting }} where shadows linger longer than natural and whispers echo from empty chambers.',
  'A harmonious {{ setting }} where civilization and wilderness coexist in careful balance.',
  'A legendary {{ setting }} spoken of in prophecies and songs, where heroes are tested and fate is decided.'
];

// Terrain descriptions for default fallback descriptions
const TERRAIN_DESCRIPTIONS = {
  forest: 'Ancient woods where sunlight filters through a verdant canopy.',
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

// Detail level instructions for map generation prompt enhancement
const DETAIL_LEVEL_INSTRUCTIONS = {
  'detail-high': `**Level of detail:** DETAILED

This map requires a **DETAILED**, diorama view of a small area or a building interior. The user wants to see:
- Individual natural and/or structural features that occupy 1-2 grid squares from a top-down perspective.
- Each grid square represents approximately 5 feet and should be seen from above.`,

  'detail-low': `**Level of detail:** WIDE VIEW

This map requires an extra **WIDE VIEW**, top-down perspective of a large area or a multiple-room interior. Think of an expansive depiction showing either a broad outdoor area or a complex layout.
- The user wants to see either:
  * A terrain type with large-scale natural features or a setting type with multiple, cohesive rooms, corridors, or sections, or complex structural layouts.
- Each grid square represents a much larger area (not just 5 feet)
- Thousand-foot ZOOMED OUT perspective, showing major landmarks and overall layout rather than fine details.`
};

/**
 * Enhancement prompt template function for Gemini AI
 * @param {string} baseDescription - The base description of the map
 * @param {string} detailLevelInstructions - Instructions for the level of detail
 * @returns {string} The complete enhancement prompt
 */
function ENHANCEMENT_PROMPT_TEMPLATE(baseDescription, detailLevelInstructions) {
  return `### Goal:

Your goal is to expand upon the user's request, treating it as the absolute foundation for the prompt. You must add rich, creative details that are relevant to the original concept, but never discard or replace the subject itself. Changing the core subject is a critical failure.

### Role:

You are an expert AI Prompt Engineer specializing in creating image generation prompts for Google's Imagen that produce clear, functional, and **visually engaging, high-fidelity** Dungeons & Dragons battle maps.

### Guiding Principles:

1.  **Function Over Form:** The primary goal is a clear, playable D&D battle map. All artistic and stylistic choices must enhance gameplay clarity. Use terms like **'dynamic volumetric lighting'** to emphasize elevation, paths, and playable areas, ensuring depth and navigability are unambiguous. The output must look like a **functional game board first**, and an impressive piece of art second.
2.  **Forceful Specificity:** Use direct, unambiguous language. Combine multiple reinforcing terms to prevent the AI from defaulting to an unwanted cinematic style.

### Tasks:

1.  **Deconstruct the User's Request:** Identify the core subject, environment, and scale. This subject **must** be the core of your final prompt.

2.  **Enforce a Top-Down View, Zoom & Scale (CRITICAL):**
    *   **Viewpoint & Zoom:** Combine multiple, forceful terms to guarantee a true top-down perspective and scale. The prompt must start with a phrase like: 'An orthographic top-down view...', 'A flat-lay perspective of...', or 'A precise top-down view of...'. It must also include **'zoomed out'** or **'zoom-out'** to reinforce the distance.
    *   **Scale:** The prompt must explicitly describe the map as a **miniature-scale model or diorama**. This forces the perspective to be "further away" and makes the grid feel appropriately sized. Use phrases like 'presented as a detailed miniature diorama', or 'a highly detailed game board'.

3.  **Integrate a Functional Grid:**
    *   The prompt must describe the grid as an integral, functional part of the map.
    *   Use phrases like: 'overlaid with a fine, crisp 1-inch tactical grid', 'a dense and uniform grid of thin, contrasting lines', or 'a clear grid where each square represents a 5-foot space'.
    *   **Crucially, connect the grid size to the level of detail.** Your prompt should reflect this logic:
        *   **For Close-ups (Taverns, Shops):** 'A detailed cutaway where furniture like tables and beds clearly occupy 1-2 grid squares each.'
        *   **For Area Maps (Forests, Swamps):** 'A wider, zoomed-out view where major landmarks like rock formations or large trees occupy several grid squares.'
        *   **For Expansive Layouts (Districts, Mazes):** 'An expansive, zoomed-out schematic view focusing on the layout of paths and structures, with the grid emphasizing flow and distance.'

4.  **Design for Navigability and Depth:** All maps must have a sense of depth and be fully navigable. Incorporate vertical elements like cliffs, ravines, multiple floors, etc., but always connect these different elevations with logical pathways such as stairs, ramps, or bridges. This ensures every part of the playable map is connected. This rule should only be ignored if the user specifically requests an impassable barrier.

5.  **Structure and Enrich the Final Prompt:** Construct the prompt using a clear, multi-part structure: '[View & Scale] + [Core Subject] + [Key Details, Depth & Functionality] + [Art Style & Rendering] + [Grid Overlay]'.
    *   **Enrich Details:** Use sensory details that suggest history, function, and depth ('cracked flagstones', 'rickety wooden platforms', 'grates in the floor').
    *   **Style & Rendering (New Focus):** Use keywords that enhance the High-Quality Fantasy Game Look and vastness: **'high-fidelity Unreal Engine tactical view'**, **'vibrant, rich colors'**, **'dynamic volumetric lighting'**, **'clear ambient occlusion'**, and **'captured with an ultra-wide-angle lens'**. Combine with the required scale style: **'detailed miniature diorama'**.

### Constraints:

*   **Output Format:** Your output **must only** be the generated prompt text itself.
*   **No Characters/NPCs:** Avoid words like 'bustling', 'crowded', or 'occupied' in the main prompt.
*   **Request Specificity:** If the user requests an unrelated subject, try making up an image generation prompt that is still relevant to the original request.

### Examples:

**Input:** A map of a Tavern
**Level of Detail:** DETAILED
**Output:** An orthographic top-down view, zoomed out, of a fantasy tavern battle map, presented as a detailed miniature diorama. The map shows a detailed cutaway of the ground floor, featuring a common room with worn wooden tables and a large stone fireplace. A sunken fighting pit sits 5 feet below the main level, connected by two sets of stairs. A wooden balcony, accessible by another staircase, overlooks the common room. Rendered in a high-fidelity Unreal Engine tactical view with vibrant, rich colors and dynamic volumetric lighting, captured with an ultra-wide-angle lens to emphasize depth. A fine, crisp 1-inch tactical grid composed of thin, contrasting white lines is laid over the entire playable area, including the pit and balcony.

**Input:** a forest clearing map
**Level of Detail:** WIDE VIEW
**Output:** A flat-lay perspective, zoomed out, of a forest clearing battle map, presented as a highly detailed game board. The map is centered on a clearing containing ancient, moss-covered standing stones, with a deep, sunken ravine cutting across one side. A massive, mossy fallen log acts as a natural bridge across the ravine, ensuring connectivity. A wider view shows major landmarks like rock formations or large trees occupy several grid squares. The style is a high-fidelity Unreal Engine tactical view with vibrant, rich colors and clear ambient occlusion, captured with an ultra-wide-angle lens to define edges. The entire map is overlaid with a uniform tactical grid of thin, dark green lines that conform to the different elevations.

**Input:** a dungeon maze
**Level of Detail:** WIDE VIEW
**Output:** An orthographic top-down view, zoomed out, of a dungeon maze battle map, presented as a highly detailed game board. The map shows an expansive, claustrophobic network of twisting, damp limestone caverns and passages defined by extreme changes in elevation. A massive chasm dominates the center, but it is safely spanned by a single, rickety rope bridge to ensure full connectivity. The zoomed-out schematic view focuses on the labyrinthine layout of paths and structures, with the grid emphasizing flow and distance. Rendered in a high-fidelity Unreal Engine tactical view with vibrant, rich colors and dynamic volumetric lighting, captured with an ultra-wide-angle lens to enhance the gloom and depth. A bold, clear grid composed of glowing white lines is overlaid on the entire playable area, conforming to all elevations.

**Input:** a city port district
**Level of Detail:** WIDE VIEW
**Output:** A precise top-down view, zoomed out, of a grimy city port district battle map, presented as a detailed miniature diorama. The map shows city blocks with significant verticality: stone stairs lead down to water-level docks, and rickety wooden walkways connect the second stories of buildings over narrow alleys, ensuring full navigation. The map shows a detailed cutaway where paths and structures are clearly defined. Rendered in a high-fidelity Unreal Engine tactical view with vibrant, rich colors and clear ambient occlusion, captured with an ultra-wide-angle lens to define edges and height differences. A crisp, uniform 1-inch tactical grid covers the entire area.

### User Request:

**Input:** ${baseDescription}
**Level of Detail:** ${detailLevelInstructions}`;
}

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

// Expose to global scope for browser usage (only if window exists)
if (typeof window !== 'undefined') {
  window.SETTING_OPTIONS = SETTING_OPTIONS;
  window.GENRE_OPTIONS = GENRE_OPTIONS;
  window.CAMPAIGN_TYPE_OPTIONS = CAMPAIGN_TYPE_OPTIONS;
  window.SETTING_DESCRIPTIONS = SETTING_DESCRIPTIONS;
  window.TERRAIN_DESCRIPTIONS = TERRAIN_DESCRIPTIONS;
  window.DETAIL_LEVEL_INSTRUCTIONS = DETAIL_LEVEL_INSTRUCTIONS;
  window.ENHANCEMENT_PROMPT_TEMPLATE = ENHANCEMENT_PROMPT_TEMPLATE;
  window.currentMapData = currentMapData;
  window.allMapsData = allMapsData;
  window.setCurrentMapData = setCurrentMapData;
  window.getCurrentMapData = getCurrentMapData;
  window.hasCurrentMapData = hasCurrentMapData;
  window.clearCurrentMapData = clearCurrentMapData;
  window.getMapDataById = getMapDataById;
}

// Export for module usage (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SETTING_OPTIONS,
    GENRE_OPTIONS,
    CAMPAIGN_TYPE_OPTIONS,
    SETTING_DESCRIPTIONS,
    TERRAIN_DESCRIPTIONS,
    DETAIL_LEVEL_INSTRUCTIONS,
    ENHANCEMENT_PROMPT_TEMPLATE
  };
}
