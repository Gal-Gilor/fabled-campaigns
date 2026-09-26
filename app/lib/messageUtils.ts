export function safeJsonParse(value: unknown): unknown {
  try { return JSON.parse(String(value)); } catch { return null; }
}

// Marker prefix for tool outputs that are corrective hints meant for the model
// to read and retry with, not user-facing errors. Shared by tool files (which
// prepend it) and chat.tsx (which hides parts whose output starts with it).
export const RETRY_HINT_PREFIX = '[retry]';

export function isRetryHint(output: unknown): boolean {
  return typeof output === 'string' && output.startsWith(RETRY_HINT_PREFIX);
}

export interface ImageOutput {
  type: 'image';
  src: string;
  label: string;
  collectionId?: string;
  locationId?: string;
  artifactId?: string;
  prompt?: string;
}

export function isImageOutput(o: unknown): o is ImageOutput {
  return (
    typeof o === 'object' &&
    o !== null &&
    (o as Record<string, unknown>).type === 'image' &&
    typeof (o as Record<string, unknown>).src === 'string'
  );
}
