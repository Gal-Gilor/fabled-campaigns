/**
 * @file api/maps/generateMap.js
 * @description API endpoint for generating maps with terrain and settings.
 * Refactored to use shared utility modules for better maintainability.
 */

const ImagenService = require('../../lib/imagenService');
const { rateLimit } = require('../../lib/middleware/rateLimiter');
const { setCorsHeaders, handlePreflight } = require('../../lib/middleware/cors');
const { validateRequest } = require('../../lib/middleware/validation');
const { sendErrorResponse, validateMethod, createError } = require('../../lib/utils/errorHandler');
const { generateMapName, generateMapDescription } = require('../../lib/services/mapGenerationService');


/**
 * Main API handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export default async function handler(req, res) {
  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Handle preflight requests
    if (handlePreflight(req, res)) {
      return;
    }
    
    // Validate HTTP method
    if (!validateMethod(req, res, ['POST'])) {
      return;
    }
    
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!rateLimit(clientIp)) {
      return sendErrorResponse(res, createError.rateLimit('Too many map generation requests. Please try again later.'));
    }
    
    // Validate request body
    const validation = validateRequest(req.body, 'map');
    if (!validation.valid) {
      return sendErrorResponse(res, createError.validation(validation.errors.join(', '), validation.errors));
    }
    
    const { name, description, terrain, setting, size, generationMode } = validation.sanitized;
    
    // Generate name if not provided
    const finalName = name || generateMapName({ terrain, setting });
    
    // Generate description if not provided
    const finalDescription = description || generateMapDescription({ terrain, setting });
    
    // Initialize Imagen service
    const imagenService = new ImagenService();
    
    // Generate map
    const result = await imagenService.generateMapImage({
      name: finalName,
      description: finalDescription,
      terrain,
      setting,
      size,
      generationMode
    });
    
    // Prepare response
    const response = {
      success: result.success,
      mapId: `map_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      imageUrl: result.imageUrl,
      generatedName: finalName, // Include the generated name
      metadata: {
        name: finalName,
        description: finalDescription,
        terrain,
        setting,
        size,
        generatedAt: new Date().toISOString(),
        model: result.metadata?.model || 'imagen-3.0-generate-002'
      }
    };
    
    // Add error information if generation failed
    if (!result.success) {
      response.fallback = true;
      response.error = result.error;
    }
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Map generation API error:', error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Map generation failed. Please try again later.'
    });
  }
}