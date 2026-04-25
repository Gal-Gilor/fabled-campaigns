export function safeJsonParse(value: unknown): unknown {
  try { return JSON.parse(String(value)); } catch { return null; }
}

export interface ImageOutput {
  type: 'image';
  src: string;
  label: string;
  collectionId?: string;
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
