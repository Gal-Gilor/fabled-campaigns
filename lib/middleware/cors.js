/**
 * CORS (Cross-Origin Resource Sharing) middleware
 * Centralized CORS handling with security-first defaults
 */

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_CONFIG = {
  origin: 'https://fabled-campaigns.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vercel-protection-bypass'],
  credentials: false,
  maxAge: 86400 // 24 hours
};

/**
 * Set CORS headers on response object
 * @param {Object} res - Express/Vercel response object
 * @param {Object} options - CORS configuration options
 */
function setCorsHeaders(res, options = {}) {
  const config = { ...DEFAULT_CORS_CONFIG, ...options };
  
  // Handle origin
  if (Array.isArray(config.origin)) {
    // Multiple origins - would need request object to determine which to use
    res.setHeader('Access-Control-Allow-Origin', config.origin[0]);
  } else {
    res.setHeader('Access-Control-Allow-Origin', config.origin);
  }
  
  // Set other headers
  res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  
  if (config.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (config.maxAge) {
    res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
  }
}

/**
 * Handle CORS preflight requests
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} options - CORS configuration options
 * @returns {boolean} True if preflight was handled
 */
function handlePreflight(req, res, options = {}) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, options);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Validate origin against allowed origins
 * @param {string} origin - Request origin
 * @param {string|Array} allowedOrigins - Allowed origins
 * @returns {boolean} True if origin is allowed
 */
function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true; // Same-origin requests
  
  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin);
  }
  
  return false;
}

/**
 * Create CORS middleware function
 * @param {Object} options - CORS configuration options
 * @returns {Function} CORS middleware function
 */
function createCorsMiddleware(options = {}) {
  const config = { ...DEFAULT_CORS_CONFIG, ...options };
  
  return function corsMiddleware(req, res, next) {
    // Validate origin if specified
    const origin = req.headers.origin;
    if (config.origin !== '*' && origin && !isOriginAllowed(origin, config.origin)) {
      if (next) {
        return next({
          status: 403,
          error: 'CORS policy violation',
          message: 'Origin not allowed'
        });
      }
      return false;
    }
    
    // Set CORS headers
    setCorsHeaders(res, config);
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return true;
    }
    
    if (next) next();
    return true;
  };
}

/**
 * Environment-aware CORS configuration
 * Returns appropriate CORS settings based on environment
 */
function getEnvironmentCorsConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isVercel = process.env.VERCEL === '1';
  
  if (isDevelopment && !isVercel) {
    return {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    };
  }
  
  return {
    origin: 'https://fabled-campaigns.vercel.app',
    credentials: false
  };
}

module.exports = {
  setCorsHeaders,
  handlePreflight,
  isOriginAllowed,
  createCorsMiddleware,
  getEnvironmentCorsConfig,
  DEFAULT_CORS_CONFIG
};