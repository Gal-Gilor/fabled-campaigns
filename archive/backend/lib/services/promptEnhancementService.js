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
const {
  DETAIL_LEVEL_INSTRUCTIONS,
  ENHANCEMENT_PROMPT_TEMPLATE,
  TERRAIN_ELEMENTS
} = require('../../js/constants');

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
 * @param {string} params.detailLevel - Detail level: 'detail-high' or 'detail-low' (optional)
 * @returns {string} Simple prompt for Gemini enhancement
 */
function buildEnhancementPrompt({ terrain, setting, name, customDescription, detailLevel }) {
  let baseDescription = '';

  // PRIORITY 1: If user provided a custom description, use ONLY that
  if (customDescription) {
    // Use setting/terrain/name for context, but custom description is the main content
    baseDescription = customDescription;
    
    if (setting) {
      const namePrefix = name ? `"${name}" ` : '';
      baseDescription = `**${namePrefix}${setting}**\n${baseDescription}`;

      if (terrain) {
        baseDescription = `${baseDescription}\n${terrain}\n`;
      }

    } else {
      baseDescription = `**${terrain}**\n${baseDescription}`;
    }
    
  } else {
    // PRIORITY 2: No custom description - generate random descriptions from constants
    if (terrain && setting) {
      // If both terrain and setting are provided, assume "Homebrew" tab
      const namePrefix = name ? `"${name}" ` : '';
      baseDescription = `${namePrefix}${setting}`;
      baseDescription += '\n' + generateSettingDescription(setting);
    } else if (setting) {
      // If only setting is provided, assume "Setting" tab
      const namePrefix = name ? `"${name}" ` : '';
      baseDescription = `${namePrefix}${setting}`;
      baseDescription += '\n' + generateSettingDescription(setting);
    } else if (terrain) {
      // If only terrain is provided, assume "Terrain" tab - no name for wilderness encounters
      baseDescription = generateTerrainDescription(terrain);
    } else {
      throw new Error('At least terrain, setting, or custom description must be provided');
    }
  }

  // Get detail level instructions from constants
  const detailLevelInstructions = DETAIL_LEVEL_INSTRUCTIONS[detailLevel] || '';

  // Build the enhancement prompt using the imported template function
  const enhancementPrompt = ENHANCEMENT_PROMPT_TEMPLATE(baseDescription, detailLevelInstructions);

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
  const { terrain, setting, name, customDescription, detailLevel } = params;

  let baseDescription = '';

  // PRIORITY 1: If user provided a custom description, use ONLY that
  if (customDescription) {
    baseDescription = customDescription;
  } else {
    // PRIORITY 2: No custom description - generate random descriptions from constants
    if (terrain && setting) {
      baseDescription = generateSettingDescription(setting);
    } else if (setting) {
      baseDescription = generateSettingDescription(setting);
    } else if (terrain) {
      baseDescription = generateTerrainDescription(terrain);
    } else {
      baseDescription = 'A fantasy battle map location';
    }
  }

  // Create a basic enhanced prompt using template structure
  const nameContext = name ? ` called "${name}"` : '';
  const mapType = setting || terrain || 'location';

  // Determine zoom level and scale based on detail level
  let zoomDescription = '';
  let scaleDescription = '';

  if (detailLevel === 'detail-high') {
    zoomDescription = 'detailed';
    scaleDescription = 'showing individual features, small objects, and fine details where each grid square represents approximately 5 feet';
  } else if (detailLevel === 'detail-low') {
    zoomDescription = 'zoomed out, wide view';
    scaleDescription = 'showing major landmarks, large features, and expansive layout where each grid square represents a larger area';
  } else {
    // Default to a medium view if no detail level specified
    zoomDescription = '';
    scaleDescription = 'suitable for tactical gameplay';
  }

  const enhancedPrompt = `An orthographic top-down view, ${zoomDescription}, of a fantasy ${mapType} battle map${nameContext}. ${baseDescription} ${scaleDescription}. The map features multiple elevations connected by natural pathways, stairs, or bridges to ensure full navigability. Rendered in a detailed, painterly style with dramatic overhead lighting creating strong shadows. The entire map is overlaid with a bold and clear 5-foot grid that conforms to all elevations.`;

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
