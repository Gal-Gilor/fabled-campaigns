/**
 * Centralized error handling utilities
 * Provides consistent error responses and logging
 */

/**
 * Standard error types
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED'
};

/**
 * HTTP status codes for different error types
 */
const ERROR_STATUS_CODES = {
  [ERROR_TYPES.VALIDATION_ERROR]: 400,
  [ERROR_TYPES.RATE_LIMIT_ERROR]: 429,
  [ERROR_TYPES.AUTHENTICATION_ERROR]: 401,
  [ERROR_TYPES.AUTHORIZATION_ERROR]: 403,
  [ERROR_TYPES.EXTERNAL_API_ERROR]: 502,
  [ERROR_TYPES.INTERNAL_ERROR]: 500,
  [ERROR_TYPES.NOT_FOUND_ERROR]: 404,
  [ERROR_TYPES.METHOD_NOT_ALLOWED]: 405
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  [ERROR_TYPES.VALIDATION_ERROR]: 'Invalid request parameters',
  [ERROR_TYPES.RATE_LIMIT_ERROR]: 'Too many requests. Please try again later.',
  [ERROR_TYPES.AUTHENTICATION_ERROR]: 'Authentication required',
  [ERROR_TYPES.AUTHORIZATION_ERROR]: 'Access denied',
  [ERROR_TYPES.EXTERNAL_API_ERROR]: 'External service temporarily unavailable',
  [ERROR_TYPES.INTERNAL_ERROR]: 'Internal server error. Please try again later.',
  [ERROR_TYPES.NOT_FOUND_ERROR]: 'Resource not found',
  [ERROR_TYPES.METHOD_NOT_ALLOWED]: 'Method not allowed'
};

/**
 * Application error class
 */
class AppError extends Error {
  constructor(type, message = null, details = null, statusCode = null) {
    super(message || ERROR_MESSAGES[type] || 'Unknown error');
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode || ERROR_STATUS_CODES[type] || 500;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Format error for API response
 * @param {Error|AppError|Object} error - Error object
 * @param {boolean} includeStack - Whether to include stack trace (development only)
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, includeStack = false) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle AppError instances
  if (error instanceof AppError) {
    const response = {
      error: error.type,
      message: error.message,
      timestamp: error.timestamp
    };
    
    if (error.details) {
      response.details = error.details;
    }
    
    if (includeStack && isDevelopment && error.stack) {
      response.stack = error.stack;
    }
    
    return response;
  }
  
  // Handle generic Error instances
  if (error instanceof Error) {
    const response = {
      error: ERROR_TYPES.INTERNAL_ERROR,
      message: isDevelopment ? error.message : ERROR_MESSAGES[ERROR_TYPES.INTERNAL_ERROR],
      timestamp: new Date().toISOString()
    };
    
    if (includeStack && isDevelopment && error.stack) {
      response.stack = error.stack;
    }
    
    return response;
  }
  
  // Handle plain error objects (from middleware)
  if (error && typeof error === 'object') {
    return {
      error: error.error || ERROR_TYPES.INTERNAL_ERROR,
      message: error.message || ERROR_MESSAGES[ERROR_TYPES.INTERNAL_ERROR],
      timestamp: error.timestamp || new Date().toISOString(),
      ...(error.details && { details: error.details })
    };
  }
  
  // Fallback for unknown error types
  return {
    error: ERROR_TYPES.INTERNAL_ERROR,
    message: ERROR_MESSAGES[ERROR_TYPES.INTERNAL_ERROR],
    timestamp: new Date().toISOString()
  };
}

/**
 * Send error response
 * @param {Object} res - Response object
 * @param {Error|AppError|Object} error - Error object
 * @param {Object} options - Response options
 */
function sendErrorResponse(res, error, options = {}) {
  const { includeStack = false, logError = true } = options;
  
  // Log error if requested
  if (logError) {
    console.error('API Error:', error);
  }
  
  // Determine status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (error && error.status) {
    statusCode = error.status;
  }
  
  // Format and send response
  const errorResponse = formatErrorResponse(error, includeStack);
  res.status(statusCode).json(errorResponse);
}

/**
 * Create error handler middleware
 * @param {Object} options - Error handler options
 * @returns {Function} Error handler middleware
 */
function createErrorHandler(options = {}) {
  const { 
    includeStack = process.env.NODE_ENV === 'development',
    logError = true 
  } = options;
  
  return function errorHandler(error, req, res) {
    sendErrorResponse(res, error, { includeStack, logError });
  };
}

/**
 * Wrap async functions to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
function asyncHandler(fn) {
  return function(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate method and send error if not allowed
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Array<string>} allowedMethods - Allowed HTTP methods
 * @returns {boolean} True if method is allowed
 */
function validateMethod(req, res, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    sendErrorResponse(res, new AppError(
      ERROR_TYPES.METHOD_NOT_ALLOWED,
      `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`
    ));
    return false;
  }
  return true;
}

/**
 * Create common API error instances
 */
const createError = {
  validation: (message, details = null) => 
    new AppError(ERROR_TYPES.VALIDATION_ERROR, message, details),
  
  rateLimit: (message = null) => 
    new AppError(ERROR_TYPES.RATE_LIMIT_ERROR, message),
  
  authentication: (message = null) => 
    new AppError(ERROR_TYPES.AUTHENTICATION_ERROR, message),
  
  authorization: (message = null) => 
    new AppError(ERROR_TYPES.AUTHORIZATION_ERROR, message),
  
  externalApi: (message, details = null) => 
    new AppError(ERROR_TYPES.EXTERNAL_API_ERROR, message, details),
  
  internal: (message = null, details = null) => 
    new AppError(ERROR_TYPES.INTERNAL_ERROR, message, details),
  
  notFound: (message = null) => 
    new AppError(ERROR_TYPES.NOT_FOUND_ERROR, message),
  
  methodNotAllowed: (method, allowedMethods = []) => 
    new AppError(
      ERROR_TYPES.METHOD_NOT_ALLOWED, 
      `Method ${method} not allowed. Allowed: ${allowedMethods.join(', ')}`
    )
};

module.exports = {
  AppError,
  ERROR_TYPES,
  ERROR_STATUS_CODES,
  ERROR_MESSAGES,
  formatErrorResponse,
  sendErrorResponse,
  createErrorHandler,
  asyncHandler,
  validateMethod,
  createError
};