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

// Key order matches the ImageOutput fields above; JSON.stringify omits any
// optional key left undefined, so callers that skip collectionId/locationId/
// artifactId (e.g. an uncollected map edit) get the same string as before.
export function buildImageOutput(o: ImageOutput): string {
  return JSON.stringify({
    type: o.type,
    src: o.src,
    label: o.label,
    collectionId: o.collectionId,
    locationId: o.locationId,
    artifactId: o.artifactId,
    prompt: o.prompt,
  });
}

// Shared toModelOutput for the map-generation and map-edit tools: both reduce
// a successful ImageOutput to "<prefix>: <label>" and otherwise pass the raw
// output string through unchanged.
export function imageToolModelOutput(prefix: string) {
  return ({ output }: { output: unknown }) => {
    const o = safeJsonParse(output);
    if (isImageOutput(o)) return { type: 'text' as const, value: `${prefix}: ${o.label}` };
    return { type: 'text' as const, value: String(output) };
  };
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
