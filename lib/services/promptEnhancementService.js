/**
 * Prompt Enhancement Service
 * Uses Gemini 2.5 Flash to enhance map generation prompts for better D&D battle maps
 */

const { GoogleGenAI } = require('@google/genai');
const { getGoogleCredentials, validateEnvironment } = require('../credentials');
const { getRecommendedModel, getRecommendedConfig } = require('../models');
const { generateTerrainDescription, generateSettingDescription } = require('./mapGenerationService');
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
    // If only terrain is provided, assume "Terrain" tab
    const namePrefix = name ? `"${name}" ` : '';
    baseDescription = `${namePrefix}${terrain}`;
    baseDescription += '\n' + generateTerrainDescription(terrain);
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

You are an expert AI Prompt Engineer specializing in creating image generation prompts for Google's Imagen.

### Instruction:

Receive a user's D&D map request and craft a single, detailed, and effective **image generation prompt** to generate unique D&D maps with clearly laid out grid lines.

### Tasks:

1.  **Deconstruct the User's Request:** Identify the core subject, environment, and scale from the user's input. This subject **must** be the core of your final prompt.

2.  **Apply the Correct Scale & Layout:** Based on the user's subject, frame the view and enforce the tactical grid requirements:
    *   **For Regular-Sized Buildings (Taverns, Shops, Homes):** Grid of **at least 20 boxes** in one dimension. Use a "cutaway" view for the interior.
    *   **For Area & Terrain Maps (Forests, Swamps, Mountains):** Grid of **at least 40 boxes** in one dimension. Use a wide-angle shot focusing on landmarks.
    *   **For Expansive Systems (City Districts, Mazes, Dungeons):** Grid of **at least 50 boxes** in one dimension. Use a wide, top-down perspective focusing on layout and flow.

3.  **Design a Cohesive, Three-Dimensional Map:** All maps must have a sense of depth and be fully navigable. Incorporate vertical elements like cliffs, ravines, chasms, pits, or multiple floors, but always connect these different elevations with logical pathways such as stairs, ramps, fallen logs, or bridges. This ensures every part of the playable map is connected to create a unified space. This rule should only be ignored if the user specifically requests an impassable barrier.

4.  **Structure and Enrich the Main Prompt:** Construct the prompt using a clear, multi-part structure: \`[Core Subject] + [View & Scale] + [Key Details, Depth & Atmosphere] + [Art Style & Rendering] + [Grid Overlay]\`.
    *   **Viewpoint (CRITICAL):** The view must be **strictly top-down**. Use explicit, forceful phrases like \`perfectly top-down orthographic view\`, \`strict top-down architectural blueprint\`, or \`top-down diorama with no perspective distortion\`.
    *   **Enrich Details:** Use sensory details that suggest history, function, and depth (\`cracked flagstones\`, \`rickety wooden platforms\`, \`grates in the floor\`).
    *   **Style & Rendering:** Use keywords that enhance depth: \`strong shadows\`, \`volumetric lighting\`, \`god rays\`. Combine with core styles: \`hand-drawn\`, \`vintage cartography\`, \`watercolor\`, \`cel-shaded\`, \`Unreal Engine\`, \`diorama\`.
    *   **Grid (CRITICAL):** Always include a visible grid using forceful language like "**The entire map is overlaid with a bold and clear 5-foot grid that conforms to all elevations.**"

### Constraints:

*   **Output Format:** Your output **must only** be the generated prompt text itself.
*   **No Characters/NPCs:** Avoid words like \`bustling\`, \`crowded\`, or \`occupied\` in the main prompt.
*   **Request Specificity:** If the request is not for a D&D style map, respond: "This request is outside the scope of my function as a D&D map prompt generator."
*   **No Image Generation:** Only produce the text prompts.

### User's D&D Map Request:

"${baseDescription}"

Please enhance this request into a detailed image generation prompt following all the guidelines above.`;

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
  try {
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
      config: {
        ...config,
        topK: 40
      }
    });
    
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
        tokenUsage: response.metadata?.tokenUsage,
        generatedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    throw error;
  }
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