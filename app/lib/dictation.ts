// Pure dictation helpers shared by the chat input, the useDictation hook, and
// the transcribe route. No DOM or server imports, so they run under `npm test`.
import {
  DICTATION_COUNTDOWN_SECONDS,
  DICTATION_MAX_SECONDS,
  TRANSCRIBE_AUDIO_TYPES,
  type TranscribeAudioType,
} from './config';

// Notes shown under the chat input. They never mention services, limits, or models.
export const DICTATION_NOTES = {
  noSpeech: "Didn't hear anything.",
  failed: "Couldn't catch that. Try again.",
  resting: 'Your voice could use a short rest. Type for now, or try again in a little while.',
  micReady: 'Microphone ready. Hold to talk.',
  noMic: 'No microphone found.',
  holdHint: 'Hold to talk. Hold Space when the box is empty.',
} as const;

// The panel shown while the mic is hovered or focused. Firefox has no live speech recognition, so its
// words only arrive once the recording is transcribed.
export const DICTATION_HELP = {
  title: 'Voice dictation',
  browsers: [
    'Chrome, Edge, and Safari: your words appear as you speak.',
    'Firefox: your words appear when you stop.',
  ],
  usage:
    'Click the mic to start and again to stop, or hold it while you talk. Hold Space when the box is empty.',
} as const;

interface Insertion {
  value: string;
  // Range of the inserted words, without the padding spaces
  start: number;
  end: number;
}

const STARTS_WITH_PUNCTUATION = /^[.,!?;:)\]}"'…]/;

// Puts dictated text over [selStart, selEnd) the way typing would, adding a
// space on either side only where the neighboring text needs one. Empty text
// leaves the value untouched, so the input shows what it had before.
export function insertDictation(
  value: string,
  selStart: number,
  selEnd: number,
  text: string,
): Insertion {
  const words = text.trim();
  if (!words) return { value, start: selStart, end: selStart };

  const before = value.slice(0, selStart);
  const after = value.slice(selEnd);
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const trail =
    after.length > 0 && !/^\s/.test(after) && !STARTS_WITH_PUNCTUATION.test(after) ? ' ' : '';
  const start = before.length + lead.length;
  return { value: before + lead + words + trail + after, start, end: start + words.length };
}

// Where keyboard focus is, as far as the Space gate cares
export type FocusTarget = 'none' | 'chat-input' | 'mic-button' | 'other-control';

export interface SpaceGateInput {
  key: string;
  repeat: boolean;
  isComposing: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  focus: FocusTarget;
  chatInputValue: string;
  modalOpen: boolean;
  chatReady: boolean;
  // Supported, not blocked, and not already dictating
  dictationAvailable: boolean;
}

// Space starts push-to-talk only where it can't be a typed space or a button
// press. The mic button handles its own Space and Enter.
export function shouldStartSpaceDictation(i: SpaceGateInput): boolean {
  if (i.key !== ' ' || i.repeat || i.isComposing) return false;
  if (i.altKey || i.ctrlKey || i.metaKey || i.shiftKey) return false;
  if (i.modalOpen || !i.chatReady || !i.dictationAvailable) return false;
  if (i.focus === 'none') return true;
  if (i.focus === 'chat-input') return i.chatInputValue.trim() === '';
  return false;
}

export function normalizeAudioMediaType(type: string): TranscribeAudioType | null {
  const base = type.split(';')[0].trim().toLowerCase();
  return (TRANSCRIBE_AUDIO_TYPES as readonly string[]).includes(base)
    ? (base as TranscribeAudioType)
    : null;
}

// Ogg first: Firefox records both, and Gemini hears its WebM recordings as
// silence. Chrome can't record Ogg and falls through to WebM, which works;
// Safari records MP4.
const RECORDER_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

// First recording format the browser supports; undefined lets it pick its default
export function pickRecorderMimeType(isSupported: (type: string) => boolean): string | undefined {
  return RECORDER_TYPES.find(isSupported);
}

export function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / samples.length);
}

export function formatDictationClock(elapsedMs: number): { label: string; countdown: boolean } {
  const elapsed = Math.floor(elapsedMs / 1000);
  const remaining = Math.max(0, DICTATION_MAX_SECONDS - elapsed);
  if (remaining <= DICTATION_COUNTDOWN_SECONDS)
    return { label: `${remaining}s left`, countdown: true };
  return {
    label: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`,
    countdown: false,
  };
}

// Concrete steps to unblock the microphone, by browser. Order matters: iOS
// Chrome and Edge also say "Safari" and "Chrome" in their user agents.
export function blockedMicHelp(userAgent: string): string {
  const ios = /iPhone|iPad|iPod/.test(userAgent);
  if (ios && /CriOS\//.test(userAgent))
    return 'Microphone is off. Open iOS Settings, find Chrome, and turn on Microphone.';
  if (ios)
    return 'Microphone is off. Tap "aA" in the address bar, choose Website Settings, and set Microphone to Allow.';
  if (/Firefox\//.test(userAgent)) {
    return 'Microphone is off. Click the crossed-out microphone in the address bar, remove the block, and try again.';
  }
  if (/Edg\//.test(userAgent)) {
    return 'Microphone is off. Click the lock icon left of the address bar, set Microphone to Allow, and try again.';
  }
  if (/Android/.test(userAgent)) {
    return 'Microphone is off. Tap the icon left of the address bar, open Permissions, and allow Microphone.';
  }
  if (/Chrome\//.test(userAgent)) {
    return 'Microphone is off. Click the site settings icon left of the address bar, set Microphone to Allow, and try again.';
  }
  if (/Safari\//.test(userAgent)) {
    return 'Microphone is off. Open Safari > Settings for This Website and set Microphone to Allow.';
  }
  return 'Microphone is off. Allow microphone access for this site in your browser settings, then try again.';
}
