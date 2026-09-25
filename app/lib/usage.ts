import type { LanguageModelUsage } from 'ai';
import { insertUsageEvent, type UsageEventInput } from '@/db';

export type UsageSource =
  | 'chat'
  | 'summary'
  | 'map_narrative'
  | 'map_prompt'
  | 'map_generate'
  | 'edit_prompt'
  | 'map_edit';

// Bound to one user and one owned session for the lifetime of a chat request.
// Methods never throw: a failed usage write is logged and the turn continues.
export interface UsageRecorder {
  recordText(source: UsageSource, model: string, usage: LanguageModelUsage): Promise<void>;
  recordImage(source: UsageSource, model: string, imageCount?: number): Promise<void>;
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
    recordImage: (source, model, imageCount = 1) => write({ source, model, imageCount }),
  };
}
