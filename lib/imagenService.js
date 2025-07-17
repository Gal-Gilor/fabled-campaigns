/**
 * Google Imagen API Service
 * Handles AI-powered map generation using Google's Imagen model
 */

const { GoogleGenAI } = require('@google/genai');
const { getGoogleCredentials, validateEnvironment } = require('./credentials');
const { getImageModel } = require('./models');

class ImagenService {
  constructor() {
    try {
      validateEnvironment();
      
      // Always create a temporary credentials file for @google/genai to use
      const credentials = getGoogleCredentials();
      
      // Write credentials to a temporary file that @google/genai can read
      const fs = require('fs');
      const path = require('path');
      const tmpCredPath = '/tmp/gcp-credentials.json';
      
      fs.writeFileSync(tmpCredPath, JSON.stringify(credentials));
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpCredPath;
      
      console.log('Setting credentials, project:', process.env.GOOGLE_CLOUD_PROJECT);
      console.log('Service account email:', credentials.client_email);
      
      this.client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION
      });
      
    } catch (error) {
      console.error('Failed to initialize ImagenService:', error);
      throw error;
    }
  }

  /**
   * Generate a fantasy battle map using Imagen API
   * @param {Object} params - Map generation parameters
   * @param {string} params.name - Name of the map
   * @param {string} params.description - Detailed description
   * @param {string} params.terrain - Terrain type
   * @param {string} params.setting - Setting type
   * @param {string} params.size - Map size
   * @param {string} params.generationMode - 'quick' or 'detailed' (default: 'detailed')
   * @returns {Promise<Object>} Generated map data
   */
  async generateMapImage(params) {
    try {
      const prompt = this.buildMapPrompt(params);
      const model = getImageModel(params.generationMode || 'detailed');
      
      console.log('Generating map with prompt:', prompt);
      console.log('Using model:', model);
      
      const response = await this.client.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '4:3',
          includeRaiReason: true,
          outputMimeType: 'image/png',
          // Disable person generation to focus on terrain/maps only
          personGeneration: 'dont_allow',
          // Increase guidance scale for stricter prompt adherence
          guidanceScale: 14,
          negativePrompt: 'text, labels, legends, characters, people, miniatures, figures, barkeep'
        }
      });
      
      if (!response || !response.generatedImages) {
        throw new Error('No response from Imagen API');
      }

      // Extract image data from response
      const generatedImages = response.generatedImages;
      if (!generatedImages || generatedImages.length === 0) {
        throw new Error('No images returned from Imagen API');
      }

      const generatedImage = generatedImages[0];
      
      if (!generatedImage || !generatedImage.image || !generatedImage.image.imageBytes) {
        throw new Error('No image data found in response');
      }
      
      const imageBytes = generatedImage.image.imageBytes;
      const mimeType = 'image/png';
      
      // Return structured response
      return {
        success: true,
        imageUrl: `data:${mimeType};base64,${imageBytes}`,
        metadata: {
          model: getImageModel(params.generationMode || 'detailed'),
          prompt: prompt,
          parameters: params,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error generating map image:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate map image'
      };
    }
  }

  /**
   * Build optimized prompt for fantasy map generation
   * @param {Object} params - Map parameters
   * @returns {string} Formatted prompt for Imagen API
   */
  buildMapPrompt(params) {
    const { name, description, terrain, setting, size } = params;
    
    // Start with very specific requirements to ensure adherence
    let prompt = `Create a detailed fantasy battle map for tabletop RPG use. REQUIREMENTS: `;
    
    // Add mandatory specifications using imperative language
    prompt += `MUST be top-down perspective showing a ${terrain} terrain with ${setting} setting. `;
    prompt += `MUST include clearly visible grid squares. `;
    prompt += `MUST be suitable for D&D gameplay with tactical movement. `;
    prompt += `MUST NOT INCLUDE any text, labels, or legends. `;
    prompt += `MUST NOT INCLUDE any characters, people, or miniatures. `;
    prompt += `Map dimensions: ${size} grid squares. `;
    
    // Add specific content requirements
    prompt += `Map name: "${name}". `;
    prompt += `Specific description: ${description}. `;
    
    // Add style constraints to prevent deviation
    prompt += `STYLE REQUIREMENTS: Fantasy art style, high contrast colors for visibility, `;
    prompt += `DO NOT include people, characters, or miniatures on the map. `;
    prompt += `FOCUS ONLY on the terrain, environment, and tactical layout.`;
    
  
    // Add technical requirements
    prompt += `Format: Square aspect ratio, high resolution, suitable for printing and digital use.`;
    
    return prompt;
  }
}

module.exports = ImagenService;