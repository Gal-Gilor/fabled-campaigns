'use client';

import { memo, useEffect, useState } from 'react';
import {
  PATIENCE_SAYINGS,
  patienceSaying,
  progressElapsedMs,
  type ProgressOutput,
  type ProgressStep,
} from '../lib/toolProgress';

// Shown for mapAgent / editEncounterMap before the first progress snapshot arrives.
// The header and the step read differently so the row isn't just the same
// phrase twice.
export const GETTING_STARTED_PROGRESS: ProgressOutput = {
  type: 'progress',
  title: 'Working on it',
  doneTitle: 'Done',
  steps: [{ id: 'start', label: 'Getting started', state: 'active', activeLabel: 'Getting started', doneLabel: 'Getting started' }],
};

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// Rotates a patient step's label through PATIENCE_SAYINGS roughly every 5s,
// starting from whichever saying the server sent. Never shows a countdown.
function usePatienceRotation(label: string, active: boolean): string {
  const [display, setDisplay] = useState(label);

  useEffect(() => {
    if (!active) {
      setDisplay(label);
      return;
    }
    const startIndex = PATIENCE_SAYINGS.indexOf(label);
    let index = startIndex === -1 ? 0 : startIndex;
    setDisplay(patienceSaying(index));
    const interval = setInterval(() => {
      index += 1;
      setDisplay(patienceSaying(index));
    }, 5000);
    return () => clearInterval(interval);
  }, [label, active]);

  return display;
}

function CheckIcon() {
  return (
    <span
      aria-hidden
      className="flex-shrink-0"
      style={{ color: 'var(--primary-blue)', fontWeight: 700, width: '1rem', textAlign: 'center' }}
    >
      ✓
    </span>
  );
}

function SpinnerRing() {
  return (
    <span
      aria-hidden
      className="motion-safe:animate-spin inline-block rounded-full flex-shrink-0"
      style={{
        width: '0.7rem',
        height: '0.7rem',
        border: '2px solid var(--pale-gold)',
        borderTopColor: 'var(--accent-gold)',
      }}
    />
  );
}

function StepRow({ step, live }: { step: ProgressStep; live: boolean }) {
  const isActive = step.state === 'active';
  const stopped = isActive && !live;
  const rotatingLabel = usePatienceRotation(step.label, isActive && live && !!step.patient);

  if (step.state === 'done') {
    return (
      <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-700)' }}>
        <CheckIcon />
        <span className="flex-1 min-w-0 break-words">{step.label}</span>
        {step.ms !== undefined && (
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--neutral-600)' }}>
            {formatMs(step.ms)}
          </span>
        )}
      </li>
    );
  }

  if (isActive && !stopped) {
    return (
      <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-700)' }}>
        <SpinnerRing />
        <span
          className={`flex-1 min-w-0 break-words${step.patient ? ' fc-shimmer-text' : ''}`}
          aria-live={step.patient ? 'off' : undefined}
        >
          {step.patient ? rotatingLabel : step.label}
        </span>
      </li>
    );
  }

  // pending, or active in a request that was stopped
  return (
    <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-600)' }}>
      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--neutral-600)' }} />
      <span className="flex-1 min-w-0 break-words">{stopped ? step.activeLabel : step.label}</span>
      {stopped && <span className="text-xs italic flex-shrink-0">Stopped</span>}
    </li>
  );
}

// The running step list, shown inside the assistant bubble while a tool is mid-flight.
export const ToolProgress = memo(function ToolProgress({ progress, live }: { progress: ProgressOutput; live: boolean }) {
  return (
    <div
      className="mt-2 rounded-lg px-3 py-2"
      style={{ background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)' }}
      role="status"
      aria-live="polite"
    >
      <p
        className="text-sm font-semibold mb-1.5"
        style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}
      >
        {progress.title}
      </p>
      <ul className="space-y-1">
        {progress.steps.map((step) => (
          <StepRow key={step.id} step={step} live={live} />
        ))}
      </ul>
    </div>
  );
});

// Collapsed summary shown above the finished image/error card. The tool has
// already finished by the time this renders, so every step reads as done —
// never "Stopped" — even if the client's last remembered snapshot was taken
// before every step actually finished (a fast final result can arrive in the
// same render pass as the last progress snapshot, before the UI ever shows
// the fully-done one). `elapsedMs` is the gap between when that last
// snapshot was stored and when the final output first rendered, and covers
// whatever wasn't individually timed, so the total still adds up.
export const ProgressSummary = memo(function ProgressSummary({
  progress,
  elapsedMs
}: {
  progress: ProgressOutput;
  elapsedMs: number;
}) {
  const knownMs = progressElapsedMs(progress);
  const hasUndoneStep = progress.steps.some((step) => step.ms === undefined);
  const totalMs = hasUndoneStep ? knownMs + Math.max(0, elapsedMs) : knownMs;
  const seconds = Math.round(totalMs / 1000);
  return (
    <details className="mt-2 text-sm" style={{ color: 'var(--neutral-600)' }}>
      <summary
        className="fc-details-summary flex items-center gap-1.5 cursor-pointer select-none"
        style={{ color: 'var(--neutral-700)' }}
      >
        <span aria-hidden>✓</span>
        <span>
          {progress.doneTitle} in {seconds}s
        </span>
        <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: 'var(--neutral-600)' }}>
          <span className="fc-details-caret" aria-hidden>▸</span>
          details
        </span>
      </summary>
      <ul className="mt-1.5 space-y-1 pl-1">
        {progress.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step.state === 'done' ? step : { ...step, state: 'done', label: step.doneLabel }}
            live={false}
          />
        ))}
      </ul>
    </details>
  );
});

// Small assistant-side row shown while waiting for the model to respond.
export function ThinkingIndicator() {
  return (
    <div className="flex w-full max-w-[800px] mx-auto justify-start md:pr-[50px]">
      <div
        className="max-w-full rounded-xl px-4 py-3 flex items-center gap-2"
        style={{ background: '#ffffff', border: '1px solid var(--neutral-200)', color: 'var(--neutral-600)' }}
        role="status"
        aria-live="polite"
      >
        <span className="flex items-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="fc-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--neutral-600)', animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
        <span className="text-sm">Thinking</span>
      </div>
    </div>
  );
}
