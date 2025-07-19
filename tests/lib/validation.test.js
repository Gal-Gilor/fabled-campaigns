/**
 * Tests for validation middleware
 */

const { validateMapParams, validateNameParams } = require('../../lib/middleware/validation');

describe('Validation Middleware', () => {
  describe('validateMapParams', () => {
    test('should validate valid map parameters', () => {
      const params = {
        name: 'Test Map',
        description: 'A test map for validation',
        terrain: 'forest',
        setting: 'tavern',
        size: 'size-30x30',
        generationMode: 'detailed'
      };

      const result = validateMapParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized.name).toBe('Test Map');
      expect(result.sanitized.terrain).toBe('forest');
    });

    test('should reject invalid terrain', () => {
      const params = {
        terrain: 'invalid-terrain'
      };

      const result = validateMapParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('terrain must be one of: forest, grassland, mountain, desert, tundra, jungle, swamp, ocean, underground, volcanic, coastal, badlands');
    });

    test('should handle missing required terrain', () => {
      const params = {
        name: 'Test Map'
      };

      const result = validateMapParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('terrain is required');
    });

    test('should apply default values', () => {
      const params = {
        terrain: 'forest'
      };

      const result = validateMapParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized.size).toBe('size-20x20');
      expect(result.sanitized.generationMode).toBe('detailed');
    });

    test('should trim string inputs', () => {
      const params = {
        name: '  Test Map  ',
        description: '  Test description  ',
        terrain: 'forest'
      };

      const result = validateMapParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized.name).toBe('Test Map');
      expect(result.sanitized.description).toBe('Test description');
    });
  });

  describe('validateNameParams', () => {
    test('should validate valid name parameters', () => {
      const params = {
        terrain: 'forest',
        setting: 'tavern',
        description: 'A cozy tavern'
      };

      const result = validateNameParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitized.terrain).toBe('forest');
      expect(result.sanitized.setting).toBe('tavern');
    });

    test('should require either terrain or setting', () => {
      const params = {
        description: 'Test description'
      };

      const result = validateNameParams(params);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either terrain or setting must be provided');
    });

    test('should accept terrain only', () => {
      const params = {
        terrain: 'mountain'
      };

      const result = validateNameParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized.terrain).toBe('mountain');
    });

    test('should accept setting only', () => {
      const params = {
        setting: 'castle'
      };

      const result = validateNameParams(params);
      
      expect(result.valid).toBe(true);
      expect(result.sanitized.setting).toBe('castle');
    });
  });
});