/**
 * Serverless-compatible rate limiting middleware
 * Uses in-memory cache for development, designed for Redis in production
 */

// Rate limiting cache (in production, use Redis or similar)
const rateLimitCache = new Map();

/**
 * Create rate limiter with configurable options
 * @param {Object} options - Rate limiting configuration
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.maxRequests - Maximum requests per window (default: 5)
 * @param {string} options.keyGenerator - Function to generate cache key (default: IP-based)
 * @returns {Function} Rate limiting middleware function
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 5,
    keyGenerator = req => {
      return req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    }
  } = options;

  return function rateLimit(req, res, next) {
    const ip = keyGenerator(req);
    const now = Date.now();
    const key = `${ip}:${Math.floor(now / windowMs)}`;

    const count = rateLimitCache.get(key) || 0;

    if (count >= maxRequests) {
      if (next) {
        return next({
          status: 429,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        });
      }
      return false;
    }

    rateLimitCache.set(key, count + 1);

    // Clean up old entries periodically
    if (rateLimitCache.size > 1000) {
      rateLimitCache.clear();
    }

    if (next) next();
    return true;
  };
}

/**
 * Simple rate limiting function for direct use
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
 * Get current rate limit status for an IP
 * @param {string} ip - Client IP address
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Rate limit status
 */
function getRateLimitStatus(ip, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;
  const count = rateLimitCache.get(key) || 0;
  const resetTime = Math.ceil(now / windowMs) * windowMs;

  return {
    current: count,
    resetTime: new Date(resetTime).toISOString(),
    remaining: Math.max(0, 5 - count) // Default max of 5
  };
}

/**
 * Clear rate limit cache (useful for testing)
 */
function clearRateLimit() {
  rateLimitCache.clear();
}

module.exports = {
  createRateLimiter,
  rateLimit,
  getRateLimitStatus,
  clearRateLimit
};
