export const GEMINI_MODEL = 'gemini-2.5-flash';
// Reserved for the upcoming image-editing tool.
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
export const IMAGEN_MODEL = 'imagen-3.0-generate-002';
export const CHAT_API_PATH = '/api/chat';
export const DEFAULT_GCP_LOCATION = 'us-central1';

export const NEGATIVE_PROMPT =
  'names, text, labels, legends, creatures, characters, people, miniatures, minis, figures, figurines, frontal view, front view, side view, bottom-up, close-up, soft focus, extreme close-up, zoomed-in, zoom in, low quality, low resolution, bad quality, bad resolution';

// Token-based context window — 200k practical cap, evict at 90%
export const TOKEN_EVICTION_THRESHOLD = 180_000; // 90% of 200k TOKEN_LIMIT

// Characters reserved for system prompt (~1,600 chars), tool schemas (~2,000 chars),
// rendered summary block (~2,000 chars max), and expected response headroom.
// Set generously — over-reserving costs a few fewer messages in the window.
export const TOKEN_OVERHEAD_RESERVE_CHARS = 15_000; // characters, not tokens
