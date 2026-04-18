/**
 * @file lib/credentials.js
 * @description Handles Google Cloud credentials management for the application.
 */

const getGoogleCredentials = () => {
  // Check for production environment (base64 encoded JSON)
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const credentials = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));

      // Validate required fields
      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        throw new Error('Invalid service account credentials');
      }

      return credentials;
    } catch (error) {
      throw new Error(`Failed to parse service account credentials: ${error.message}`);
    }
  }

  // Check for development environment (file path)
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath) {
    try {
      const fs = require('fs');
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      // Validate required fields
      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        throw new Error('Invalid service account credentials');
      }

      return credentials;
    } catch (error) {
      throw new Error(`Failed to read credentials file: ${error.message}`);
    }
  }

  throw new Error(
    'Either GOOGLE_SERVICE_ACCOUNT_KEY (base64) or GOOGLE_APPLICATION_CREDENTIALS (file path) environment variable is required'
  );
};

const validateEnvironment = () => {
  const required = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION'];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Check that at least one credential method is available
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'Either GOOGLE_SERVICE_ACCOUNT_KEY (base64) or GOOGLE_APPLICATION_CREDENTIALS (file path) must be provided'
    );
  }
};

module.exports = {
  getGoogleCredentials,
  validateEnvironment
};
