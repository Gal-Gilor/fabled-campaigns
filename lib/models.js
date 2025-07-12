/**
 * Google AI Model Constants
 * Centralized model names and configurations for Google GenAI services
 */

/**
 * Available Google AI models
 */
const GeminiModels = {
  // Gemini models for text generation
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
  
  // Imagen models for image generation
  IMAGEN_3_0_GENERATE: 'imagen-3.0-generate-002',
  IMAGEN_3_0_FAST_GENERATE: 'imagen-3.0-fast-generate-001',
};

/**
 * Default model configurations
 */
const ModelConfigs = {
  // High creativity config for name generation
  CREATIVE_TEXT: {
    temperature: 2.0,
    maxOutputTokens: 8192,
  },
  
  // Balanced config for general text generation
  BALANCED_TEXT: {
    temperature: 1.0,
    maxOutputTokens: 8192,
  },
  
  // Standard image generation config
  STANDARD_IMAGE: {
    numberOfImages: 1,
    aspectRatio: '4:3',
    includeRaiReason: true,
    outputMimeType: 'image/png',
    personGeneration: 'dont_allow',
    guidanceScale: 14,
    negativePromopt: 'text, labels, legends, characters, people, miniatures, figures, barkeep',
  },
};

/**
 * Model categories for easy access
 */
const ModelCategories = {
  TEXT_GENERATION: [
    GeminiModels.GEMINI_2_0_FLASH,
  ],
  
  IMAGE_GENERATION: [
    GeminiModels.IMAGEN_3_0_GENERATE,
    GeminiModels.IMAGEN_3_0_FAST_GENERATE,
  ],
};

/**
 * Get the recommended model for a specific use case
 */
const getRecommendedModel = (useCase) => {
  const recommendations = {
    'name-generation': GeminiModels.GEMINI_2_0_FLASH,
    'text-generation': GeminiModels.GEMINI_2_0_FLASH,
    'image-generation-quick': GeminiModels.IMAGEN_3_0_FAST_GENERATE,
    'image-generation-detailed': GeminiModels.IMAGEN_3_0_GENERATE,
  };
  
  return recommendations[useCase] || GeminiModels.GEMINI_2_0_FLASH;
};

/**
 * Get the recommended config for a specific use case
 */
const getRecommendedConfig = (useCase) => {
  const recommendations = {
    'name-generation': ModelConfigs.CREATIVE_TEXT,
    'text-generation': ModelConfigs.BALANCED_TEXT,
    'image-generation-quick': ModelConfigs.STANDARD_IMAGE,
    'image-generation-detailed': ModelConfigs.STANDARD_IMAGE,
  };
  
  return recommendations[useCase] || ModelConfigs.BALANCED_TEXT;
};

/**
 * Validate if a model exists
 */
const isValidModel = (modelName) => {
  return Object.values(GeminiModels).includes(modelName);
};

/**
 * Get all available models
 */
const getAllModels = () => {
  return Object.values(GeminiModels);
};

/**
 * Get model for specific generation mode
 * @param {string} mode - 'quick' or 'detailed'
 * @returns {string} The appropriate model name
 */
const getImageModel = (mode) => {
  return mode === 'quick' 
    ? getRecommendedModel('image-generation-quick')
    : getRecommendedModel('image-generation-detailed');
};

module.exports = {
  GeminiModels,
  ModelConfigs,
  ModelCategories,
  getRecommendedModel,
  getRecommendedConfig,
  getImageModel,
  isValidModel,
  getAllModels,
};