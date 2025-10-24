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
      return sendErrorResponse(
        res,
        createError.rateLimit('Too many map generation requests. Please try again later.')
      );
    }

    // Validate request body
    const validation = validateRequest(req.body, 'map');
    if (!validation.valid) {
      return sendErrorResponse(
        res,
        createError.validation(validation.errors.join(', '), validation.errors)
      );
    }

    const { name, description, terrain, setting, detailLevel, generationMode } = validation.sanitized;

    // Generate name if not provided (except for terrain-only requests)
    const finalName = name || (setting ? generateMapName({ terrain, setting }) : null);

    // Generate description if not provided (will be replaced with enhanced prompt after generation)
    const initialDescription = description || generateMapDescription({ terrain, setting });

    // Initialize Imagen service
    const imagenService = new ImagenService();

    // Generate map (only pass detailLevel if it exists)
    const mapParams = {
      name: finalName,
      description: initialDescription,
      terrain,
      setting,
      generationMode
    };

    // Only include detailLevel if provided (Advanced tab)
    if (detailLevel) {
      mapParams.detailLevel = detailLevel;
    }

    const result = await imagenService.generateMapImage(mapParams);

    // Use enhanced prompt as the final description, fallback to initial description
    const finalDescription = result.metadata?.enhancedPromptDescription || initialDescription;

    // Handle response based on generation result
    if (!result.success) {
      // Return graceful error response (200) instead of 500
      return res.status(200).json({
        success: false,
        fallback: true,
        error: result.error || 'Map generation failed',
        message: 'Failed to generate map image. Please try again.'
      });
    }

    // Prepare response
    const response = {
      success: result.success,
      mapId: `map_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      imageUrl: result.imageUrl,
      generatedName: finalName,
      fallback: result.metadata?.enhancementUsed === false,
      metadata: {
        name: finalName,
        description: finalDescription,
        terrain,
        setting,
        detailLevel: detailLevel || null,
        isUnnamed: !finalName,
        generatedAt: new Date().toISOString(),
        model: result.metadata?.model || 'imagen-3.0-generate-002',
        enhancementUsed: result.metadata?.enhancementUsed || false
      }
    };

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
