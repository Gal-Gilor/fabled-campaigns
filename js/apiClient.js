/**
 * API Client for backend communication
 * Handles all API calls to the map and name generation services
 */

/**
 * Calls the backend API to generate a fantasy location name
 * @param {Object} params - Name generation parameters (terrain, setting, description)
 * @returns {Promise<Object>} The generated name data from the API
 */
async function generateName(params) {
  try {
    const response = await fetch('/api/maps/generateName', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': window.VERCEL_BYPASS_SECRET || ''
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Name generation failed');
    }

    return result;
  } catch (error) {
    console.error('Name generation API call failed:', error);
    throw error;
  }
}

/**
 * Calls the backend API to generate a map using AI
 * @param {Object} params - Map generation parameters (name, description, terrain, etc.)
 * @returns {Promise<Object>} The generated map data from the API
 */
async function generateMap(params) {
  try {
    console.log('=== FRONTEND API CALL ===');
    console.log('Sending map generation request with params:', JSON.stringify(params, null, 2));

    const response = await fetch('/api/maps/generateMap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': window.VERCEL_BYPASS_SECRET || ''
      },
      body: JSON.stringify(params)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('Error response data:', JSON.stringify(errorData, null, 2));

      // Handle specific error types
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before trying again.');
      } else if (response.status === 400) {
        throw new Error(errorData.message || 'Invalid parameters provided.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }

      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Successful response data:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('API returned success=false:', result.error);
      throw new Error(result.error || 'Map generation failed');
    }

    return result;
  } catch (error) {
    console.error('Map generation API call failed:', error);
    throw error;
  }
}

/**
 * Generic API error handler
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function handleApiError(error) {
  console.error('API Error:', error);

  if (error.message.includes('Rate limit')) {
    return 'Too many requests. Please wait a moment before trying again.';
  } else if (error.message.includes('Invalid parameters')) {
    return 'Please check your input and try again.';
  } else if (error.message.includes('Server error')) {
    return 'Service temporarily unavailable. Please try again later.';
  } else if (error.message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}

// Expose API functions to global scope
window.generateName = generateName;
window.generateMap = generateMap;
window.handleApiError = handleApiError;
