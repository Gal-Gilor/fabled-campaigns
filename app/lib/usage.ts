import type { LanguageModelUsage } from 'ai';
import { insertUsageEvent, type UsageEventInput } from '@/db';
import type { ImageSize } from './config';

export type UsageSource =
  | 'chat'
  | 'summary'
  | 'map_prompt'
  | 'map_generate'
  | 'edit_prompt'
  | 'map_edit';

// Bound to one user and one owned session for the lifetime of a chat request.
// Methods never throw: a failed usage write is logged and the turn continues.
export interface UsageRecorder {
  recordText(source: UsageSource, model: string, usage: LanguageModelUsage): Promise<void>;
  recordImage(source: UsageSource, model: string, imageCount?: number, imageSize?: ImageSize): Promise<void>;
}

export function createUsageRecorder(userId: string, sessionId: string): UsageRecorder {
  async function write(event: Omit<UsageEventInput, 'userId' | 'sessionId'>): Promise<void> {
    try {
      await insertUsageEvent({ userId, sessionId, ...event });
    } catch (err) {
      console.error(`[usage] failed to persist ${event.source} usage:`, err);
    }
  }

  return {
    recordText: (source, model, usage) =>
      write({
        source,
        model,
        inputTokens: usage.inputTokens ?? null,
        cachedInputTokens: usage.inputTokenDetails.cacheReadTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
      }),
    recordImage: (source, model, imageCount = 1, imageSize) => write({ source, model, imageCount, imageSize }),
  };
}
