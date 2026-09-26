export const GEMINI_MODEL = 'gemini-3.5-flash';
// gemini-3.5-flash is only served from the Vertex `global` location.
export const GEMINI_LOCATION = 'global';
// gemini-2.5-flash-image has larger quotas than the Gemini 3 image models. Its output is
// fixed near 1K (1184x864 at 4:3), so the imageSize setting below has no effect on it.
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
// Serves a request when the primary model is out of quota. It honors imageSize.
export const GEMINI_IMAGE_FALLBACK_MODEL = 'gemini-3.1-flash-image';
export const GEMINI_IMAGE_LOCATION = 'global';

// Each attempt waits delayMs, then calls its model. Only a quota error moves on to
// the next attempt; after the last one the image call gives up.
export const IMAGE_ATTEMPTS: readonly { model: string; delayMs: number }[] = [
  { model: GEMINI_IMAGE_MODEL, delayMs: 0 },
  { model: GEMINI_IMAGE_FALLBACK_MODEL, delayMs: 0 },
  { model: GEMINI_IMAGE_MODEL, delayMs: 15_000 },
  { model: GEMINI_IMAGE_FALLBACK_MODEL, delayMs: 0 },
  { model: GEMINI_IMAGE_MODEL, delayMs: 8_000 },
  { model: GEMINI_IMAGE_FALLBACK_MODEL, delayMs: 0 }
];
export const CHAT_API_PATH = '/api/chat';

// gemini-3.5-flash thinks by default, and thinking tokens count against
// maxOutputTokens. Prompt writing (new-map and edit expansion) is a rewrite
// task and runs at the minimal thinking level; the chat agent keeps low
// thinking for tool choice and narration.
export const PROMPT_CALL_MAX_OUTPUT_TOKENS = 4096;
export const PROMPT_CALL_THINKING = { vertex: { thinkingConfig: { thinkingLevel: 'minimal' } } };
export const CHAT_THINKING = { vertex: { thinkingConfig: { thinkingLevel: 'low' } } };

export const IMAGE_SIZES = ['1K', '2K', '4K'] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];
export const DEFAULT_IMAGE_SIZE: ImageSize = '1K';
export const MAP_ASPECT_RATIO = '4:3';

export const USER_TIERS = ['free', 'grandmaster'] as const;
export type UserTier = (typeof USER_TIERS)[number];

// 4K is reserved for Grandmaster members. Membership is a manual database
// flag for now; payments come in a later PR.
export function sizesForTier(tier: UserTier): readonly ImageSize[] {
  return tier === 'grandmaster' ? IMAGE_SIZES : ['1K', '2K'];
}

// Falls back to the highest size still available to the tier. Covers a
// revoked membership or a stale saved value, e.g. a free user with a
// previously-saved 4K setting renders at 2K.
export function clampImageSize(size: ImageSize, tier: UserTier): ImageSize {
  const allowed = sizesForTier(tier);
  return allowed.includes(size) ? size : allowed[allowed.length - 1];
}

// Token-based context window — 200k practical cap, evict at 90%
export const TOKEN_EVICTION_THRESHOLD = 180_000; // 90% of 200k TOKEN_LIMIT

// Characters reserved for system prompt (~1,600 chars), tool schemas (~2,000 chars),
// rendered summary block (~2,000 chars max), and expected response headroom.
// Set generously — over-reserving costs a few fewer messages in the window.
// Campaign lore is reserved on top of this, per-request (see prepareContext).
export const TOKEN_OVERHEAD_RESERVE_CHARS = 15_000; // characters, not tokens

// Hard cap on campaign lore length, enforced at the API on write
export const CAMPAIGN_LORE_MAX_CHARS = 20_000;
