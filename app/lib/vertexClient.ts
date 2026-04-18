import { createVertex } from '@ai-sdk/google-vertex';
import { DEFAULT_GCP_LOCATION } from './config';

export const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? DEFAULT_GCP_LOCATION,
});
