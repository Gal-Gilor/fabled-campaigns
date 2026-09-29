import { generateText, type LanguageModelUsage } from 'ai';
import { vertex } from './vertexClient';
import { PROMPT_CALL_THINKING, TRANSCRIBE_MODEL, type TranscribeAudioType } from './config';
import { buildTranscribePrompt, cleanTranscript } from './prompts';

// 60 seconds of speech is about 175 transcript tokens; the rest is room for minimal thinking
const TRANSCRIBE_MAX_OUTPUT_TOKENS = 1024;

interface TranscribeParams {
  audio: Uint8Array;
  mediaType: TranscribeAudioType;
  vocabulary: readonly string[];
  abortSignal?: AbortSignal;
}

interface TranscribeResult {
  text: string;
  usage: LanguageModelUsage;
  // The model replied with the no-speech token, so text is ''
  noSpeech: boolean;
  // Anything but 'stop' (for example 'length') means the reply was cut short
  finishReason: string;
}

export async function transcribeAudio({
  audio,
  mediaType,
  vocabulary,
  abortSignal,
}: TranscribeParams): Promise<TranscribeResult> {
  const result = await generateText({
    model: vertex(TRANSCRIBE_MODEL),
    maxOutputTokens: TRANSCRIBE_MAX_OUTPUT_TOKENS,
    providerOptions: PROMPT_CALL_THINKING,
    abortSignal,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildTranscribePrompt(vocabulary) },
          { type: 'file', data: audio, mediaType },
        ],
      },
    ],
  });
  const text = cleanTranscript(result.text);
  return {
    text,
    usage: result.usage,
    noSpeech: text === '' && result.text.trim() !== '',
    finishReason: result.finishReason,
  };
}
