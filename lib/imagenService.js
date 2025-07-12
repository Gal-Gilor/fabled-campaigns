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
      
      // For production, create a temporary credentials file for @google/genai
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        const credentials = getGoogleCredentials();
        
        // Write credentials to a temporary file that @google/genai can read
        const fs = require('fs');
        const path = require('path');
        const tmpCredPath = '/tmp/gcp-credentials.json';
        
        fs.writeFileSync(tmpCredPath, JSON.stringify(credentials));
        process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpCredPath;
        
        console.log('Setting credentials for production, project:', process.env.GOOGLE_CLOUD_PROJECT);
        console.log('Service account email:', credentials.client_email);
      }
      
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
      console.error('Map generation failed:', error);
      
      // Return fallback image for development/testing
      return {
        success: false,
        imageUrl: this.generateFallbackImage(params),
        error: error.message,
        metadata: {
          fallback: true,
          parameters: params,
          generatedAt: new Date().toISOString()
        }
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

  /**
   * Generate fallback image for development/testing
   * @param {Object} params - Map parameters
   * @returns {string} Base64 encoded placeholder SVG image
   */
  generateFallbackImage(params) {
    // Create a simple SVG placeholder that works in serverless environments
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4ade80;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#fbbf24;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGradient)"/>
        <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="28" font-weight="bold" 
              fill="white" text-anchor="middle" dominant-baseline="middle">${params.name}</text>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="18" 
              fill="white" text-anchor="middle" dominant-baseline="middle">${params.terrain} • ${params.setting}</text>
        <text x="50%" y="62%" font-family="Arial, sans-serif" font-size="16" 
              fill="white" text-anchor="middle" dominant-baseline="middle">Size: ${params.size}</text>
        <text x="50%" y="75%" font-family="Arial, sans-serif" font-size="14" 
              fill="rgba(255,255,255,0.8)" text-anchor="middle" dominant-baseline="middle">Fallback Image - Configure Imagen API for AI generation</text>
      </svg>
    `;
    
    // Convert SVG to base64 data URL
    const base64Svg = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64Svg}`;
  }
}

module.exports = ImagenService;