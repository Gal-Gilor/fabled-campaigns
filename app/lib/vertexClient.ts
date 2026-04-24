import { createVertex } from '@ai-sdk/google-vertex';
import { DEFAULT_GCP_LOCATION } from './config';

function getGoogleAuthOptions() {
  const encodedKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) return undefined;
  try {
    const credentials = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf-8'));
    return { credentials };
  } catch {
    return undefined;
  }
}

export const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? DEFAULT_GCP_LOCATION,
  googleAuthOptions: getGoogleAuthOptions(),
});