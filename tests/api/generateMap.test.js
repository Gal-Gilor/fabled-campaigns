/**
 * Tests for map generation API endpoint
 */

const request = require('supertest');

// Mock the dependencies
jest.mock('../../lib/imagenService');
jest.mock('../../lib/middleware/rateLimiter');

const { rateLimit } = require('../../lib/middleware/rateLimiter');

// Create a mock Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Mock the handler function
let handler;

beforeAll(() => {
  // Import the handler after mocks are set up
  handler = require('../../api/maps/generateMap').default;
  
  // Set up the route
  app.post('/api/maps/generateMap', (req, res) => {
    handler(req, res);
  });
  
  // Add OPTIONS route for CORS
  app.options('/api/maps/generateMap', (req, res) => {
    handler(req, res);
  });
});

describe('Generate Map API', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock rate limiter to allow requests by default
    rateLimit.mockReturnValue(true);
  });

  test('should handle CORS preflight requests', async () => {
    const response = await request(app)
      .options('/api/maps/generateMap');
    
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://fabled-campaigns.vercel.app');
  });

  test('should reject non-POST requests', async () => {
    const response = await request(app)
      .get('/api/maps/generateMap');
    
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('METHOD_NOT_ALLOWED');
  });

  test('should reject requests when rate limited', async () => {
    // Mock rate limiter to block request
    rateLimit.mockReturnValue(false);
    
    const response = await request(app)
      .post('/api/maps/generateMap')
      .send({
        terrain: 'forest',
        setting: 'tavern'
      });
    
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('RATE_LIMIT_ERROR');
  });

  test('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/maps/generateMap')
      .send({
        // Missing required terrain field
        setting: 'tavern'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
    expect(response.body.message).toContain('terrain is required');
  });

  test('should validate terrain values', async () => {
    const response = await request(app)
      .post('/api/maps/generateMap')
      .send({
        terrain: 'invalid-terrain',
        setting: 'tavern'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_ERROR');
  });

  test('should apply default values for optional fields', async () => {
    // Mock ImagenService to return success
    const mockImagenService = require('../../lib/imagenService');
    mockImagenService.mockImplementation(() => ({
      generateMapImage: jest.fn().mockResolvedValue({
        success: true,
        imageUrl: 'data:image/png;base64,test',
        metadata: {
          model: 'imagen-3.0-generate-002',
          generatedAt: new Date().toISOString()
        }
      })
    }));

    const response = await request(app)
      .post('/api/maps/generateMap')
      .send({
        terrain: 'forest'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.metadata.size).toBe('size-20x20'); // Default size
    expect(response.body.generatedName).toBeDefined();
  });

  test('should handle map generation errors gracefully', async () => {
    // Mock ImagenService to return error
    const mockImagenService = require('../../lib/imagenService');
    mockImagenService.mockImplementation(() => ({
      generateMapImage: jest.fn().mockResolvedValue({
        success: false,
        error: 'AI service unavailable'
      })
    }));

    const response = await request(app)
      .post('/api/maps/generateMap')
      .send({
        terrain: 'forest',
        setting: 'tavern',
        name: 'Test Map',
        description: 'A test map'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.fallback).toBe(true);
    expect(response.body.error).toBe('AI service unavailable');
  });

  test('should generate name when not provided', async () => {
    // Mock ImagenService
    const mockImagenService = require('../../lib/imagenService');
    mockImagenService.mockImplementation(() => ({
      generateMapImage: jest.fn().mockResolvedValue({
        success: true,
        imageUrl: 'data:image/png;base64,test',
        metadata: {
          model: 'imagen-3.0-generate-002',
          generatedAt: new Date().toISOString()
        }
      })
    }));

    const response = await request(app)
      .post('/api/maps/generateMap')
      .send({
        terrain: 'forest',
        setting: 'tavern'
        // No name provided
      });
    
    expect(response.status).toBe(200);
    expect(response.body.generatedName).toBeDefined();
    expect(response.body.generatedName).not.toBe('');
    expect(response.body.metadata.name).toBeDefined();
  });
});