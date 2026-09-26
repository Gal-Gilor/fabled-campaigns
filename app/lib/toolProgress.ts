// Progress snapshots for long-running tools. A tool's execute is an async
// generator: every yield before the last is a preliminary result the chat
// renders as a step list, and the last yield is the tool's real output. This
// module is imported by both the server tools and chat.tsx, so it has no
// server-only dependencies.

import { isToolUIPart, type UIMessage } from 'ai';

export type ProgressStepState = 'done' | 'active' | 'pending';

export interface ProgressStep {
  id: string;
  label: string;
  state: ProgressStepState;
  /** How long the step took, once done. */
  ms?: number;
  /** The step is waiting on the image service; the chat rotates patience sayings. */
  patient?: boolean;
  /** Shown while the step runs (falls back to `label` if the spec didn't set one). */
  activeLabel: string;
  /** Shown once the step is done (falls back to `label` if the spec didn't set one). */
  doneLabel: string;
}

export interface ProgressOutput {
  type: 'progress';
  /** Heading while the tool runs, e.g. 'Drawing "Thornwatch Pass"'. */
  title: string;
  /** Heading once the tool is done, e.g. 'Drew "Thornwatch Pass"'. */
  doneTitle: string;
  steps: ProgressStep[];
}

export function isProgressOutput(o: unknown): o is ProgressOutput {
  return (
    typeof o === 'object' &&
    o !== null &&
    (o as Record<string, unknown>).type === 'progress' &&
    Array.isArray((o as Record<string, unknown>).steps)
  );
}

// A tool part left mid-flight when the request was stopped or the tab closed:
// state 'output-available' with `preliminary: true` (an async-generator step
// snapshot, not the tool's real output) or a ProgressOutput payload. Sending
// this to the model reads as a finished tool call — e.g. a drawn map — and
// persisting it would replay one after a reload, so both the chat route's
// context and the client's saved messages drop it.
function isInterruptedToolPart(part: UIMessage['parts'][number]): boolean {
  if (!isToolUIPart(part) || part.state !== 'output-available') return false;
  return !!part.preliminary || isProgressOutput(part.output);
}

export function dropInterruptedToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => ({
    ...msg,
    parts: msg.parts.filter((part) => !isInterruptedToolPart(part))
  }));
}

/** Total time of the finished steps in a snapshot. */
export function progressElapsedMs(progress: ProgressOutput): number {
  return progress.steps.reduce((sum, step) => sum + (step.ms ?? 0), 0);
}

// Shown in place of the image step while the image models are out of quota.
// The chat never names models or mentions quotas, busy services, or retries.
export const PATIENCE_SAYINGS = [
  'Rome wasn\'t built in a day',
  'Slow and steady wins the race',
  'Patience is a virtue',
  'Trust the process',
  'Good things come to those who wait',
  'Nothing worth having comes easy',
  'Don\'t rush the process',
  'All good things take time',
  'The best maps are worth the wait',
  'Every great quest starts with a pause'
];

export function patienceSaying(index: number): string {
  return PATIENCE_SAYINGS[index % PATIENCE_SAYINGS.length];
}

export interface ProgressStepSpec {
  id: string;
  /** Shown while the step is pending. */
  label: string;
  /** Shown while the step runs; defaults to `label`. */
  activeLabel?: string;
  /** Shown once the step is done; defaults to `label`. */
  doneLabel?: string;
}

/** The step that saves a finished map to the active collection. */
export function saveStep(collectionName: string): ProgressStepSpec {
  return {
    id: 'save',
    label: `Save to "${collectionName}"`,
    activeLabel: `Saving to "${collectionName}"`,
    doneLabel: `Saved to "${collectionName}"`
  };
}

/**
 * Tracks a tool's steps and emits a full snapshot on every change.
 * Snapshots are complete states, so a consumer only ever needs the latest one.
 */
export class ProgressTracker {
  private readonly steps: ProgressStep[];
  private readonly startedAt = new Map<string, number>();

  constructor(
    private readonly title: string,
    private readonly doneTitle: string,
    specs: ProgressStepSpec[],
    private readonly emit: (snapshot: ProgressOutput) => void
  ) {
    this.steps = specs.map(({ id, label, activeLabel, doneLabel }) => ({
      id,
      label,
      state: 'pending',
      activeLabel: activeLabel ?? label,
      doneLabel: doneLabel ?? label,
    }));
  }

  has(id: string): boolean {
    return this.steps.some((s) => s.id === id);
  }

  /** Marks a step active. A step id the tracker doesn't list is ignored. */
  start(id: string): void {
    const step = this.find(id);
    if (!step) return;
    this.startedAt.set(id, Date.now());
    this.apply(step, { state: 'active', label: step.activeLabel });
  }

  finish(id: string): void {
    const step = this.find(id);
    if (!step) return;
    const startedAt = this.startedAt.get(id);
    const ms = startedAt === undefined ? undefined : Date.now() - startedAt;
    this.apply(step, { state: 'done', ms, patient: false, label: step.doneLabel });
  }

  update(id: string, patch: Partial<Omit<ProgressStep, 'id'>>): void {
    const step = this.find(id);
    if (step) this.apply(step, patch);
  }

  private find(id: string): ProgressStep | undefined {
    return this.steps.find((s) => s.id === id);
  }

  private apply(step: ProgressStep, patch: Partial<Omit<ProgressStep, 'id'>>): void {
    Object.assign(step, patch);
    this.emit(this.snapshot());
  }

  snapshot(): ProgressOutput {
    return {
      type: 'progress',
      title: this.title,
      doneTitle: this.doneTitle,
      steps: this.steps.map((step) => ({ ...step }))
    };
  }
}

/** What generateMapImage reports while it works. */
export type ImageProgressEvent =
  | { kind: 'rendering'; afterQuotaError: boolean }
  | { kind: 'waiting'; resumeAt: number };

/**
 * Handler for generateMapImage's onProgress that drives one image step.
 * After the first quota error, every wait and every later attempt replaces the
 * step's label with the next patience saying, starting from a random one.
 */
export function imageStepProgress(tracker: ProgressTracker, stepId: string) {
  let sayingIndex = Math.floor(Math.random() * PATIENCE_SAYINGS.length);
  return (event: ImageProgressEvent) => {
    if (event.kind === 'rendering' && !event.afterQuotaError) return;
    tracker.update(stepId, { label: patienceSaying(sayingIndex++), patient: true });
  };
}

/**
 * Async generator for a tool's execute: yields the latest progress snapshot
 * each time `run` emits one, then yields `run`'s result as the final output.
 */
export async function* streamWithProgress<T>(
  run: (emit: (snapshot: ProgressOutput) => void) => Promise<T>
): AsyncGenerator<ProgressOutput | T> {
  let latest: ProgressOutput | null = null;
  let wake: (() => void) | null = null;
  let settled = false;

  const emit = (snapshot: ProgressOutput) => {
    latest = snapshot;
    wake?.();
  };
  const task = run(emit).finally(() => {
    settled = true;
    wake?.();
  });
  // If the consumer stops iterating before `task` settles (e.g. the request
  // is aborted while paused at a yield), nothing else awaits `task` below —
  // swallow the rejection here so it never surfaces as unhandled. The real
  // error still reaches an attentive caller via `yield await task`.
  task.catch(() => {});

  try {
    while (true) {
      if (latest) {
        const snapshot: ProgressOutput = latest;
        latest = null;
        yield snapshot;
        continue;
      }
      if (settled) break;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
      wake = null;
    }
    yield await task;
  } finally {
    if (!settled) {
      console.warn('[streamWithProgress] consumer stopped before the task finished; abandoning it');
    }
  }
}
