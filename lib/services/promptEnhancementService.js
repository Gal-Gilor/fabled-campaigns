/**
 * Prompt Enhancement Service
 * Uses Gemini 2.5 Flash to enhance map generation prompts for better D&D battle maps
 */

const { GoogleGenAI } = require('@google/genai');
const { getGoogleCredentials, validateEnvironment } = require('../credentials');
const { getRecommendedModel, getRecommendedConfig } = require('../models');
const {
  generateTerrainDescription,
  generateSettingDescription
} = require('./mapGenerationService');
const { TERRAIN_ELEMENTS } = require('../nameConstants');

/**
 * Get a random terrain type
 * @returns {string} Random terrain from available options
 */
function getRandomTerrain() {
  const terrains = Object.keys(TERRAIN_ELEMENTS);
  return terrains[Math.floor(Math.random() * terrains.length)];
}

/**
 * Build the enhancement prompt using simplified logic
 * @param {Object} params - Enhancement parameters
 * @param {string} params.terrain - Terrain type
 * @param {string} params.setting - Setting type (optional)
 * @param {string} params.name - Map name (optional)
 * @param {string} params.customDescription - Custom "You step into..." description (optional)
 * @returns {string} Simple prompt for Gemini enhancement
 */
function buildEnhancementPrompt({ terrain, setting, name, customDescription }) {
  let baseDescription = '';

  if (terrain && setting) {
    // If both terrain and setting are provided, assume "Homebrew" tab
    const namePrefix = name ? `"${name}" ` : '';
    baseDescription = `${namePrefix}${setting}`;
    baseDescription += '\n' + generateSettingDescription(terrain, setting);
  } else if (setting) {
    // If only setting is provided, assume "Setting" tab
    const namePrefix = name ? `"${name}" ` : '';
    baseDescription = `${namePrefix}${setting}`;
    // Use random terrain for setting description
    const randomTerrain = getRandomTerrain();
    baseDescription += '\n' + generateSettingDescription(randomTerrain, setting);
  } else if (terrain) {
    // If only terrain is provided, assume "Terrain" tab - no name for wilderness encounters
    baseDescription = generateTerrainDescription(terrain);
  } else {
    throw new Error('At least terrain, setting, or custom description must be provided');
  }

  // Always append custom description if provided
  if (customDescription) {
    baseDescription += '\n' + customDescription;
  }

  const enhancementPrompt = `### Goal:

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
    *   **Style & Rendering (New Focus):** Use keywords that enhance the High-Quality Fantasy Game Look: **'high-fidelity Unreal Engine tactical view'**, **'vibrant, rich colors'**, **'dynamic volumetric lighting'**, and **'clear ambient occlusion'**. Combine with the required scale style: **'detailed miniature diorama'**.

### Constraints:

*   **Output Format:** Your output **must only** be the generated prompt text itself.
*   **No Characters/NPCs:** Avoid words like 'bustling', 'crowded', or 'occupied' in the main prompt.
*   **Request Specificity:** If the user requests an unrelated subject, try making up an image generation prompt that is still relevant to the original request.

### Examples:

**Input:** A map of a Tavern
**Output:** An orthographic top-down view, zoomed out, of a fantasy tavern battle map, presented as a detailed miniature diorama. The map shows a detailed cutaway of the ground floor, featuring a common room with worn wooden tables and a large stone fireplace. A sunken fighting pit sits 5 feet below the main level, connected by two sets of stairs. A wooden balcony, accessible by another staircase, overlooks the common room. Rendered in a high-fidelity Unreal Engine tactical view with vibrant, rich colors and dynamic volumetric lighting to emphasize depth. A fine, crisp 1-inch tactical grid composed of thin, contrasting white lines is laid over the entire playable area, including the pit and balcony.

**Input:** a forest clearing map
**Output:** A flat-lay perspective, zoomed out, of a forest clearing battle map, presented as a highly detailed game board. The map is centered on a clearing containing ancient, moss-covered standing stones, with a deep, sunken ravine cutting across one side. A massive, mossy fallen log acts as a natural bridge across the ravine, ensuring connectivity. A wider view shows major landmarks like rock formations or large trees occupy several grid squares. The style is a high-fidelity Unreal Engine tactical view with vibrant, rich colors and clear ambient occlusion to define edges. The entire map is overlaid with a uniform tactical grid of thin, dark green lines that conform to the different elevations.

**Input:** a dungeon maze
**Output:** An orthographic top-down view, zoomed out, of a dungeon maze battle map, presented as a highly detailed game board. The map shows an expansive, claustrophobic network of twisting, damp limestone caverns and passages defined by extreme changes in elevation. A massive chasm dominates the center, but it is safely spanned by a single, rickety rope bridge to ensure full connectivity. The zoomed-out schematic view focuses on the labyrinthine layout of paths and structures, with the grid emphasizing flow and distance. Rendered in a high-fidelity Unreal Engine tactical view with vibrant, rich colors and dynamic volumetric lighting to enhance the gloom and depth. A bold, clear grid composed of glowing white lines is overlaid on the entire playable area, conforming to all elevations.

**Input:** a city port district
**Output:** A precise top-down view, zoomed out, of a grimy city port district battle map, presented as a detailed miniature diorama. The map shows city blocks with significant verticality: stone stairs lead down to water-level docks, and rickety wooden walkways connect the second stories of buildings over narrow alleys, ensuring full navigation. The map shows a detailed cutaway where paths and structures are clearly defined. Rendered in a high-fidelity Unreal Engine tactical view with vibrant, rich colors and clear ambient occlusion to define edges and height differences. A crisp, uniform 1-inch tactical grid covers the entire area.

### User Request:

${baseDescription}`;

  return enhancementPrompt;
}

/**
 * Enhance a map prompt using Gemini 2.5 Flash
 * @param {Object} params - Enhancement parameters
 * @param {string} params.terrain - Terrain type
 * @param {string} params.setting - Setting type (optional)
 * @param {string} params.name - Map name (optional)
 * @param {string} params.customDescription - Custom description (optional)
 * @returns {Promise<Object>} Enhancement result with success flag and enhanced prompt
 */
async function enhancePrompt(params) {
  validateEnvironment();

  // Get decoded credentials in memory only
  const credentials = getGoogleCredentials();

  // Use in-memory authentication without writing credentials to disk
  const client = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    // Pass credentials directly to avoid file system usage
    googleAuthOptions: {
      credentials: credentials
    }
  });

  const model = getRecommendedModel('prompt-enhancement');
  const config = getRecommendedConfig('prompt-enhancement');
  const prompt = buildEnhancementPrompt(params);

  const response = await client.models.generateContent({
    model: model,
    contents: prompt,
    config: config
  });

  // Log Gemini I/O
  console.log('=== GEMINI PROMPT ENHANCEMENT ===');
  console.log('Model:', model);
  console.log('Input prompt length:', prompt.length, 'chars');
  console.log('Input prompt:', prompt);
  console.log('Response:', JSON.stringify(response, null, 2));

  if (!response?.text) {
    throw new Error('No response from Gemini');
  }

  const enhancedPrompt = response.text.trim();

  if (!enhancedPrompt || enhancedPrompt.length < 50) {
    throw new Error('Invalid enhanced prompt in response');
  }

  return {
    success: true,
    enhancedPrompt,
    metadata: {
      method: 'gemini',
      model: model,
      originalPrompt: buildEnhancementPrompt(params),
      tokenUsage: response.usageMetadata,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Fallback prompt enhancement using template-based approach
 * @param {Object} params - Enhancement parameters
 * @returns {Object} Fallback enhancement result
 */
function enhancePromptFallback(params) {
  const { terrain, setting, name, customDescription } = params;

  let baseDescription = '';

  // Build base description using same logic as main function
  if (terrain && setting) {
    baseDescription = generateSettingDescription(terrain, setting);
  } else if (setting) {
    const randomTerrain = getRandomTerrain();
    baseDescription = generateSettingDescription(randomTerrain, setting);
  } else if (terrain) {
    baseDescription = generateTerrainDescription(terrain);
  } else {
    baseDescription = 'A fantasy battle map location';
  }

  // Append custom description if provided
  if (customDescription) {
    baseDescription += ' ' + customDescription;
  }

  // Create a basic enhanced prompt using template structure
  const nameContext = name ? ` called "${name}"` : '';
  const mapType = setting || terrain || 'location';
  const gridSize = setting ? '25x25' : '40x40';

  const enhancedPrompt = `An orthographic top-down view of a fantasy ${mapType} battle map${nameContext}, suitable for a ${gridSize} grid. ${baseDescription} The map features multiple elevations connected by natural pathways, stairs, or bridges to ensure full navigability. Rendered in a detailed, painterly style with dramatic overhead lighting creating strong shadows. The entire map is overlaid with a bold and clear 5-foot grid that conforms to all elevations.`;

  return {
    success: true,
    enhancedPrompt,
    metadata: {
      method: 'fallback',
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Main enhancement function with fallback support
 * @param {Object} params - Enhancement parameters
 * @returns {Promise<Object>} Enhancement result
 */
async function generateEnhancedPrompt(params) {
  try {
    return await enhancePrompt(params);
  } catch (error) {
    console.warn('Gemini enhancement failed, using fallback:', error.message);
    const fallbackResult = enhancePromptFallback(params);
    fallbackResult.metadata.geminiError = error.message;
    return fallbackResult;
  }
}

/**
 * Validate enhancement parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validation result
 */
function validateEnhancementParams(params) {
  const errors = [];

  if (!params.terrain && !params.setting && !params.customDescription) {
    errors.push('At least terrain, setting, or custom description must be provided');
  }

  if (params.terrain && !TERRAIN_ELEMENTS[params.terrain]) {
    errors.push('Invalid terrain type');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateEnhancedPrompt,
  enhancePrompt,
  enhancePromptFallback,
  buildEnhancementPrompt,
  validateEnhancementParams,
  getRandomTerrain
};
