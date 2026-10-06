'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { DictationHelp } from './dictation-help';
import { ArrowUpIcon } from './icons';
import { MicButton } from './mic-button';
import { useDictation, type DictationEnd } from './use-dictation';
import {
  CHAT_INPUT_MAX_HEIGHT_PX,
  DICTATION_COUNTDOWN_SECONDS,
  DICTATION_HOLD_THRESHOLD_MS,
} from '../lib/config';
import {
  DICTATION_NOTES,
  blockedMicHelp,
  formatDictationClock,
  insertDictation,
  shouldStartSpaceDictation,
  type FocusTarget,
} from '../lib/dictation';

interface ChatInputFormProps {
  input: string;
  status: string;
  sessionId: string | null;
  sendDisabled: boolean;
  formClassName: string;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (value: string) => void;
}

// The input before dictation began and the range the transcript replaces
interface Snapshot {
  before: string;
  start: number;
  end: number;
  // Whether the mic button (not the textarea) had focus when dictation began
  micFocused: boolean;
}

// One-step undo for the last dictation, valid while the text is unchanged since
interface DictationUndo {
  before: string;
  after: string;
  cursor: number;
}

// Focused elements where Space means "type a space" or "press this"
const SPACE_OWNERS =
  'button, a[href], input, textarea, select, summary, [contenteditable]:not([contenteditable="false"]), ' +
  '[role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="tab"], [role="switch"], [role="option"]';

// Keys that don't count as a keystroke for clearing the note
const BARE_MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

interface SpaceHold {
  timer: number;
  passed: boolean;
  // Whether this hold called beginDictation (on key-down, or at the threshold)
  started: boolean;
  insertSpace: boolean;
}

export function ChatInputForm({
  input,
  status,
  sessionId,
  sendDisabled,
  formClassName,
  onSubmit,
  onChange,
}: ChatInputFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const undoRef = useRef<DictationUndo | null>(null);
  const micPressRef = useRef<'none' | 'hold' | 'stop'>('none');
  // Set by the Space listener when a tap should type its space
  const spaceTapRef = useRef(false);
  const spaceHoldRef = useRef<SpaceHold | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [endAnnouncement, setEndAnnouncement] = useState('');
  const [caret, setCaret] = useState<{ pos: number } | null>(null);
  // True during the Space hold threshold, when a tap may still turn out to be a typed space
  const [holdPending, setHoldPending] = useState(false);
  const hintId = useId();
  // The mouse rests on the mic, or it has keyboard focus; shows the browser panel
  const [micHover, setMicHover] = useState(false);
  const [micFocusVisible, setMicFocusVisible] = useState(false);
  // The last value this component set, to tell its own changes from the parent's
  const ownValueRef = useRef(input);

  const setValue = useCallback(
    (value: string) => {
      ownValueRef.current = value;
      onChange(value);
    },
    [onChange],
  );

  const handleInterim = useCallback(
    (text: string) => {
      const snap = snapshotRef.current;
      if (snap) setValue(insertDictation(snap.before, snap.start, snap.end, text).value);
    },
    [setValue],
  );

  const handleEnd = useCallback(
    (end: DictationEnd) => {
      const snap = snapshotRef.current;
      snapshotRef.current = null;
      setHoldPending(false);
      if (!snap) return;

      if (end.kind === 'final' || end.kind === 'interim') {
        const inserted = insertDictation(snap.before, snap.start, snap.end, end.text);
        setValue(inserted.value);
        undoRef.current = { before: snap.before, after: inserted.value, cursor: snap.start };
        setCaret({ pos: inserted.end });
        setEndAnnouncement('Dictation added');
        return;
      }

      if (end.kind === 'restore' && end.reason === 'discarded') {
        // A Space tap: put the input back, and type the space if the input had focus
        if (spaceTapRef.current) {
          spaceTapRef.current = false;
          setValue(`${snap.before.slice(0, snap.start)} ${snap.before.slice(snap.end)}`);
          setCaret({ pos: snap.start + 1 });
        } else {
          setValue(snap.before);
        }
        return;
      }

      setValue(snap.before);
      // Keep focus on the mic (not the textarea) if that's where it was when dictation began
      if (!snap.micFocused) setCaret({ pos: snap.end });
      if (end.kind === 'mic-ready') {
        setNote(DICTATION_NOTES.micReady);
      } else if (end.kind === 'blocked') {
        setNote(blockedMicHelp(navigator.userAgent));
      } else if (end.kind === 'no-mic') {
        setNote(DICTATION_NOTES.noMic);
      } else if (end.reason !== 'unanswered') {
        // An unanswered permission prompt ends silently; the grant, if it comes, shows micReady
        if (end.reason === 'no-speech') setNote(DICTATION_NOTES.noSpeech);
        if (end.reason === 'failed') setNote(DICTATION_NOTES.failed);
        if (end.reason === 'resting') setNote(DICTATION_NOTES.resting);
        setEndAnnouncement('Dictation canceled');
      }
    },
    [setValue],
  );

  const handlePermissionGranted = useCallback(() => setNote(DICTATION_NOTES.micReady), []);

  const dictation = useDictation({
    sessionId,
    onInterim: handleInterim,
    onEnd: handleEnd,
    onPermissionGranted: handlePermissionGranted,
  });
  const { cancel } = dictation;
  const active =
    dictation.state === 'requesting' ||
    dictation.state === 'listening' ||
    dictation.state === 'transcribing';
  const showListening = dictation.state === 'listening' && !holdPending;
  const provisional = showListening || dictation.state === 'transcribing';

  // Grow with the content up to the cap, then scroll. Live dictation keeps the newest words in view.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const contentHeight = el.scrollHeight;
    el.style.height = `${Math.min(contentHeight, CHAT_INPUT_MAX_HEIGHT_PX)}px`;
    el.style.overflowY = contentHeight > CHAT_INPUT_MAX_HEIGHT_PX ? 'auto' : 'hidden';
    if (active) el.scrollTop = contentHeight;
  }, [input, active]);

  // After dictation ends, focus the textarea with the cursor after the inserted words
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!caret || !el) return;
    el.focus();
    el.setSelectionRange(caret.pos, caret.pos);
    if (caret.pos === el.value.length) el.scrollTop = el.scrollHeight;
  }, [caret]);

  // The parent empties the input after a send without going through onChange
  useEffect(() => {
    if (input === '' && ownValueRef.current !== '') setNote(null);
  }, [input]);

  // Escape cancels while listening, or skips the wait while transcribing
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      cancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, cancel]);

  function beginDictation(handsFree: boolean): boolean {
    const el = textareaRef.current;
    if (!el || status !== 'ready' || !dictation.canStart()) return false;
    // Dictation replaces the selection when the textarea has focus, and appends otherwise
    const focused = document.activeElement === el;
    snapshotRef.current = {
      before: el.value,
      start: focused ? el.selectionStart : el.value.length,
      end: focused ? el.selectionEnd : el.value.length,
      micFocused: document.activeElement === micButtonRef.current,
    };
    undoRef.current = null;
    setNote(null);
    setEndAnnouncement('');
    dictation.start({ handsFree });
    return true;
  }

  function handleMicPressStart() {
    if (dictation.state === 'listening' && dictation.handsFree) {
      micPressRef.current = 'stop';
      dictation.release();
      return;
    }
    micPressRef.current = beginDictation(false) ? 'hold' : 'none';
  }

  function handleMicPressEnd(isClick: boolean) {
    const mode = micPressRef.current;
    micPressRef.current = 'none';
    if (mode !== 'hold') return;
    if (isClick) dictation.holdToHandsFree();
    else dictation.release();
  }

  function handleMicAssistiveClick() {
    if (dictation.state === 'listening') dictation.release();
    // A click, like a pointer click: if it opened the permission prompt, it only grants access
    else if (beginDictation(true)) dictation.holdToHandsFree();
  }

  // A Space tap whose default was prevented: type the space at the selection
  function typeSpace() {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    undoRef.current = null;
    setValue(`${value.slice(0, start)} ${value.slice(end)}`);
    setCaret({ pos: start + 1 });
  }

  const spaceLatest = useRef({
    input,
    status,
    state: dictation.state,
    beginDictation,
    typeSpace,
    dictation,
  });
  useEffect(() => {
    spaceLatest.current = {
      input,
      status,
      state: dictation.state,
      beginDictation,
      typeSpace,
      dictation,
    };
  });

  // Hold Space to dictate. With microphone access already granted, recording
  // starts on key-down so the first words aren't clipped, and a release before
  // the threshold drops the audio. Otherwise it waits for the threshold, so a
  // typed space never opens the permission prompt. A tap types the space.
  useEffect(() => {
    function focusTarget(): FocusTarget {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return 'none';
      if (el === textareaRef.current) return 'chat-input';
      if (el === micButtonRef.current) return 'mic-button';
      return el.closest(SPACE_OWNERS) ? 'other-control' : 'none';
    }

    function clearHold() {
      const hold = spaceHoldRef.current;
      if (hold) clearTimeout(hold.timer);
      spaceHoldRef.current = null;
      setHoldPending(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      // Swallow auto-repeat while held, or the focused textarea fills with spaces
      if (e.key === ' ' && spaceHoldRef.current) {
        e.preventDefault();
        return;
      }
      const now = spaceLatest.current;
      const focus = focusTarget();
      const starts = shouldStartSpaceDictation({
        key: e.key,
        repeat: e.repeat,
        isComposing: e.isComposing,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        focus,
        chatInputValue: now.input,
        modalOpen: document.querySelector('[data-modal-overlay]') !== null,
        chatReady: now.status === 'ready',
        // A 'no-mic' ending keeps Space typing spaces until the devices change
        dictationAvailable: now.state === 'idle' && !now.dictation.micMissing,
      });
      if (!starts) return;
      e.preventDefault();
      const hold: SpaceHold = {
        timer: 0,
        passed: false,
        started: false,
        insertSpace: focus === 'chat-input',
      };
      spaceHoldRef.current = hold;
      if (now.dictation.micGranted) {
        hold.started = now.beginDictation(false);
        if (hold.started) setHoldPending(true);
      }
      hold.timer = window.setTimeout(() => {
        hold.passed = true;
        setHoldPending(false);
        if (!hold.started) hold.started = spaceLatest.current.beginDictation(false);
      }, DICTATION_HOLD_THRESHOLD_MS);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key !== ' ') return;
      const hold = spaceHoldRef.current;
      if (!hold) return;
      e.preventDefault();
      clearHold();
      const now = spaceLatest.current;
      if (hold.passed) {
        now.dictation.release();
        return;
      }
      // A tap: drop the recording if it's still going, and handleEnd types the space
      spaceTapRef.current = hold.insertSpace;
      if (hold.started) now.dictation.discard();
      // Nothing consumed the tap: recording never started, or already ended
      if (spaceTapRef.current) {
        spaceTapRef.current = false;
        if (!snapshotRef.current) now.typeSpace();
      }
    }

    // The key-up never arrives once the window loses focus. The hook stops the
    // recording itself; this clears the hold so later Space presses aren't swallowed.
    function onBlur() {
      clearHold();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      clearHold();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Notes last until the next keystroke; auto-repeat of a held key isn't one
    if (!e.repeat && !BARE_MODIFIERS.has(e.key)) setNote(null);
    if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const undo = undoRef.current;
      if (undo && e.currentTarget.value === undo.after) {
        e.preventDefault();
        undoRef.current = null;
        setValue(undo.before);
        setCaret({ pos: undo.cursor });
        return;
      }
    }
    if (e.key !== 'Enter' || e.shiftKey) return;
    // OS auto-repeat while focus lands here mid-hold (e.g. after a mic press ends) must
    // never send: it isn't a new, deliberate Enter press
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    // Enter confirms an IME candidate; Safari reports keyCode 229 after clearing isComposing
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    // Never send provisional text
    if (active) {
      e.preventDefault();
      return;
    }
    // Touch keyboards: Enter adds a line and the send button sends
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    formRef.current?.requestSubmit();
  }

  const clock = formatDictationClock(dictation.elapsedMs);
  // The countdown clock is aria-hidden; its start is announced once, and stays until the run ends
  const liveText = showListening
    ? clock.countdown
      ? `${DICTATION_COUNTDOWN_SECONDS} seconds left`
      : 'Listening'
    : dictation.state === 'transcribing'
      ? 'Transcribing'
      : endAnnouncement;

  return (
    <form ref={formRef} onSubmit={onSubmit} className={formClassName}>
      <div className="relative flex w-full items-end gap-2 rounded-2xl border-2 border-neutral-200 bg-neutral-100 py-2 pr-2 pl-4 transition-colors focus-within:border-primary focus-within:bg-white">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => {
            undoRef.current = null;
            setNote(null);
            setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={status !== 'ready'}
          readOnly={active}
          placeholder="Roll to Quest..."
          aria-label="Message"
          className="flex-1 resize-none bg-transparent py-1.5 text-base leading-6 outline-none disabled:opacity-50"
          style={{
            fontFamily: 'inherit',
            color: provisional ? 'var(--neutral-600)' : 'var(--neutral-700)',
          }}
        />
        {showListening && (
          <span
            aria-hidden="true"
            className={`self-center text-xs tabular-nums ${clock.countdown ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}
          >
            {clock.label}
          </span>
        )}
        {dictation.state !== 'unsupported' && (
          <span
            className="flex"
            onPointerEnter={e => {
              if (e.pointerType === 'mouse') setMicHover(true);
            }}
            onPointerLeave={() => setMicHover(false)}
            onFocus={e => setMicFocusVisible(e.target.matches(':focus-visible'))}
            onBlur={() => setMicFocusVisible(false)}
          >
            <MicButton
              ref={micButtonRef}
              state={dictation.state}
              listening={showListening}
              level={dictation.level}
              disabled={status !== 'ready'}
              describedBy={hintId}
              onPressStart={handleMicPressStart}
              onPressEnd={handleMicPressEnd}
              onAssistiveClick={handleMicAssistiveClick}
            />
          </span>
        )}
        {dictation.state !== 'unsupported' && (
          <DictationHelp open={(micHover || micFocusVisible) && !active} />
        )}
        <button
          type="submit"
          disabled={status !== 'ready' || !input.trim() || active || sendDisabled}
          aria-label="Send message"
          title="Send"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity before:absolute before:-inset-1 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <ArrowUpIcon />
        </button>
      </div>
      {/* Always in the DOM (role="status" is an implicit live region) so screen
          readers pick it up before any text lands in it; only visible with a note */}
      <p role="status" className={note ? 'mt-1.5 px-1 text-xs text-neutral-600' : ''}>
        {note}
      </p>
      <span id={hintId} className="sr-only">
        {DICTATION_NOTES.holdHint}
      </span>
      <div aria-live="polite" className="sr-only">
        {liveText}
      </div>
    </form>
  );
}
