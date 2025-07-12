/**
 * Vercel Serverless Function: Map Generation API
 * Handles AI-powered map generation requests
 */

const ImagenService = require('../../lib/imagenService');

// Rate limiting cache (in production, use Redis or similar)
const rateLimitCache = new Map();

/**
 * Simple rate limiting implementation
 * @param {string} ip - Client IP address
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 * @returns {boolean} Whether request is allowed
 */
function rateLimit(ip, windowMs = 15 * 60 * 1000, maxRequests = 5) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;
  
  const count = rateLimitCache.get(key) || 0;
  
  if (count >= maxRequests) {
    return false;
  }
  
  rateLimitCache.set(key, count + 1);
  
  // Clean up old entries
  if (rateLimitCache.size > 1000) {
    rateLimitCache.clear();
  }
  
  return true;
}

/**
 * CORS headers for API responses
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vercel-protection-bypass');
}

/**
 * Validate map generation parameters
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result
 */
function validateParams(params) {
  const { name, description, terrain, setting, size, generationMode } = params;
  
  const errors = [];
  
  if (!name || typeof name !== 'string' || name.length > 100) {
    errors.push('Invalid map name (required, max 100 characters)');
  }
  
  if (!description || typeof description !== 'string' || description.length > 1000) {
    errors.push('Invalid description (required, max 1000 characters)');
  }
  
  const validTerrains = ['forest', 'grassland', 'mountain', 'desert', 'tundra', 'jungle', 'swamp', 'ocean', 'underground', 'urban', 'volcanic', 'industrial', 'indoor'];
  if (!terrain || !validTerrains.includes(terrain)) {
    errors.push('Invalid terrain type');
  }
  
  const validSettings = ['tavern', 'village', 'fortress', 'temple', 'ruins', 'cave', 'campsite', 'trading-post'];
  if (!setting || !validSettings.includes(setting)) {
    errors.push('Invalid setting type');
  }
  
  const validSizes = ['size-20x20', 'size-30x30', 'size-40x40'];
  if (!size || !validSizes.includes(size)) {
    errors.push('Invalid map size');
  }
  
  const validModes = ['quick', 'detailed'];
  if (generationMode && !validModes.includes(generationMode)) {
    errors.push('Invalid generation mode (must be "quick" or "detailed")');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

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
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      });
      return;
    }
    
    // Rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!rateLimit(clientIp)) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many map generation requests. Please try again later.'
      });
      return;
    }
    
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ 
        error: 'Invalid request body',
        message: 'Request body must be valid JSON'
      });
      return;
    }
    
    // Validate parameters
    const validation = validateParams(req.body);
    if (!validation.valid) {
      res.status(400).json({ 
        error: 'Invalid parameters',
        message: validation.errors.join(', ')
      });
      return;
    }
    
    const { name, description, terrain, setting, size, generationMode = 'detailed' } = req.body;
    
    console.log('Generating map:', { name, terrain, setting, size, generationMode });
    
    // Initialize Imagen service
    const imagenService = new ImagenService();
    
    // Generate map
    const result = await imagenService.generateMapImage({
      name,
      description,
      terrain,
      setting,
      size,
      generationMode
    });
    
    // Prepare response
    const response = {
      success: result.success,
      mapId: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageUrl: result.imageUrl,
      metadata: {
        name,
        description,
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