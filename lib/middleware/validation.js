/**
 * Input validation utilities
 * Centralized validation logic for API endpoints
 */

const { PLACE_TYPES, TERRAIN_ELEMENTS } = require('../nameConstants');

/**
 * Validation rules and constraints
 */
const VALIDATION_RULES = {
  MAP_NAME: {
    maxLength: 100,
    required: false
  },
  MAP_DESCRIPTION: {
    maxLength: 1000,
    required: false
  },
  TERRAIN: {
    required: true,
    allowedValues: () => Object.keys(TERRAIN_ELEMENTS)
  },
  SETTING: {
    required: false,
    allowedValues: () => Object.keys(PLACE_TYPES)
  },
  MAP_SIZE: {
    required: false,
    allowedValues: ['size-20x20', 'size-30x30', 'size-40x40'],
    default: 'size-20x20'
  },
  GENERATION_MODE: {
    required: false,
    allowedValues: ['quick', 'detailed'],
    default: 'detailed'
  },
  NAME_DESCRIPTION: {
    maxLength: 2000,
    required: false
  }
};

/**
 * Generic validation error class
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate string field
 * @param {any} value - Value to validate
 * @param {Object} rules - Validation rules
 * @param {string} fieldName - Field name for error messages
 * @returns {Object} Validation result
 */
function validateString(value, rules, fieldName) {
  const errors = [];
  
  // Check if required
  if (rules.required && (!value || value.trim() === '')) {
    errors.push(`${fieldName} is required`);
    return { valid: false, errors };
  }
  
  // Skip further validation if value is empty and not required
  if (!value || value.trim() === '') {
    return { valid: true, errors: [] };
  }
  
  // Check type
  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a string`);
  }
  
  // Check length
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`${fieldName} exceeds maximum length of ${rules.maxLength} characters`);
  }
  
  // Check allowed values
  if (rules.allowedValues) {
    const allowed = typeof rules.allowedValues === 'function' 
      ? rules.allowedValues() 
      : rules.allowedValues;
    if (!allowed.includes(value)) {
      errors.push(`${fieldName} must be one of: ${allowed.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate map generation parameters
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result with errors and sanitized data
 */
function validateMapParams(params) {
  const errors = [];
  const sanitized = {};
  
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      errors: ['Invalid request body - must be a valid object'],
      sanitized: {}
    };
  }
  
  // Validate name
  const nameValidation = validateString(params.name, VALIDATION_RULES.MAP_NAME, 'name');
  if (!nameValidation.valid) {
    errors.push(...nameValidation.errors);
  } else {
    sanitized.name = params.name?.trim() || null;
  }
  
  // Validate description
  const descValidation = validateString(params.description, VALIDATION_RULES.MAP_DESCRIPTION, 'description');
  if (!descValidation.valid) {
    errors.push(...descValidation.errors);
  } else {
    sanitized.description = params.description?.trim() || null;
  }
  
  // Validate terrain (required)
  const terrainValidation = validateString(params.terrain, VALIDATION_RULES.TERRAIN, 'terrain');
  if (!terrainValidation.valid) {
    errors.push(...terrainValidation.errors);
  } else {
    sanitized.terrain = params.terrain;
  }
  
  // Validate setting (optional)
  const settingValidation = validateString(params.setting, VALIDATION_RULES.SETTING, 'setting');
  if (!settingValidation.valid) {
    errors.push(...settingValidation.errors);
  } else {
    sanitized.setting = params.setting || null;
  }
  
  // Validate size
  const sizeValidation = validateString(params.size, VALIDATION_RULES.MAP_SIZE, 'size');
  if (!sizeValidation.valid) {
    errors.push(...sizeValidation.errors);
  } else {
    sanitized.size = params.size || VALIDATION_RULES.MAP_SIZE.default;
  }
  
  // Validate generation mode
  const modeValidation = validateString(params.generationMode, VALIDATION_RULES.GENERATION_MODE, 'generationMode');
  if (!modeValidation.valid) {
    errors.push(...modeValidation.errors);
  } else {
    sanitized.generationMode = params.generationMode || VALIDATION_RULES.GENERATION_MODE.default;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate name generation parameters
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result with errors and sanitized data
 */
function validateNameParams(params) {
  const errors = [];
  const sanitized = {};
  
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      errors: ['Invalid request body - must be a valid object'],
      sanitized: {}
    };
  }
  
  // At least one of terrain or setting must be provided
  if (!params.terrain && !params.setting) {
    errors.push('Either terrain or setting must be provided');
  }
  
  // Validate terrain (optional for name generation)
  if (params.terrain) {
    const terrainValidation = validateString(params.terrain, VALIDATION_RULES.TERRAIN, 'terrain');
    if (!terrainValidation.valid) {
      errors.push(...terrainValidation.errors);
    } else {
      sanitized.terrain = params.terrain;
    }
  }
  
  // Validate setting (optional for name generation)
  if (params.setting) {
    const settingValidation = validateString(params.setting, VALIDATION_RULES.SETTING, 'setting');
    if (!settingValidation.valid) {
      errors.push(...settingValidation.errors);
    } else {
      sanitized.setting = params.setting;
    }
  }
  
  // Validate description
  const descValidation = validateString(params.description, VALIDATION_RULES.NAME_DESCRIPTION, 'description');
  if (!descValidation.valid) {
    errors.push(...descValidation.errors);
  } else {
    sanitized.description = params.description?.trim() || null;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Sanitize and validate request body
 * @param {Object} body - Request body
 * @param {string} type - Validation type ('map' or 'name')
 * @returns {Object} Validation result
 */
function validateRequest(body, type) {
  switch (type) {
    case 'map':
      return validateMapParams(body);
    case 'name':
      return validateNameParams(body);
    default:
      return {
        valid: false,
        errors: [`Unknown validation type: ${type}`],
        sanitized: {}
      };
  }
}

/**
 * Create validation middleware
 * @param {string} type - Validation type
 * @returns {Function} Validation middleware function
 */
function createValidationMiddleware(type) {
  return function validationMiddleware(req, res, next) {
    const validation = validateRequest(req.body, type);
    
    if (!validation.valid) {
      if (next) {
        return next({
          status: 400,
          error: 'Invalid parameters',
          message: validation.errors.join(', '),
          details: validation.errors
        });
      }
      return false;
    }
    
    // Attach sanitized data to request
    req.validatedBody = validation.sanitized;
    
    if (next) next();
    return true;
  };
}

module.exports = {
  validateMapParams,
  validateNameParams,
  validateRequest,
  createValidationMiddleware,
  ValidationError,
  VALIDATION_RULES
};