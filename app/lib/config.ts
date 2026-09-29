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
  { model: GEMINI_IMAGE_FALLBACK_MODEL, delayMs: 0 },
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
// Signed-out visitors always render at 1K, independent of the signed-in default.
export const GUEST_IMAGE_SIZE: ImageSize = '1K';
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

// Speech-to-text dictation. The browser enforces the timings; the
// transcribe route enforces the byte cap and the rate limits.
export const DICTATION_MAX_SECONDS = 60;
// The clock turns into a countdown for the last few seconds before the cutoff
export const DICTATION_COUNTDOWN_SECONDS = 10;
export const DICTATION_HOLD_THRESHOLD_MS = 300;
// A mic-button press released sooner than this is a click (hands-free), not a hold
export const DICTATION_CLICK_MS = 250;
// Recording continues this long after release, since people let go mid-word
export const DICTATION_TAIL_MS = 300;
export const DICTATION_MIN_MS = 500;
// Peak RMS below which a recording is a muted mic's digital silence (-80 dBFS).
// Room noise and quiet speech sit well above it; the model gets those.
export const DICTATION_MUTED_RMS = 0.0001;
// How long to wait for the transcript when live text is on screen to fall back to
export const TRANSCRIBE_TIMEOUT_MS = 8000;
// Without live text (Firefox) the transcript is all there is, so wait longer;
// stays under the route's 30 s maxDuration
export const TRANSCRIBE_NO_INTERIM_TIMEOUT_MS = 25_000;
// About four times cheaper than gemini-3.5-flash for transcription
export const TRANSCRIBE_MODEL = 'gemini-3.5-flash-lite';
export const TRANSCRIBE_MAX_BYTES = 2 * 1024 * 1024;
export const TRANSCRIBE_API_PATH = '/api/transcribe';
// What MediaRecorder produces (WebM/Ogg Opus in Chrome and Firefox, MP4 in
// Safari), plus WAV for testing the route with a generated file
export const TRANSCRIBE_AUDIO_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/wav',
] as const;
export type TranscribeAudioType = (typeof TRANSCRIBE_AUDIO_TYPES)[number];
export const TRANSCRIBE_RATE_WINDOW_MS = 60 * 60 * 1000;
export const TRANSCRIBE_USER_LIMIT_PER_WINDOW = 60;
export const TRANSCRIBE_GUEST_LIMIT_PER_WINDOW = 20;

// The chat textarea grows to about 8 lines, then scrolls
export const CHAT_INPUT_MAX_HEIGHT_PX = 200;
