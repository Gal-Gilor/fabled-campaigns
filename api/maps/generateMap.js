/**
 * @file api/maps/generateMap.js
 * @description API endpoint for generating maps with terrain and settings.
 * Handles rate limiting, CORS, parameter validation, and map generation.
 */

const ImagenService = require('../../lib/imagenService');
const { PLACE_TYPES, TERRAIN_ELEMENTS } = require('../../lib/nameConstants');

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
  
  // Name is optional for terrain-only generation
  if (name && (typeof name !== 'string' || name.length > 100)) {
    errors.push('Invalid map name (max 100 characters)');
  }
  
  // Description is optional for terrain-only generation
  if (description && (typeof description !== 'string' || description.length > 1000)) {
    errors.push('Invalid description (max 1000 characters)');
  }
  
  const validTerrains = Object.keys(TERRAIN_ELEMENTS);
  if (!terrain || !validTerrains.includes(terrain)) {
    errors.push('Invalid terrain type');
  }
  
  // Setting is optional for terrain-only generation
  const validSettings = Object.keys(PLACE_TYPES);
  if (setting && !validSettings.includes(setting)) {
    errors.push('Invalid setting type');
  }
  
  // Size defaults to 20x20 if not provided
  const validSizes = ['size-20x20', 'size-30x30', 'size-40x40'];
  if (size && !validSizes.includes(size)) {
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
    
    // Generate name if not provided
    let finalName = name;
    if (!name || name.trim() === '') {
      if (setting) {
        // Simplified name generation for settings
        try {
          const SimpleNameService = require('../../lib/simpleNameService');
          const nameService = new SimpleNameService();
          const nameResult = nameService.generateNames('place', { type: setting, terrain });
          if (nameResult.success && nameResult.names.length > 0) {
            finalName = nameResult.names[0];
          } else {
            throw new Error('Name generation failed');
          }
        } catch (error) {
          // Simple fallback name generation
          const terrainCapitalized = terrain.charAt(0).toUpperCase() + terrain.slice(1);
          const settingCapitalized = setting.charAt(0).toUpperCase() + setting.slice(1);
          finalName = `The ${terrainCapitalized} ${settingCapitalized}`;
        }
      } else {
        // Generate terrain-only name
        const terrainCapitalized = terrain.charAt(0).toUpperCase() + terrain.slice(1);
        finalName = `${terrainCapitalized} Terrain`;
      }
    }
    
    // Generate description if not provided (for terrain-only maps)
    let finalDescription = description;
    if ((!description || description.trim() === '') && !setting) {
      // Use terrain-based description generation
      const terrainData = TERRAIN_ELEMENTS[terrain];
      if (terrainData && terrainData.adjectives && terrainData.modifiers) {
        const adjective = terrainData.adjectives[Math.floor(Math.random() * terrainData.adjectives.length)];
        const modifier1 = terrainData.modifiers[Math.floor(Math.random() * terrainData.modifiers.length)];
        const modifier2 = terrainData.modifiers[Math.floor(Math.random() * terrainData.modifiers.length)];
        finalDescription = `${adjective} ${terrain} terrain with ${modifier1} and ${modifier2}, perfect for exploration and adventure.`;
      } else {
        finalDescription = `A ${terrain} terrain map perfect for tabletop adventures.`;
      }
    }
    
    
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