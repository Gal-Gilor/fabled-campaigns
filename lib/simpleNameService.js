/**
 * @file lib/simpleNameService.js
 * @description A lightweight name generation service.
 * This service is used as a fallback for generating names when requests to Gemini fail.
 */

// Import constants from the local module
const {
  RACE_NAMES,
  TERRAIN_ELEMENTS,
  PLACE_TYPES,
  ORGANIZATION_DATA,
  SYLLABLE_POOLS,
  GENERIC_ADJECTIVES,
  GENERIC_NOUNS,
  ORGANIZATION_PREFIXES,
  ALIGNMENT_ADJECTIVES,
  ORGANIZATION_NOUNS
} = require('./nameConstants');

function SimpleNameService() {
  // Track used names to avoid immediate duplicates
  this.recentNames = new Set();
  this.maxRecentNames = 1000;

  // Reference the imported constants
  this.RACE_NAMES = RACE_NAMES;
  this.TERRAIN_ELEMENTS = TERRAIN_ELEMENTS;
  this.PLACE_TYPES = PLACE_TYPES;
  this.ORGANIZATION_DATA = ORGANIZATION_DATA;
  this.SYLLABLE_POOLS = SYLLABLE_POOLS;
  this.GENERIC_ADJECTIVES = GENERIC_ADJECTIVES;
  this.GENERIC_NOUNS = GENERIC_NOUNS;
  this.ORGANIZATION_PREFIXES = ORGANIZATION_PREFIXES;
  this.ALIGNMENT_ADJECTIVES = ALIGNMENT_ADJECTIVES;
  this.ORGANIZATION_NOUNS = ORGANIZATION_NOUNS;
}

/**
 * Validate input parameters
 */
SimpleNameService.prototype.validateParams = function (type, params) {
  const errors = [];

  // Validate type
  const validTypes = ['character', 'place', 'organization', 'custom'];
  if (!validTypes.includes(type)) {
    errors.push('Invalid type: ' + type + '. Must be one of: ' + validTypes.join(', '));
  }

  // Validate count
  if (params.count !== undefined) {
    if (!Number.isInteger(params.count) || params.count < 1 || params.count > 50) {
      errors.push('Count must be an integer between 1 and 50');
    }
  }

  // Type-specific validation
  if (type === 'character') {
    if (params.race && !this.RACE_NAMES[params.race.toLowerCase()]) {
      errors.push(
        'Unknown race: ' +
          params.race +
          '. Available races: ' +
          Object.keys(this.RACE_NAMES).join(', ')
      );
    }
    if (params.gender && !['male', 'female', 'neutral'].includes(params.gender.toLowerCase())) {
      errors.push('Gender must be one of: male, female, neutral');
    }
  }

  if (type === 'place') {
    if (params.terrain && !this.TERRAIN_ELEMENTS[params.terrain.toLowerCase()]) {
      errors.push(
        'Unknown terrain: ' +
          params.terrain +
          '. Available terrains: ' +
          Object.keys(this.TERRAIN_ELEMENTS).join(', ')
      );
    }
    if (params.type && !this.PLACE_TYPES[params.type.toLowerCase()]) {
      errors.push(
        'Unknown place type: ' +
          params.type +
          '. Available types: ' +
          Object.keys(this.PLACE_TYPES).join(', ')
      );
    }
  }

  if (type === 'organization') {
    if (params.alignment && !['good', 'neutral', 'evil'].includes(params.alignment.toLowerCase())) {
      errors.push('Alignment must be one of: good, neutral, evil');
    }
  }

  return errors;
};

/**
 * Generate names using local algorithms
 */
SimpleNameService.prototype.generateNames = function (type, params) {
  params = params || {};

  try {
    // Validate inputs
    const validationErrors = this.validateParams(type, params);
    if (validationErrors.length > 0) {
      return {
        success: false,
        names: [],
        error: 'Validation failed: ' + validationErrors.join('; '),
        metadata: {
          type: type,
          method: 'simple_generation',
          validation_errors: validationErrors,
          generatedAt: new Date().toISOString()
        }
      };
    }

    const count = Math.min(params.count || 5, 50); // Cap at 50 names
    const names = [];
    let attempts = 0;
    const maxAttempts = count * 10; // Allow some retries for uniqueness

    while (names.length < count && attempts < maxAttempts) {
      const name = this.generateRandomName(type, params);

      // Check for uniqueness (avoid immediate duplicates)
      if (!this.recentNames.has(name) && !names.includes(name)) {
        names.push(name);
        this.addToRecentNames(name);
      }
      attempts++;
    }

    // If we couldn't generate enough unique names, fill with what we have
    while (names.length < count) {
      names.push(this.generateRandomName(type, params));
    }

    return {
      success: true,
      names: names,
      metadata: {
        type: type,
        method: 'simple_generation',
        parameters: params,
        uniqueness_attempts: attempts,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      names: [],
      error: 'Generation failed: ' + error.message,
      metadata: {
        type: type,
        method: 'simple_generation',
        error_details: error.stack,
        generatedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Add name to recent names cache to avoid immediate duplicates
 */
SimpleNameService.prototype.addToRecentNames = function (name) {
  this.recentNames.add(name);

  // Keep cache size manageable
  if (this.recentNames.size > this.maxRecentNames) {
    const oldNames = Array.from(this.recentNames).slice(0, this.maxRecentNames / 2);
    for (let i = 0; i < oldNames.length; i++) {
      this.recentNames.delete(oldNames[i]);
    }
  }
};

/**
 * Generate fallback names when AI generation fails (for compatibility)
 */
SimpleNameService.prototype.generateFallbackNames = function (type, params) {
  const result = this.generateNames(type, params);
  return {
    success: false,
    names: result.names,
    error: 'AI generation failed, using fallback names',
    metadata: {
      type: type,
      method: 'simple_generation',
      fallback: true,
      generatedAt: new Date().toISOString()
    }
  };
};

/**
 * Generate random fallback names based on type
 */
SimpleNameService.prototype.generateRandomName = function (type, params) {
  params = params || {};

  switch (type) {
  case 'character':
    return this.generateRandomCharacterName(params);
  case 'place':
    return this.generateRandomPlaceName(params);
  case 'organization':
    return this.generateRandomOrganizationName(params);
  default:
    return this.generateRandomGenericName();
  }
};

/**
 * Generate random character names with race-specific elements
 */
SimpleNameService.prototype.generateRandomCharacterName = function (params) {
  const race = params.race || 'human';
  const gender = params.gender || 'neutral';

  const defaultRace = this.RACE_NAMES.human;
  const raceData = this.RACE_NAMES[race.toLowerCase()] || defaultRace;
  const namePool = raceData[gender] || raceData.neutral || defaultRace.neutral;
  const surnamePool = raceData.surnames || defaultRace.surnames;

  // Generate using one of several patterns
  const patternIndex = Math.floor(Math.random() * 3);
  let firstName, lastName, nickname;

  switch (patternIndex) {
  case 0: // Standard: FirstName LastName
    firstName = namePool[Math.floor(Math.random() * namePool.length)];
    lastName = surnamePool[Math.floor(Math.random() * surnamePool.length)];
    return firstName + ' ' + lastName;

  case 1: // Sometimes use nicknames (10% chance)
    if (Math.random() > 0.9) {
      firstName = namePool[Math.floor(Math.random() * namePool.length)];
      const nicknames = [
        'the Bold',
        'the Wise',
        'the Swift',
        'the Brave',
        'the Kind',
        'the Fierce',
        'the Quiet'
      ];
      nickname = nicknames[Math.floor(Math.random() * nicknames.length)];
      return firstName + ' ' + nickname;
    } else {
      firstName = namePool[Math.floor(Math.random() * namePool.length)];
      lastName = surnamePool[Math.floor(Math.random() * surnamePool.length)];
      return firstName + ' ' + lastName;
    }

  case 2: // Cross-gender names occasionally (5% chance for neutral pool)
    if (gender === 'neutral' && Math.random() > 0.95) {
      const allGenders = ['male', 'female', 'neutral'];
      const randomGender = allGenders[Math.floor(Math.random() * allGenders.length)];
      const crossNamePool = raceData[randomGender] || namePool;
      firstName = crossNamePool[Math.floor(Math.random() * crossNamePool.length)];
    } else {
      firstName = namePool[Math.floor(Math.random() * namePool.length)];
    }
    lastName = surnamePool[Math.floor(Math.random() * surnamePool.length)];
    return firstName + ' ' + lastName;
  }
};

// Make the service available as a Node.js module
module.exports = SimpleNameService;
