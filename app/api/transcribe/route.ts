import { NextResponse } from 'next/server';
import { APICallError } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { getSessionCampaignName, incrementRateLimit } from '@/db';
import { clientIp, rateLimitWindowStart, transcribeRateLimitKey } from '../../lib/rateLimit';
import { DICTATION_NOTES, normalizeAudioMediaType } from '../../lib/dictation';
import { transcribeAudio } from '../../lib/transcription';
import { createUsageRecorder } from '../../lib/usage';
import {
  DICTATION_MAX_SECONDS,
  TRANSCRIBE_GUEST_LIMIT_PER_WINDOW,
  TRANSCRIBE_MAX_BYTES,
  TRANSCRIBE_MODEL,
  TRANSCRIBE_RATE_WINDOW_MS,
  TRANSCRIBE_USER_LIMIT_PER_WINDOW,
} from '../../lib/config';

// The client gives up after TRANSCRIBE_NO_INTERIM_TIMEOUT_MS at most; this only bounds a stuck call
export const maxDuration = 30;

// Multipart framing around the audio file
const FORM_OVERHEAD_BYTES = 16 * 1024;

const fieldsSchema = z.object({
  sessionId: z.string().min(1).max(128).optional(),
  durationMs: z.coerce
    .number()
    .int()
    .min(0)
    .max(DICTATION_MAX_SECONDS * 2000)
    .optional(),
});

// `reason` is a machine code for the browser console and the server log; `error`
// is the user-facing note. Every non-200 exit is logged, so a failed dictation
// always leaves a line explaining why.
function fail(status: number, reason: string, error: string = DICTATION_NOTES.failed, detail = '') {
  console.warn(`[transcribe route] ${status} ${reason}${detail ? ` ${detail}` : ''}`);
  return NextResponse.json({ error, reason }, { status });
}

// Vertex errors carry the request body, which holds the audio. Log the name,
// status, and message only.
function describeError(err: unknown): string {
  if (APICallError.isInstance(err)) return `${err.name} ${err.statusCode ?? '?'}: ${err.message}`;
  return err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error';
}

export async function POST(req: Request) {
  if (Number(req.headers.get('content-length') ?? 0) > TRANSCRIBE_MAX_BYTES + FORM_OVERHEAD_BYTES) {
    return fail(413, 'too-large', undefined, `content-length=${req.headers.get('content-length')}`);
  }

  const receivedAt = Date.now();
  const authSession = await auth();
  const userId = authSession?.user?.id ?? null;

  // Counted before the body is read, so malformed requests still use up the limit
  try {
    const key = transcribeRateLimitKey(userId, clientIp(req.headers));
    const count = await incrementRateLimit(
      key,
      rateLimitWindowStart(Date.now(), TRANSCRIBE_RATE_WINDOW_MS),
    );
    const limit = userId ? TRANSCRIBE_USER_LIMIT_PER_WINDOW : TRANSCRIBE_GUEST_LIMIT_PER_WINDOW;
    if (count > limit) return fail(429, 'rate-limited', DICTATION_NOTES.resting, `count=${count}`);
  } catch (err) {
    // Fail closed: without a working counter the route would be an open Gemini endpoint
    return fail(503, 'rate-limit-unavailable', undefined, describeError(err));
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return fail(400, 'bad-form', undefined, describeError(err));
  }

  const audio = form.get('audio');
  if (!audio || typeof audio === 'string') return fail(400, 'no-audio');
  if (audio.size === 0) return fail(400, 'empty-audio', undefined, `type="${audio.type}"`);
  if (audio.size > TRANSCRIBE_MAX_BYTES) return fail(413, 'too-large', undefined, `${audio.size}B`);
  const mediaType = normalizeAudioMediaType(audio.type);
  if (!mediaType) return fail(415, 'unsupported-type', undefined, `type="${audio.type}"`);

  const fields = fieldsSchema.safeParse({
    sessionId: form.get('sessionId') ?? undefined,
    durationMs: form.get('durationMs') ?? undefined,
  });
  if (!fields.success) return fail(400, 'bad-fields');
  const { sessionId, durationMs } = fields.data;

  // Non-null only when this user owns this session; gates the vocabulary and the usage row
  const ctx =
    userId && sessionId
      ? await getSessionCampaignName(sessionId, userId).catch(err => {
          console.error('[transcribe route] failed to load session context:', describeError(err));
          return null;
        })
      : null;
  const vocabulary = ctx?.campaignName ? [ctx.campaignName] : [];

  const startedAt = Date.now();
  try {
    const { text, usage, noSpeech, finishReason } = await transcribeAudio({
      audio: new Uint8Array(await audio.arrayBuffer()),
      mediaType,
      vocabulary,
      abortSignal: req.signal,
    });
    console.info(
      `[transcribe route] 200 ${TRANSCRIBE_MODEL} ${mediaType} ${audio.size}B audio=${durationMs ?? '?'}ms ` +
        `model=${Date.now() - startedAt}ms total=${Date.now() - receivedAt}ms finish=${finishReason} ` +
        `noSpeech=${noSpeech} chars=${text.length} in=${usage.inputTokens ?? '?'} out=${usage.outputTokens ?? '?'}`,
    );
    if (ctx && userId && sessionId) {
      const voiceSeconds = Math.ceil(
        Math.min(durationMs ?? 0, DICTATION_MAX_SECONDS * 1000) / 1000,
      );
      await createUsageRecorder(userId, sessionId).recordVoice(
        'transcribe',
        TRANSCRIBE_MODEL,
        usage,
        voiceSeconds,
      );
    }
    return NextResponse.json(noSpeech ? { text, reason: 'no-speech' } : { text });
  } catch (err) {
    if (req.signal.aborted) {
      console.warn(`[transcribe route] 499 client-aborted after ${Date.now() - receivedAt}ms`);
      return new Response(null, { status: 499 });
    }
    return fail(502, 'model-error', undefined, describeError(err));
  }
}
