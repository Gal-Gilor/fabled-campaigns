/**
 * Google Gemini Name Generator Service
 * Handles AI-powered name generation for fantasy campaigns using Google's Gemini model
 */

const { GoogleGenAI } = require('@google/genai');
const { validateEnvironment } = require('./credentials');
const { getRecommendedModel, getRecommendedConfig } = require('./models');

class NameGeneratorService {
  constructor() {
    try {
      validateEnvironment();
      
      this.client = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: process.env.GOOGLE_CLOUD_LOCATION
      });
      
    } catch (error) {
      console.error('Failed to initialize NameGeneratorService:', error);
      throw error;
    }
  }

  /**
   * Generate character names
   * @param {Object} params - Name generation parameters
   * @param {string} params.race - Character race (elf, dwarf, human, etc.)
   * @param {string} params.gender - Character gender (male, female, neutral)
   * @param {string} params.culture - Cultural background (optional)
   * @param {number} params.count - Number of names to generate (default: 5)
   * @returns {Promise<Object>} Generated names response
   */
  async generateCharacterNames(params) {
    const { race = 'human', gender = 'neutral', culture = '', count = 5 } = params;
    
    const prompt = this.buildCharacterNamePrompt(race, gender, culture, count);
    
    try {
      const response = await this.client.models.generateText({
        model: getRecommendedModel('name-generation'),
        prompt: prompt,
        config: getRecommendedConfig('name-generation')
      });
      
      const names = this.parseNamesFromResponse(response.text);
      
      return {
        success: true,
        names: names,
        metadata: {
          type: 'character',
          race,
          gender,
          culture,
          count: names.length,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Character name generation failed:', error);
      return this.generateFallbackNames('character', params);
    }
  }

  /**
   * Generate place names
   * @param {Object} params - Place name generation parameters
   * @param {string} params.type - Place type (city, town, village, dungeon, etc.)
   * @param {string} params.terrain - Terrain type (mountain, forest, desert, etc.)
   * @param {string} params.theme - Theme or culture (medieval, ancient, mystical, etc.)
   * @param {number} params.count - Number of names to generate (default: 5)
   * @returns {Promise<Object>} Generated names response
   */
  async generatePlaceNames(params) {
    const { type = 'town', terrain = 'temperate', theme = 'medieval', count = 5 } = params;
    
    const prompt = this.buildPlaceNamePrompt(type, terrain, theme, count);
    
    try {
      const response = await this.client.models.generateText({
        model: getRecommendedModel('name-generation'),
        prompt: prompt,
        config: getRecommendedConfig('name-generation')
      });
      
      const names = this.parseNamesFromResponse(response.text);
      
      return {
        success: true,
        names: names,
        metadata: {
          type: 'place',
          placeType: type,
          terrain,
          theme,
          count: names.length,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Place name generation failed:', error);
      return this.generateFallbackNames('place', params);
    }
  }

  /**
   * Generate organization names (guilds, companies, factions, etc.)
   * @param {Object} params - Organization name generation parameters
   * @param {string} params.type - Organization type (guild, company, order, etc.)
   * @param {string} params.theme - Theme (mercantile, religious, military, etc.)
   * @param {string} params.alignment - Moral alignment (good, neutral, evil)
   * @param {number} params.count - Number of names to generate (default: 5)
   * @returns {Promise<Object>} Generated names response
   */
  async generateOrganizationNames(params) {
    const { type = 'guild', theme = 'mercantile', alignment = 'neutral', count = 5 } = params;
    
    const prompt = this.buildOrganizationNamePrompt(type, theme, alignment, count);
    
    try {
      const response = await this.client.models.generateText({
        model: getRecommendedModel('name-generation'),
        prompt: prompt,
        config: getRecommendedConfig('name-generation')
      });
      
      const names = this.parseNamesFromResponse(response.text);
      
      return {
        success: true,
        names: names,
        metadata: {
          type: 'organization',
          orgType: type,
          theme,
          alignment,
          count: names.length,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Organization name generation failed:', error);
      return this.generateFallbackNames('organization', params);
    }
  }

  /**
   * Generate custom names based on free-form input
   * @param {string} input - Custom prompt/description
   * @param {number} count - Number of names to generate (default: 5)
   * @returns {Promise<Object>} Generated names response
   */
  async generateCustomNames(input, count = 5) {
    const prompt = this.buildCustomNamePrompt(input, count);
    
    try {
      const response = await this.client.models.generateText({
        model: getRecommendedModel('name-generation'),
        prompt: prompt,
        config: getRecommendedConfig('name-generation')
      });
      
      const names = this.parseNamesFromResponse(response.text);
      
      return {
        success: true,
        names: names,
        metadata: {
          type: 'custom',
          input: input,
          count: names.length,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Custom name generation failed:', error);
      return this.generateFallbackNames('custom', { input, count });
    }
  }

  /**
   * Build character name generation prompt
   */
  buildCharacterNamePrompt(race, gender, culture, count) {
    let prompt = `Generate ${count} fantasy character names for a ${race}`;
    
    if (gender !== 'neutral') {
      prompt += ` ${gender}`;
    }
    
    if (culture) {
      prompt += ` with ${culture} cultural influences`;
    }
    
    prompt += `. Requirements:
- Names should be appropriate for tabletop RPG characters
- Include both first names and surnames where appropriate
- Names should sound authentic to the race and culture
- Avoid real-world copyrighted names
- Format: Return only the names, one per line
- No numbering, bullets, or extra text`;

    return prompt;
  }

  /**
   * Build place name generation prompt
   */
  buildPlaceNamePrompt(type, terrain, theme, count) {
    const prompt = `Generate ${count} fantasy ${type} names for a ${theme} setting in ${terrain} terrain. Requirements:
- Names should evoke the terrain and theme
- Suitable for D&D campaigns and fantasy RPGs
- Names should be memorable and pronounceable
- Include variety in length and style
- Avoid real-world copyrighted names
- Format: Return only the names, one per line
- No numbering, bullets, or extra text`;

    return prompt;
  }

  /**
   * Build organization name generation prompt
   */
  buildOrganizationNamePrompt(type, theme, alignment, count) {
    const prompt = `Generate ${count} fantasy ${type} names with a ${theme} focus and ${alignment} alignment. Requirements:
- Names should reflect the organization's purpose and moral stance
- Suitable for D&D campaigns and fantasy RPGs
- Include variety (some formal, some informal)
- Names should be memorable and evocative
- Avoid real-world copyrighted names
- Format: Return only the names, one per line
- No numbering, bullets, or extra text`;

    return prompt;
  }

  /**
   * Build custom name generation prompt
   */
  buildCustomNamePrompt(input, count) {
    const prompt = `Based on this description: "${input}"
Generate ${count} appropriate fantasy names. Requirements:
- Names should match the theme and context provided
- Suitable for tabletop RPG use
- Creative and memorable
- Avoid real-world copyrighted names
- Format: Return only the names, one per line
- No numbering, bullets, or extra text`;

    return prompt;
  }

  /**
   * Parse names from AI response text
   */
  parseNamesFromResponse(responseText) {
    if (!responseText) return [];
    
    // Split by lines and clean up
    const lines = responseText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+[\.\)]/)) // Remove numbered lines
      .filter(line => !line.match(/^[-\*]/)) // Remove bullet points
      .map(line => line.replace(/^["']|["']$/g, '')); // Remove quotes
    
    return lines;
  }

  /**
   * Generate fallback names when AI generation fails
   */
  generateFallbackNames(type, params) {
    const count = params.count || 5;
    const names = [];
    
    for (let i = 0; i < count; i++) {
      names.push(this.generateRandomName(type, params));
    }

    return {
      success: false,
      names: names,
      error: 'AI generation failed, using fallback names',
      metadata: {
        type: type,
        fallback: true,
        parameters: params,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Generate random fallback names based on type
   */
  generateRandomName(type, params = {}) {
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
  }

  /**
   * Generate random character names
   */
  generateRandomCharacterName(params) {
    const firstNames = {
      male: ['Aldric', 'Gareth', 'Thorin', 'Cedric', 'Magnus', 'Rowan', 'Darian', 'Kael', 'Theron', 'Vance'],
      female: ['Aelyn', 'Lyra', 'Sera', 'Aria', 'Zara', 'Naia', 'Vera', 'Mira', 'Elara', 'Kira'],
      neutral: ['Sage', 'River', 'Storm', 'Phoenix', 'Vale', 'Quinn', 'Rowan', 'Blair', 'Ember', 'Rain']
    };
    
    const surnames = ['Brightblade', 'Ironforge', 'Stormwind', 'Moonwhisper', 'Nightshade', 'Goldleaf', 
                     'Shadowmere', 'Starfall', 'Thornwick', 'Dawnbringer', 'Frostborn', 'Flameheart',
                     'Swiftarrow', 'Ironhold', 'Silvermoon', 'Blackstone', 'Redmane', 'Whitehawk'];
    
    const gender = params.gender || 'neutral';
    const namePool = firstNames[gender] || firstNames.neutral;
    
    const firstName = namePool[Math.floor(Math.random() * namePool.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    
    return `${firstName} ${lastName}`;
  }

  /**
   * Generate random place names
   */
  generateRandomPlaceName() {
    const adjectives = ['Golden', 'Silver', 'Ancient', 'Mystic', 'Royal', 'Hidden', 'Sacred', 'Lost', 
                       'Enchanted', 'Forgotten', 'Emerald', 'Crystal', 'Shadow', 'Crimson', 'Azure',
                       'Amber', 'Ivory', 'Obsidian', 'Twilight', 'Dawn', 'Storm', 'Frost', 'Fire',
                       'Wind', 'Stone', 'Iron', 'Bronze', 'Marble', 'Granite', 'Cedar'];
    
    const placeNouns = ['Haven', 'Lodge', 'Keep', 'Hall', 'Inn', 'Sanctuary', 'Chamber', 'Grove', 
                       'Rest', 'Refuge', 'Peak', 'Valley', 'Falls', 'Bridge', 'Gate', 'Tower',
                       'Spire', 'Harbor', 'Bay', 'Shore', 'Ridge', 'Hollow', 'Dell', 'Moor',
                       'Wick', 'Ford', 'Cross', 'Point', 'Rock', 'Hill'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = placeNouns[Math.floor(Math.random() * placeNouns.length)];
    
    return `${adjective} ${noun}`;
  }

  /**
   * Generate random organization names
   */
  generateRandomOrganizationName() {
    const prefixes = ['The', 'Order of the', 'Brotherhood of', 'Company of', 'Guild of the', 
                     'Circle of', 'Alliance of', 'Society of the', 'League of', 'Covenant of the'];
    
    const adjectives = ['Silver', 'Golden', 'Crimson', 'Azure', 'Emerald', 'Iron', 'Steel', 'Crystal',
                       'Shadow', 'Light', 'Sacred', 'Ancient', 'Noble', 'Royal', 'Elite', 'Mystic',
                       'Arcane', 'Divine', 'Eternal', 'Infinite', 'Radiant', 'Obsidian', 'Amber'];
    
    const orgNouns = ['Order', 'Company', 'Guild', 'Brotherhood', 'Circle', 'Alliance', 'Society',
                     'League', 'Covenant', 'Council', 'Assembly', 'Union', 'Fellowship', 'Consortium',
                     'Syndicate', 'Collective', 'Conclave', 'Chamber', 'House', 'Clan', 'Banner',
                     'Shield', 'Sword', 'Crown', 'Throne', 'Dawn', 'Dusk', 'Star', 'Moon', 'Sun'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = orgNouns[Math.floor(Math.random() * orgNouns.length)];
    
    // Sometimes use just adjective + noun, sometimes use all three
    if (Math.random() > 0.5) {
      return `${prefix} ${adjective} ${noun}`;
    } else {
      return `The ${adjective} ${noun}`;
    }
  }

  /**
   * Generate random generic fantasy names
   */
  generateRandomGenericName() {
    const adjectives = ['Golden', 'Silver', 'Ancient', 'Mystic', 'Royal', 'Hidden', 'Sacred', 'Lost', 
                       'Enchanted', 'Forgotten', 'Emerald', 'Crystal', 'Shadow', 'Crimson', 'Azure',
                       'Twilight', 'Dawn', 'Storm', 'Frost', 'Fire', 'Wind', 'Stone', 'Iron',
                       'Ethereal', 'Celestial', 'Arcane', 'Divine', 'Eternal', 'Radiant', 'Spectral'];
    
    const nouns = ['Haven', 'Lodge', 'Keep', 'Hall', 'Sanctuary', 'Chamber', 'Grove', 'Rest', 'Refuge',
                   'Realm', 'Domain', 'Expanse', 'Sphere', 'Plane', 'Dimension', 'Nexus', 'Core',
                   'Heart', 'Soul', 'Spirit', 'Essence', 'Force', 'Power', 'Energy', 'Aura',
                   'Blade', 'Shield', 'Crown', 'Throne', 'Scepter', 'Orb', 'Gem', 'Crystal'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `The ${adjective} ${noun}`;
  }

  /**
   * Batch generate multiple types of names
   * @param {Array} requests - Array of generation requests
   * @returns {Promise<Object>} Batch results
   */
  async batchGenerate(requests) {
    const results = {};
    
    for (const request of requests) {
      const { id, type, params } = request;
      
      try {
        let result;
        switch (type) {
          case 'character':
            result = await this.generateCharacterNames(params);
            break;
          case 'place':
            result = await this.generatePlaceNames(params);
            break;
          case 'organization':
            result = await this.generateOrganizationNames(params);
            break;
          case 'custom':
            result = await this.generateCustomNames(params.input, params.count);
            break;
          default:
            throw new Error(`Unknown generation type: ${type}`);
        }
        
        results[id] = result;
        
      } catch (error) {
        console.error(`Batch generation failed for ${id}:`, error);
        results[id] = this.generateFallbackNames(type, params);
      }
    }
    
    return {
      success: true,
      results: results,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = NameGeneratorService;