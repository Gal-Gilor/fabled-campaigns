'use client';

import { useEffect, useRef } from 'react';
import { MicIcon, MicOffIcon, SpinnerIcon } from './icons';
import type { DictationState } from './use-dictation';
import { DICTATION_CLICK_MS } from '../lib/config';

// A browser can follow a keyboard press with a synthetic click; ignore one that soon after
const ASSISTIVE_CLICK_GUARD_MS = 500;

interface MicButtonProps {
  ref?: React.Ref<HTMLButtonElement>;
  state: DictationState;
  listening: boolean;
  level: number;
  disabled: boolean;
  describedBy: string;
  onPressStart: () => void;
  onPressEnd: (isClick: boolean) => void;
  onAssistiveClick: () => void;
}

// Hold to talk with a pointer, or with Space or Enter while focused. A press
// released within DICTATION_CLICK_MS counts as a click.
export function MicButton({
  ref,
  state,
  listening,
  level,
  disabled,
  describedBy,
  onPressStart,
  onPressEnd,
  onAssistiveClick,
}: MicButtonProps) {
  const pressedAtRef = useRef<number | null>(null);
  const lastPressEndRef = useRef(0);
  const transcribing = state === 'transcribing';

  useEffect(() => {
    if (disabled) pressedAtRef.current = null;
  }, [disabled]);

  function press() {
    if (pressedAtRef.current !== null || transcribing) return;
    pressedAtRef.current = performance.now();
    onPressStart();
  }

  function unpress(canceled = false) {
    const at = pressedAtRef.current;
    if (at === null) return;
    pressedAtRef.current = null;
    lastPressEndRef.current = performance.now();
    onPressEnd(!canceled && performance.now() - at < DICTATION_CLICK_MS);
  }

  const tone = listening
    ? 'border-gold bg-gold-pale text-neutral-900'
    : state === 'blocked'
      ? 'border-neutral-200 bg-white text-neutral-600'
      : 'border-neutral-200 bg-white text-neutral-600 hover:text-primary';

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-disabled={transcribing || undefined}
      aria-busy={state === 'requesting' || undefined}
      aria-label={listening ? 'Stop dictation' : 'Start dictation'}
      aria-pressed={listening}
      aria-describedby={describedBy}
      onPointerDown={e => {
        if (e.button !== 0) return;
        // Keeps focus and the cursor in the textarea, where the text will go
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press();
      }}
      onPointerUp={() => unpress()}
      onPointerCancel={() => unpress(true)}
      onLostPointerCapture={() => unpress(true)}
      onBlur={() => unpress(true)}
      onKeyDown={e => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        if (!e.repeat) press();
      }}
      onKeyUp={e => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        unpress();
      }}
      onClick={e => {
        // Screen readers activate with a click (detail 0) and no pointer or key events
        if (e.detail !== 0 || pressedAtRef.current !== null) return;
        if (performance.now() - lastPressEndRef.current < ASSISTIVE_CLICK_GUARD_MS) return;
        onAssistiveClick();
      }}
      onContextMenu={e => e.preventDefault()}
      className={`relative flex size-9 shrink-0 touch-none select-none items-center justify-center rounded-full border transition-colors [-webkit-touch-callout:none] before:absolute before:-inset-1 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-wait ${tone}`}
    >
      {listening && (
        <span
          aria-hidden="true"
          className="fc-mic-pulse pointer-events-none absolute inset-0 rounded-full"
        />
      )}
      {listening && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-0.5 rounded-full border-2 border-gold transition-transform duration-75"
          style={{ transform: `scale(${1 + level * 0.3})` }}
        />
      )}
      {transcribing ? (
        <SpinnerIcon />
      ) : state === 'blocked' ? (
        <MicOffIcon />
      ) : (
        <MicIcon filled={listening} />
      )}
    </button>
  );
}
