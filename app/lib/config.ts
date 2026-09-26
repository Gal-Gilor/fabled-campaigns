export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';
export const GEMINI_IMAGE_LOCATION = 'global';
export const CHAT_API_PATH = '/api/chat';
export const DEFAULT_GCP_LOCATION = 'us-central1';

export const IMAGE_SIZES = ['1K', '2K', '4K'] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
export const DEFAULT_IMAGE_SIZE: ImageSize = '1K';
export const MAP_ASPECT_RATIO = '4:3';

// Token-based context window — 200k practical cap, evict at 90%
export const TOKEN_EVICTION_THRESHOLD = 180_000; // 90% of 200k TOKEN_LIMIT

// Characters reserved for system prompt (~1,600 chars), tool schemas (~2,000 chars),
// rendered summary block (~2,000 chars max), and expected response headroom.
// Set generously — over-reserving costs a few fewer messages in the window.
// Campaign lore is reserved on top of this, per-request (see prepareContext).
export const TOKEN_OVERHEAD_RESERVE_CHARS = 15_000; // characters, not tokens

// Hard cap on campaign lore length, enforced at the API on write
export const CAMPAIGN_LORE_MAX_CHARS = 20_000;
