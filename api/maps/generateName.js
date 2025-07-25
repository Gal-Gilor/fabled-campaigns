/**
 * Vercel Serverless Function: Name Generation API
 * Uses Gemini 2.0 Flash with fallback to local generation
 * Refactored to use shared utility modules
 */

const { GoogleGenAI } = require('@google/genai');
const { getGoogleCredentials, validateEnvironment } = require('../../lib/credentials');
const { getRecommendedModel } = require('../../lib/models');
const SimpleNameService = require('../../lib/simpleNameService');
const { rateLimit } = require('../../lib/middleware/rateLimiter');
const { setCorsHeaders, handlePreflight } = require('../../lib/middleware/cors');
const { validateRequest } = require('../../lib/middleware/validation');
const { sendErrorResponse, validateMethod, createError } = require('../../lib/utils/errorHandler');


function buildPrompt({ terrain, setting, description }) {
  let prompt = 'Generate a fantasy location name for:\n';
  
  if (terrain) prompt += `Terrain: ${terrain}\n`;
  if (setting) prompt += `Setting: ${setting}\n`;
  if (description) prompt += `Description: ${description}\n`;
  
  prompt += '\nCreate an evocative name suitable for a tabletop RPG battle map.';
  return prompt;
}

async function generateWithGemini(params) {
  validateEnvironment();
    
  // Get decoded credentials in memory only
  const credentials = getGoogleCredentials();
    
  // Use in-memory authentication without writing credentials to disk
  const client = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION,
    // Pass credentials directly to avoid file system usage
    googleAuthOptions: {
      credentials: credentials
    }
  });
    
  const model = getRecommendedModel('name-generation');
  const prompt = buildPrompt(params);
    
  const response = await client.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      temperature: 1.5,
      maxOutputTokens: 100,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        },
        propertyOrdering: ['name']
      }
    }
  });
    
  // Log Gemini I/O
  console.log('=== GEMINI NAME GENERATION ===');
  console.log('Model:', model);
  console.log('Response:', JSON.stringify(response, null, 2));
    
  if (!response?.text) {
    throw new Error('No response from Gemini');
  }
    
  // Parse the JSON response
  const parsedResponse = JSON.parse(response.text);
  const name = parsedResponse.name;
    
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid name in response');
  }
    
  return {
    success: true,
    name: name.trim(),
    metadata: {
      method: 'gemini',
      prompt,
      tokenUsage: response.metadata?.tokenUsage,
      generatedAt: new Date().toISOString()
    }
  };
}

function generateWithFallback(params) {
  const nameService = new SimpleNameService();
  const result = nameService.generateNames('place', {
    type: params.setting || params.terrain,
    terrain: params.terrain
  });
  
  const name = result.success && result.names.length > 0 
    ? result.names[0]
    : `The ${(params.terrain || 'Unknown').charAt(0).toUpperCase() + (params.terrain || 'unknown').slice(1)} ${(params.setting || 'Location').charAt(0).toUpperCase() + (params.setting || 'location').slice(1)}`;
  
  return {
    success: true,
    name,
    metadata: {
      method: 'fallback',
      generatedAt: new Date().toISOString()
    }
  };
}

export default async function handler(req, res) {
  try {
    // Set CORS headers
    setCorsHeaders(res);
    
    // Handle preflight requests
    if (handlePreflight(req, res)) {
      return;
    }
    
    // Validate HTTP method
    if (!validateMethod(req, res, ['POST'])) {
      return;
    }
    
    // Rate limiting (higher limit for name generation)
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!rateLimit(clientIp, 15 * 60 * 1000, 10)) { // 10 requests per 15 minutes
      return sendErrorResponse(res, createError.rateLimit('Too many name generation requests. Please try again later.'));
    }
    
    // Validate request body
    const validation = validateRequest(req.body, 'name');
    if (!validation.valid) {
      return sendErrorResponse(res, createError.validation(validation.errors.join(', '), validation.errors));
    }
    
    const { terrain, setting, description } = validation.sanitized;
    
    let result;
    try {
      result = await generateWithGemini({ terrain, setting, description });
    } catch (error) {
      result = generateWithFallback({ terrain, setting, description });
      result.metadata.geminiError = error.message;
    }
    
    res.status(200).json({
      success: result.success,
      name: result.name,
      metadata: {
        ...result.metadata,
        parameters: { terrain, setting, description }
      }
    });
    
  } catch (error) {
    console.error('Name generation error:', error);
    sendErrorResponse(res, createError.internal('Name generation failed', { originalError: error.message }));
  }
}