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
const {
  generateMapName,
  generateMapDescription
} = require('../../lib/services/mapGenerationService');

/**
 * Main API handler
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
module.exports = async function handler(req, res) {
  try {
    console.log('=== MAP GENERATION REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Set CORS headers
    setCorsHeaders(res);

    // Handle preflight requests
    if (handlePreflight(req, res)) {
      console.log('Handled preflight request');
      return;
    }

    // Validate HTTP method
    if (!validateMethod(req, res, ['POST'])) {
      console.log('Method validation failed');
      return;
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    console.log('Client IP:', clientIp);
    if (!rateLimit(clientIp)) {
      console.log('Rate limit exceeded for IP:', clientIp);
      return sendErrorResponse(
        res,
        createError.rateLimit('Too many map generation requests. Please try again later.')
      );
    }

    // Validate request body
    const validation = validateRequest(req.body, 'map');
    if (!validation.valid) {
      console.log('Validation failed with errors:', validation.errors);
      return sendErrorResponse(
        res,
        createError.validation(validation.errors.join(', '), validation.errors)
      );
    }

    const { name, description, terrain, setting, size, generationMode } = validation.sanitized;
    console.log('Sanitized parameters:', {
      name,
      description,
      terrain,
      setting,
      size,
      generationMode
    });

    // Generate name if not provided (except for terrain-only requests)
    const finalName = name || (setting ? generateMapName({ terrain, setting }) : null);
    console.log('Final name:', finalName);

    // Generate description if not provided
    const finalDescription = description || generateMapDescription({ terrain, setting });
    console.log('Final description:', finalDescription);

    // Initialize Imagen service
    const imagenService = new ImagenService();

    // Generate map (only pass size if it exists)
    const mapParams = {
      name: finalName,
      description: finalDescription,
      terrain,
      setting,
      generationMode
    };

    // Only include size if provided (Advanced tab)
    if (size) {
      mapParams.size = size;
    }
    console.log('Map params being sent to ImagenService:', JSON.stringify(mapParams, null, 2));

    const result = await imagenService.generateMapImage(mapParams);
    console.log('ImagenService result success:', result.success);

    // Prepare response
    const response = {
      success: result.success,
      mapId: `map_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      imageUrl: result.imageUrl,
      generatedName: finalName, // No artificial names for terrain maps
      fallback: result.metadata?.enhancementUsed === false, // Track if prompt enhancement was used
      metadata: {
        name: finalName,
        description: finalDescription,
        terrain,
        setting,
        size: size || null, // Null when AI determines size
        isUnnamed: !finalName, // Flag for unnamed terrain maps
        generatedAt: new Date().toISOString(),
        model: result.metadata?.model || 'imagen-3.0-generate-002'
      }
    };

    // Handle response based on generation result
    if (!result.success) {
      console.log('Image generation failed:', result.error);
      // Return error status when image generation fails
      return res.status(500).json({
        success: false,
        error: result.error || 'Map generation failed',
        message: 'Failed to generate map image. Please try again.'
      });
    }

    console.log('Map generation successful, sending response');
    res.status(200).json(response);
  } catch (error) {
    console.error('Map generation API error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Map generation failed. Please try again later.'
    });
  }
};
