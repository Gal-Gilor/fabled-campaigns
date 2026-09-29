'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  DICTATION_MAX_SECONDS,
  DICTATION_MIN_MS,
  DICTATION_MUTED_RMS,
  DICTATION_TAIL_MS,
  TRANSCRIBE_API_PATH,
  TRANSCRIBE_NO_INTERIM_TIMEOUT_MS,
  TRANSCRIBE_TIMEOUT_MS,
} from '../lib/config';
import { pickRecorderMimeType, rmsLevel } from '../lib/dictation';

type Phase = 'idle' | 'requesting' | 'listening' | 'transcribing';
export type DictationState = Phase | 'blocked' | 'unsupported';

export type DictationEnd =
  | { kind: 'final'; text: string }
  | { kind: 'interim'; text: string }
  | {
      kind: 'restore';
      // 'unanswered': the permission prompt was still open after the press
      // ended, or was dismissed; the input goes back without a note
      reason: 'canceled' | 'discarded' | 'no-speech' | 'failed' | 'resting' | 'unanswered';
    }
  | { kind: 'mic-ready' }
  | { kind: 'blocked' }
  | { kind: 'no-mic' };

interface UseDictationOptions {
  sessionId: string | null;
  onInterim: (text: string) => void;
  onEnd: (end: DictationEnd) => void;
  // Access was granted after the press that asked for it had already ended
  onPermissionGranted?: () => void;
}

export interface Dictation {
  state: DictationState;
  handsFree: boolean;
  // Known to be granted, so a press can start recording without a prompt
  micGranted: boolean;
  // The last attempt found no microphone; cleared when devices change
  micMissing: boolean;
  elapsedMs: number;
  level: number;
  canStart: () => boolean;
  start: (options: { handsFree: boolean }) => void;
  release: () => void;
  holdToHandsFree: () => void;
  cancel: () => void;
  discard: () => void;
}

type MicPermission = PermissionState | 'unknown';

// How often the level ring and clock re-render while listening
const UI_TICK_MS = 100;
// RMS level that fills the level ring
const FULL_SCALE_RMS = 0.2;
// After a press ends, how long getUserMedia gets to settle on its own (no
// microphone, blocked, already allowed) before the wait counts as an open prompt
const PROMPT_SETTLE_MS = 300;
// Recognizer errors after which the live text stops and the recording carries on alone
const FATAL_RECOGNITION_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'audio-capture',
  'network',
]);

// The Web Speech API surface used here; lib.dom doesn't declare it
interface RecognitionResultList {
  length: number;
  [index: number]: { 0: { transcript: string } };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function canRecord(): boolean {
  return (
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

const noopSubscribe = () => () => {};

function errorName(err: unknown): string {
  return typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : '';
}

// Null where the browser can't report microphone permission
async function queryMicPermission(): Promise<PermissionState | null> {
  if (!navigator.permissions?.query) return null;
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch {
    return null;
  }
}

interface Run {
  released: boolean;
  releasedAt: number | null;
  finishing: boolean;
  // Permission state read at the start of this press; a 'prompt' press only
  // grants access, since getUserMedia had to show the native dialog
  pressPermission: MicPermission;
  // Ended as 'unanswered' while getUserMedia was still waiting on the prompt
  unanswered: boolean;
  audioContext: AudioContext | null;
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  recognition: Recognition | null;
  // Text from recognizer sessions that already ended (Chrome ends one after a pause)
  committed: string;
  interim: string;
  startedAt: number;
  // True once any frame went unmeasured (no analyser, or a suspended context on
  // iOS); only a recording measured end to end can be called muted
  meterGaps: boolean;
  rafId: number;
  timers: number[];
  abort: AbortController | null;
  removeListeners: (() => void) | null;
  // Diagnostics for the one console line each run writes when it ends
  stopReason: string;
  peakRms: number;
  upload: string;
}

interface ControllerUi {
  setPhase(phase: Phase): void;
  setHandsFree(on: boolean): void;
  setMeter(elapsedMs: number, level: number): void;
  setPermission(permission: MicPermission): void;
  setMicMissing(missing: boolean): void;
  sessionId(): string | null;
  onInterim(text: string): void;
  onEnd(end: DictationEnd): void;
  onPermissionGranted(): void;
}

function teardown(run: Run) {
  cancelAnimationFrame(run.rafId);
  run.timers.forEach(id => clearTimeout(id));
  run.removeListeners?.();
  if (run.recognition) {
    run.recognition.onresult = null;
    run.recognition.onerror = null;
    run.recognition.onend = null;
    try {
      run.recognition.abort();
    } catch {
      // already stopped
    }
  }
  if (run.recorder && run.recorder.state !== 'inactive') {
    run.recorder.ondataavailable = null;
    run.recorder.onstop = null;
    run.recorder.stop();
  }
  run.stream?.getTracks().forEach(track => track.stop());
  void run.audioContext?.close().catch(() => {});
  run.abort?.abort();
}

// A retry needs at least this much of the upload deadline left to be worth sending
const UPLOAD_RETRY_MIN_MS = 3000;

interface UploadReply {
  status: number | 'network-error';
  text: string;
  reason: string;
}

async function postAudio(form: FormData, signal: AbortSignal): Promise<UploadReply> {
  try {
    const res = await fetch(TRANSCRIBE_API_PATH, { method: 'POST', body: form, signal });
    const body = (await res.json().catch(() => ({}))) as { text?: unknown; reason?: unknown };
    return {
      status: res.status,
      text: res.ok && typeof body.text === 'string' ? body.text.trim() : '',
      reason: typeof body.reason === 'string' ? body.reason : '',
    };
  } catch (err) {
    // Offline, aborted, or timed out
    return { status: 'network-error', text: '', reason: errorName(err) };
  }
}

// How long the mic was held: until release (or the time limit), else until now
function heldMsOf(run: Run): number {
  return run.startedAt ? (run.releasedAt ?? performance.now()) - run.startedAt : 0;
}

// One line per run in the browser console, so a failed dictation always says
// why: what stopped it, what the microphone heard, and what the upload returned.
// Never includes audio or transcript text.
function logRun(run: Run, result: DictationEnd) {
  const outcome = result.kind === 'restore' ? `restore/${result.reason}` : result.kind;
  // A run that left the user with no words is a warning, so it shows up
  // when the console is filtered to problems
  const failed =
    result.kind === 'blocked' ||
    (result.kind === 'restore' && result.reason !== 'canceled' && result.reason !== 'discarded');
  (failed ? console.warn : console.info)(
    `[dictation] ${outcome} stop=${run.stopReason || 'none'} held=${Math.round(heldMsOf(run))}ms ` +
      `permission=${run.pressPermission} recorder=${run.recorder?.mimeType || 'none'} ` +
      `peakRms=${run.peakRms.toFixed(4)} meterGaps=${run.meterGaps} liveChars=${run.interim.length} upload=${run.upload}`,
  );
}

// Owns the microphone for one dictation at a time. Plain class so the
// async steps can check `this.run === run` instead of juggling hook deps.
class DictationController {
  private run: Run | null = null;
  private phase: Phase = 'idle';
  private permission: MicPermission = 'unknown';

  constructor(private readonly ui: ControllerUi) {}

  canStart = () => this.phase === 'idle' && canRecord();

  updatePermission = (permission: MicPermission) => {
    this.permission = permission;
    this.ui.setPermission(permission);
  };

  start = ({ handsFree }: { handsFree: boolean }) => {
    if (this.phase !== 'idle' || !canRecord()) return;
    const run: Run = {
      released: false,
      releasedAt: null,
      finishing: false,
      pressPermission: this.permission,
      unanswered: false,
      audioContext: null,
      stream: null,
      recorder: null,
      chunks: [],
      recognition: null,
      committed: '',
      interim: '',
      startedAt: 0,
      meterGaps: false,
      rafId: 0,
      timers: [],
      abort: null,
      removeListeners: null,
      stopReason: '',
      peakRms: 0,
      upload: 'none',
    };
    this.run = run;
    // Created inside the press so iOS lets it start
    try {
      run.audioContext = new AudioContext();
    } catch {
      run.audioContext = null;
    }
    this.setPhase('requesting');
    this.ui.setHandsFree(handsFree);

    // Leaving the window or tab means the key-up or pointer-up will never
    // arrive; attached here (not beginRecording) so it also covers the
    // permission-prompt wait. The audio track's own 'ended' listener joins
    // once the stream exists, in beginRecording.
    const onBlur = () => this.releaseFor('window-blur');
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') this.releaseFor('tab-hidden');
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    run.removeListeners = () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then(
        stream => this.onStream(run, stream),
        (err: unknown) => void this.onStreamError(run, err),
      );
  };

  release = () => this.releaseFor('released');

  private releaseFor(reason: string) {
    const run = this.run;
    if (!run || run.released) return;
    run.stopReason = reason;
    run.released = true;
    run.releasedAt = performance.now();
    if (this.endIfPrompting(run)) return;
    // Still waiting on getUserMedia (access already granted): onStream settles it
    if (this.phase !== 'listening') return;
    run.timers.push(window.setTimeout(() => this.finish(run), DICTATION_TAIL_MS));
  }

  holdToHandsFree = () => {
    const run = this.run;
    if (!run || run.released) return;
    // A click that opened the permission prompt only grants access
    if (this.phase === 'requesting' && run.pressPermission !== 'granted') {
      run.released = true;
      this.endIfPrompting(run);
      return;
    }
    this.ui.setHandsFree(true);
  };

  cancel = () => {
    const run = this.run;
    if (!run) return;
    run.stopReason ||= `escape-while-${this.phase}`;
    // While transcribing, skip the wait and keep the live text, if there is any
    this.end(
      run,
      this.phase === 'transcribing' && run.interim
        ? { kind: 'interim', text: run.interim }
        : { kind: 'restore', reason: 'canceled' },
    );
  };

  discard = () => {
    const run = this.run;
    if (!run || this.phase === 'transcribing') return;
    run.stopReason ||= 'space-tap';
    this.end(run, { kind: 'restore', reason: 'discarded' });
  };

  dispose() {
    const run = this.run;
    if (!run) return;
    this.run = null;
    teardown(run);
  }

  private setPhase(phase: Phase) {
    this.phase = phase;
    this.ui.setPhase(phase);
  }

  // A released press still waiting on getUserMedia without known access. If
  // it hasn't settled shortly, the browser is showing its permission prompt,
  // and the run ends instead of leaving the input locked until the prompt is
  // answered (some browsers never settle an ignored prompt). The press could
  // no longer record anyway; a grant that arrives later still counts, in onStream.
  private endIfPrompting(run: Run): boolean {
    if (this.phase !== 'requesting' || run.pressPermission === 'granted') return false;
    run.timers.push(
      window.setTimeout(() => {
        if (this.run !== run || this.phase !== 'requesting') return;
        run.unanswered = true;
        this.end(run, { kind: 'restore', reason: 'unanswered' });
      }, PROMPT_SETTLE_MS),
    );
    return true;
  }

  private end(run: Run, result: DictationEnd) {
    if (this.run !== run) return;
    this.run = null;
    teardown(run);
    logRun(run, result);
    this.setPhase('idle');
    this.ui.setHandsFree(false);
    this.ui.setMeter(0, 0);
    if (result.kind === 'blocked') this.updatePermission('denied');
    if (result.kind === 'no-mic') this.ui.setMicMissing(true);
    this.ui.onEnd(result);
  }

  private async onStreamError(run: Run, err: unknown) {
    if (this.run !== run) return;
    const name = errorName(err);
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      this.end(run, { kind: 'no-mic' });
      return;
    }
    // Chrome rejects a dismissed prompt with NotAllowedError too; the
    // permission still reads 'prompt' then, and a later press can ask again
    if (name === 'NotAllowedError' && (await queryMicPermission()) === 'prompt') {
      this.end(run, { kind: 'restore', reason: 'unanswered' });
      return;
    }
    const denied = name === 'NotAllowedError' || name === 'SecurityError';
    this.end(run, denied ? { kind: 'blocked' } : { kind: 'restore', reason: 'failed' });
  }

  private onStream(run: Run, stream: MediaStream) {
    // A stream means access was granted, even for a run that already ended
    if (this.permission !== 'granted') this.updatePermission('granted');
    this.ui.setMicMissing(false);
    if (this.run !== run) {
      stream.getTracks().forEach(track => track.stop());
      // Only when idle, so the note doesn't land on a newer run
      if (run.unanswered && !this.run) this.ui.onPermissionGranted();
      return;
    }
    run.stream = stream;
    if (run.pressPermission === 'prompt') {
      // getUserMedia had to show the native dialog for this press, so the
      // press only grants access; a later, explicit press starts recording.
      this.end(run, { kind: 'mic-ready' });
      return;
    }
    if (run.released) {
      // The press ended while the browser was asking for the microphone, and no
      // prompt was shown (handled above); too short to have been a real hold.
      this.end(
        run,
        run.pressPermission === 'granted'
          ? { kind: 'restore', reason: 'no-speech' }
          : { kind: 'mic-ready' },
      );
      return;
    }
    try {
      this.beginRecording(run, stream);
    } catch {
      // MediaRecorder or the recognizer constructor threw (unsupported mime
      // type, invalid state, ...); leave the mic released via end()'s teardown
      this.end(run, { kind: 'restore', reason: 'failed' });
    }
  }

  private beginRecording(run: Run, stream: MediaStream) {
    const mimeType = pickRecorderMimeType(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = e => {
      if (e.data.size > 0) run.chunks.push(e.data);
    };
    recorder.start();
    run.recorder = recorder;
    run.startedAt = performance.now();

    this.startMeter(run, stream);
    this.startRecognition(run);

    // The stream only exists now, so the track's own 'ended' listener joins
    // the blur/visibility pair that start() already attached
    const onTrackEnded = () => this.releaseFor('track-ended');
    const track = stream.getAudioTracks()[0];
    track?.addEventListener('ended', onTrackEnded);
    const removePressListeners = run.removeListeners;
    run.removeListeners = () => {
      removePressListeners?.();
      track?.removeEventListener('ended', onTrackEnded);
    };

    navigator.vibrate?.(10);
    this.setPhase('listening');
  }

  private startMeter(run: Run, stream: MediaStream) {
    const ctx = run.audioContext;
    let analyser: AnalyserNode | null = null;
    if (ctx) {
      try {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        void ctx.resume().catch(() => {});
      } catch {
        analyser = null;
      }
    }
    const samples = new Float32Array(analyser?.fftSize ?? 0);
    let lastTick = 0;

    const frame = (now: number) => {
      if (this.run !== run || run.finishing) return;
      let rms = 0;
      if (analyser && ctx?.state === 'running') {
        analyser.getFloatTimeDomainData(samples);
        rms = rmsLevel(samples);
      } else {
        run.meterGaps = true;
      }
      if (rms > run.peakRms) run.peakRms = rms;
      const elapsed = now - run.startedAt;
      if (elapsed >= DICTATION_MAX_SECONDS * 1000) {
        run.stopReason = 'time-limit';
        run.releasedAt = now;
        this.finish(run);
        return;
      }
      if (now - lastTick >= UI_TICK_MS) {
        lastTick = now;
        this.ui.setMeter(elapsed, Math.min(1, rms / FULL_SCALE_RMS));
      }
      run.rafId = requestAnimationFrame(frame);
    };
    run.rafId = requestAnimationFrame(frame);
  }

  private startRecognition(run: Run) {
    const Ctor = recognitionConstructor();
    if (!Ctor) return;
    try {
      const recognition = new Ctor();
      recognition.lang = navigator.language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = e => {
        if (this.run !== run || run.finishing) return;
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += ` ${e.results[i][0].transcript}`;
        run.interim = `${run.committed} ${text}`.replace(/\s+/g, ' ').trim();
        this.ui.onInterim(run.interim);
      };
      recognition.onerror = e => {
        if (!FATAL_RECOGNITION_ERRORS.has(e.error)) return;
        recognition.onend = null;
        run.recognition = null;
      };
      recognition.onend = () => {
        if (this.run !== run || run.finishing) return;
        run.committed = run.interim;
        try {
          recognition.start();
        } catch {
          run.recognition = null;
        }
      };
      recognition.start();
      run.recognition = recognition;
    } catch {
      // The recognizer constructor or start() threw; the recording carries on without live text
    }
  }

  private finish(run: Run) {
    if (this.run !== run || run.finishing) return;
    run.finishing = true;
    const heldMs = heldMsOf(run);
    const durationMs = performance.now() - run.startedAt;
    cancelAnimationFrame(run.rafId);
    run.removeListeners?.();
    run.removeListeners = null;
    if (run.recognition) {
      run.recognition.onend = null;
      try {
        run.recognition.stop();
      } catch {
        // already stopped
      }
    }

    const recorder = run.recorder;
    if (!recorder) {
      this.end(run, { kind: 'restore', reason: 'no-speech' });
      return;
    }
    const onStop = () => {
      // The browser's recording indicator turns off here
      run.stream?.getTracks().forEach(track => track.stop());
      if (this.run !== run) return;
      // Only a muted mic's all-zero signal stays home: the model invents words
      // for it. Quiet speech and room noise upload, and the model decides.
      const muted = !run.meterGaps && run.peakRms < DICTATION_MUTED_RMS && !run.interim;
      if (heldMs < DICTATION_MIN_MS || muted) {
        this.end(run, { kind: 'restore', reason: 'no-speech' });
        return;
      }
      const blob = new Blob(run.chunks, {
        type: recorder.mimeType || run.chunks[0]?.type || 'audio/webm',
      });
      void this.upload(run, blob, durationMs);
    };
    if (recorder.state === 'inactive') {
      // All tracks already ended and the recorder auto-stopped before we got
      // here; onstop already fired with no handler attached, so it won't fire
      // again — run the same finish body directly instead of waiting for it.
      onStop();
      return;
    }
    recorder.onstop = onStop;
    recorder.stop();
  }

  private async upload(run: Run, blob: Blob, durationMs: number) {
    this.setPhase('transcribing');
    const abort = new AbortController();
    run.abort = abort;
    // With live text on screen, a slow reply isn't worth waiting for; without
    // it (Firefox has no live text), the reply is the only copy of the words
    const deadline = run.interim ? TRANSCRIBE_TIMEOUT_MS : TRANSCRIBE_NO_INTERIM_TIMEOUT_MS;
    run.timers.push(window.setTimeout(() => abort.abort(), deadline));

    const form = new FormData();
    form.append('audio', blob, 'dictation');
    const sessionId = this.ui.sessionId();
    if (sessionId) form.append('sessionId', sessionId);
    form.append('durationMs', String(Math.round(durationMs)));

    const sentAt = performance.now();
    const sent = `${blob.size}B ${blob.type || 'untyped'}`;
    let reply = await postAudio(form, abort.signal);
    // One retry for a failure that may pass on a second try, if time is left
    if (
      // Not 503: the route returns it when rate limiting is down, which a retry can't fix
      (reply.status === 'network-error' || reply.status === 502) &&
      performance.now() - sentAt < deadline - UPLOAD_RETRY_MIN_MS &&
      this.run === run
    ) {
      const first = reply.status;
      reply = await postAudio(form, abort.signal);
      reply.reason = `${reply.reason ? `${reply.reason} ` : ''}(retried after ${first})`;
    }
    const status =
      abort.signal.aborted && reply.status === 'network-error' ? 'timed-out' : reply.status;
    run.upload = `${status}${reply.reason ? ` ${reply.reason}` : ''} ${Math.round(performance.now() - sentAt)}ms ${sent}`;

    if (this.run !== run) return;
    if (reply.text) this.end(run, { kind: 'final', text: reply.text });
    else if (run.interim) this.end(run, { kind: 'interim', text: run.interim });
    else if (reply.status === 429) this.end(run, { kind: 'restore', reason: 'resting' });
    // The recording reached the model and it heard no words
    else if (reply.status === 200) this.end(run, { kind: 'restore', reason: 'no-speech' });
    else this.end(run, { kind: 'restore', reason: 'failed' });
  }
}

export function useDictation({
  sessionId,
  onInterim,
  onEnd,
  onPermissionGranted,
}: UseDictationOptions): Dictation {
  const supported = useSyncExternalStore(noopSubscribe, canRecord, () => false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [permission, setPermission] = useState<MicPermission>('unknown');
  const [micMissing, setMicMissing] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [meter, setMeter] = useState({ elapsedMs: 0, level: 0 });

  const latest = useRef({ sessionId, onInterim, onEnd, onPermissionGranted });
  useEffect(() => {
    latest.current = { sessionId, onInterim, onEnd, onPermissionGranted };
  });

  const [controller] = useState(
    () =>
      new DictationController({
        setPhase,
        setHandsFree,
        setMeter: (elapsedMs, level) => setMeter({ elapsedMs, level }),
        setPermission,
        setMicMissing,
        sessionId: () => latest.current.sessionId,
        onInterim: text => latest.current.onInterim(text),
        onEnd: end => latest.current.onEnd(end),
        onPermissionGranted: () => latest.current.onPermissionGranted?.(),
      }),
  );

  useEffect(() => () => controller.dispose(), [controller]);

  // A microphone plugged in after a 'no-mic' ending makes Space dictation available again
  useEffect(() => {
    const devices = navigator.mediaDevices;
    if (!supported || !devices?.addEventListener) return;
    const onDeviceChange = () => setMicMissing(false);
    devices.addEventListener('devicechange', onDeviceChange);
    return () => devices.removeEventListener('devicechange', onDeviceChange);
  }, [supported]);

  // Show the blocked state before the first press where the browser can tell us
  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    let active = true;
    const sync = () => {
      if (status) controller.updatePermission(status.state);
    };
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then(s => {
        if (!active) return;
        status = s;
        sync();
        s.addEventListener('change', sync);
      })
      .catch(() => {
        // Older Firefox doesn't know 'microphone'; the first press finds out
      });
    return () => {
      active = false;
      status?.removeEventListener('change', sync);
    };
  }, [controller, supported]);

  const state: DictationState = !supported
    ? 'unsupported'
    : phase === 'idle' && permission === 'denied'
      ? 'blocked'
      : phase;

  return {
    state,
    handsFree,
    micGranted: permission === 'granted',
    micMissing,
    elapsedMs: meter.elapsedMs,
    level: meter.level,
    canStart: controller.canStart,
    start: controller.start,
    release: controller.release,
    holdToHandsFree: controller.holdToHandsFree,
    cancel: controller.cancel,
    discard: controller.discard,
  };
}
