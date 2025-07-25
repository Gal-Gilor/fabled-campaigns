/**
 * Google AI Model Constants
 * Centralized model names and configurations for Google GenAI services
 */

const negativePrompt =
  'no grid, gridless, no overlay, distorted grid, skewed grid, warped grid, text, labels, legends, characters, people, miniatures, minis, figures, frontal view, front view, side view, bottom-up, close-up, soft focus, extreme close-up, zoomed-in, zoom in, low quality, low resolution, bad quality, bad resolution';

/**
 * Available Google AI models
 */
const GeminiModels = {
  // Gemini models for text generation
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',

  // Imagen models for image generation
  IMAGEN_3_0_GENERATE: 'imagen-3.0-generate-002',
  IMAGEN_3_0_FAST_GENERATE: 'imagen-3.0-fast-generate-001',
  IMAGEN_4_0_FAST_GENERATE: 'imagen-4.0-fast-generate-preview-06-06'
};

/**
 * Default model configurations
 */
const ModelConfigs = {
  // High creativity config for name generation
  CREATIVE_TEXT: {
    temperature: 2.0,
    maxOutputTokens: 8192
  },

  // Balanced config for general text generation
  BALANCED_TEXT: {
    temperature: 1.0,
    maxOutputTokens: 8192
  },

  // Prompt enhancement config
  PROMPT_ENHANCEMENT: {
    temperature: 1.0,
    maxOutputTokens: 4096
  },

  // Standard image generation config for detailed generation
  STANDARD_IMAGE: {
    numberOfImages: 1,
    aspectRatio: '4:3',
    includeRaiReason: true,
    outputMimeType: 'image/png',
    personGeneration: 'dont_allow',
    guidanceScale: 14,
    negativePrompt: negativePrompt
  },

  // Quick image generation config - same settings as standard for consistency
  QUICK_IMAGE: {
    numberOfImages: 1,
    aspectRatio: '4:3',
    includeRaiReason: true,
    outputMimeType: 'image/png',
    personGeneration: 'dont_allow',
    guidanceScale: 14,
    negativePrompt: negativePrompt
  }
};

/**
 * Get the recommended model for a specific use case
 */
const getRecommendedModel = useCase => {
  const recommendations = {
    'name-generation': GeminiModels.GEMINI_2_0_FLASH,
    'text-generation': GeminiModels.GEMINI_2_0_FLASH,
    'prompt-enhancement': GeminiModels.GEMINI_2_5_FLASH,
    'image-generation-quick': GeminiModels.IMAGEN_3_0_FAST_GENERATE,
    'image-generation-detailed': GeminiModels.IMAGEN_3_0_GENERATE
  };

  return recommendations[useCase] || GeminiModels.GEMINI_2_0_FLASH;
};

/**
 * Get the recommended config for a specific use case
 */
const getRecommendedConfig = useCase => {
  const recommendations = {
    'name-generation': ModelConfigs.CREATIVE_TEXT,
    'text-generation': ModelConfigs.BALANCED_TEXT,
    'prompt-enhancement': ModelConfigs.PROMPT_ENHANCEMENT,
    'image-generation-quick': ModelConfigs.QUICK_IMAGE,
    'image-generation-detailed': ModelConfigs.STANDARD_IMAGE
  };

  return recommendations[useCase] || ModelConfigs.BALANCED_TEXT;
};

/**
 * Get model for specific generation mode
 * @param {string} mode - 'quick' or 'detailed'
 * @returns {string} The appropriate model name
 */
const getImageModel = mode => {
  if (mode === 'quick') {
    return GeminiModels.IMAGEN_3_0_FAST_GENERATE;
  }
  return GeminiModels.IMAGEN_3_0_GENERATE;
};

module.exports = {
  GeminiModels,
  ModelConfigs,
  getRecommendedModel,
  getRecommendedConfig,
  getImageModel
};
