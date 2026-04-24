import { createVertex } from '@ai-sdk/google-vertex';
import { DEFAULT_GCP_LOCATION } from './config';

function getGoogleAuthOptions() {
  const encodedKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) return undefined;

  const credentials = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf-8'));
  // Prevent Google Auth from treating GOOGLE_APPLICATION_CREDENTIALS as a file path.
  // On Vercel that variable may hold a base64 string (wrong type), causing ENAMETOOLONG.
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return { credentials };
}

export const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? DEFAULT_GCP_LOCATION,
  googleAuthOptions: getGoogleAuthOptions(),
});