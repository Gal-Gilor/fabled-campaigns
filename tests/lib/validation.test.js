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
        detailLevel: 'detail-high',
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
      expect(result.errors).toContain('terrain must be one of: forest, grassland, hills, mountain, desert, ocean, swamp, underground, tundra, jungle, volcanic, coastal, badlands, urban, industrial, indoor, underdark, feywild, shadowfell');
    });

    test('should require at least one of terrain or setting', () => {
      const params = {
        name: 'Test Map',
        description: 'A test map'
      };

      const result = validateMapParams(params);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either terrain or setting must be provided');
    });

    test('should accept terrain only (no setting)', () => {
      const params = {
        terrain: 'forest',
        description: 'A forest map'
      };

      const result = validateMapParams(params);

      expect(result.valid).toBe(true);
      expect(result.sanitized.terrain).toBe('forest');
      expect(result.sanitized.setting).toBe(null);
    });

    test('should accept setting only (no terrain)', () => {
      const params = {
        setting: 'tavern',
        description: 'A tavern map'
      };

      const result = validateMapParams(params);

      expect(result.valid).toBe(true);
      expect(result.sanitized.terrain).toBe(null);
      expect(result.sanitized.setting).toBe('tavern');
    });

    test('should apply default values', () => {
      const params = {
        terrain: 'forest'
      };

      const result = validateMapParams(params);

      expect(result.valid).toBe(true);
      expect(result.sanitized.detailLevel).toBe(null); // No default for detailLevel - only set when explicitly provided
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