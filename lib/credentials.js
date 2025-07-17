/**
 * @file lib/credentials.js
 * @description Handles Google Cloud credentials management for the application.
 */

const getGoogleCredentials = () => {
  // Always use the base64 encoded JSON from GOOGLE_SERVICE_ACCOUNT_KEY
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
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
};

const validateEnvironment = () => {
  const required = [
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_CLOUD_LOCATION',
    'GOOGLE_SERVICE_ACCOUNT_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = {
  getGoogleCredentials,
  validateEnvironment
};