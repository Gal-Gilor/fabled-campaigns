import { generateText } from 'ai';
import { GEMINI_MODEL, PROMPT_CALL_MAX_OUTPUT_TOKENS, PROMPT_CALL_THINKING } from './config';
import { vertex } from './vertexClient';
import type { UsageRecorder, UsageSource } from './usage';

// Shared by createEnhanceMapPrompt (mapTools.ts) and expandEditPrompt
// (imageEditTools.ts): both send a meta-prompt to GEMINI_MODEL, record usage,
// treat a 'length' finishReason as a failed expansion, trim the result, run a
// caller-specific acceptance check, and fall back on any failure.
export async function expandPrompt(params: {
  prompt: string;
  usage?: UsageRecorder;
  usageSource: UsageSource;
  isAcceptable: (text: string) => boolean;
  fallback: () => string;
  logTag: string;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const { prompt, usage, usageSource, isAcceptable, fallback, logTag, abortSignal } = params;
  try {
    const result = await generateText({
      model: vertex(GEMINI_MODEL),
      prompt,
      maxOutputTokens: PROMPT_CALL_MAX_OUTPUT_TOKENS,
      providerOptions: PROMPT_CALL_THINKING,
      abortSignal,
    });
    await usage?.recordText(usageSource, GEMINI_MODEL, result.usage);
    if (result.finishReason === 'length') throw new Error('Expansion cut off at maxOutputTokens');
    const text = result.text.trim();
    if (isAcceptable(text)) return text;
    throw new Error('Expansion response not acceptable');
  } catch (err) {
    console.warn(`[${logTag}] LLM prompt expansion failed; using fallback:`, err);
    return fallback();
  }
}
