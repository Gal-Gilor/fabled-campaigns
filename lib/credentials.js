/**
 * Google Cloud Credentials Management
 * Handles service account authentication for both local development and Vercel deployment
 */

const getGoogleCredentials = () => {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    // Vercel deployment - use base64 encoded JSON
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required for production');
    }
    
    try {
      const credentials = JSON.parse(
        Buffer.from(serviceAccountKey, 'base64').toString('utf8')
      );
      
      // Validate required fields
      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        throw new Error('Invalid service account credentials');
      }
      
      return credentials;
    } catch (error) {
      throw new Error(`Failed to parse service account credentials: ${error.message}`);
    }
  } else {
    // Local development - use file path or environment variable
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
};

const validateEnvironment = () => {
  const required = [
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_CLOUD_LOCATION'
  ];
  
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    required.push('GOOGLE_SERVICE_ACCOUNT_KEY');
  } else {
    required.push('GOOGLE_APPLICATION_CREDENTIALS');
  }
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = {
  getGoogleCredentials,
  validateEnvironment
};