'use client';

import { useEffect, useRef, useState } from 'react';
import { ModalOverlay } from './modal';
import { IMAGE_SIZES, type ImageSize, type UserTier } from '../lib/config';

const IMAGE_SIZE_COPY: Record<ImageSize, { label: string; note: string }> = {
  '1K': { label: 'Standard (1K)', note: 'Fastest. Good for quick encounters.' },
  '2K': { label: 'High (2K)', note: 'Sharper detail when the high-resolution model draws the map.' },
  '4K': { label: 'Maximum (4K)', note: 'Print-ready detail when the high-resolution model draws the map.' },
};

const GRANDMASTER_LINE = 'Grandmaster members unlock 4K maps.';

// Gold-bordered pill used both as the header member chip and inline on the
// locked 4K row, matching the pale-gold/accent-gold notice convention used
// elsewhere in the app (see ToolErrorNotice in chat.tsx).
function GrandmasterPill() {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 whitespace-nowrap"
      style={{ color: 'var(--gold-ink)', background: 'var(--pale-gold)', border: '1px solid var(--light-gold)' }}
    >
      Grandmaster
    </span>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 flex-none"
      style={{ color: 'var(--gold-ink)' }}
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 flex-none"
      style={{ color: 'var(--gold-ink)' }}
    >
      <path
        d="M2 12h12M3 11 2 5l3.5 2.5L8 3l2.5 4.5L14 5l-1 6H3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  // null = not loaded yet (or the load failed) — never show a value the
  // server hasn't actually confirmed.
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [tier, setTier] = useState<UserTier>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Shown under the list after the locked 4K row is activated, or after a
  // PATCH comes back 403 (membership lapsed mid-session).
  const [showUpsell, setShowUpsell] = useState(false);

  // Saves are serialized on the client — at most one PATCH in flight at a
  // time — so the server never sees two upserts racing (which could commit
  // out of order and leave the DB and the UI disagreeing even though each
  // individual response looked fine).
  //
  // desiredRef is the latest value the user picked; the UI shows it right
  // away (optimistic). lastConfirmedRef is the last value the server has
  // actually acknowledged, from the initial GET or a successful PATCH.
  // savingRef gates the "one in flight" rule: a pick made while a PATCH is
  // already running only updates desiredRef + the optimistic UI — it does
  // not fire a new request. When the in-flight PATCH settles, it checks
  // desiredRef again and, if the user has since moved on, kicks off a PATCH
  // for the new desired value itself.
  const desiredRef = useRef<ImageSize | null>(null);
  const lastConfirmedRef = useRef<ImageSize | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json() as Promise<{ settings?: { imageSize?: ImageSize; tier?: UserTier } }>;
      })
      .then((data) => {
        if (cancelled) return;
        const size = data.settings?.imageSize;
        if (!size) throw new Error('Malformed settings response');
        lastConfirmedRef.current = size;
        desiredRef.current = size;
        setImageSize(size);
        setTier(data.settings?.tier ?? 'free');
        // Discard any upsell line shown while the tier default was still
        // 'free' during the fetch — the real tier just landed.
        setShowUpsell(false);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sends exactly one PATCH for `value`, then either chains the next PATCH
  // for whatever the user picked meanwhile, or resolves the outcome for
  // `value` itself if nothing newer is queued.
  async function savePick(value: ImageSize) {
    savingRef.current = true;
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSize: value }),
      });
      if (res.status === 403) {
        // Server disagrees with the optimistic pick (asked for 4K without
        // Grandmaster, or membership lapsed since the modal opened) — the
        // tier is authoritative here, not the client's earlier guess.
        savingRef.current = false;
        setTier('free');
        if (desiredRef.current !== null && desiredRef.current !== value && desiredRef.current !== '4K') {
          // The user already moved on to a different, still-valid pick while
          // this one was in flight — honor it instead of reverting past it.
          void savePick(desiredRef.current);
          return;
        }
        // Revert to the last confirmed value and explain it the same way the
        // locked row does, not as a generic error.
        desiredRef.current = lastConfirmedRef.current;
        setImageSize(lastConfirmedRef.current);
        setShowUpsell(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to save');
      // Requests are strictly one-at-a-time, so this response is always in
      // order — always record it as the server's confirmed value.
      lastConfirmedRef.current = value;
      savingRef.current = false;
      if (desiredRef.current !== null && desiredRef.current !== value) {
        void savePick(desiredRef.current);
      }
    } catch {
      savingRef.current = false;
      if (desiredRef.current === value) {
        // Still the wanted value — revert the UI and surface the error.
        setImageSize(lastConfirmedRef.current);
        setError('Could not save. Try again.');
      } else if (desiredRef.current !== null) {
        // The user already moved on; this failure is stale and not shown.
        void savePick(desiredRef.current);
      }
    }
  }

  function handleChange(next: ImageSize) {
    setShowUpsell(false);
    desiredRef.current = next;
    setImageSize(next);
    setError(null);
    if (!savingRef.current) {
      void savePick(next);
    }
  }

  function revealLocked() {
    if (radiosDisabled) return;
    setShowUpsell(true);
  }

  const radiosDisabled = loading || imageSize === null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm mx-4 overflow-hidden">
        <div
          className="px-5 pt-4 pb-3 flex items-center justify-between gap-2"
          style={{ borderBottom: '1px solid var(--neutral-200)' }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}
          >
            Settings
          </h2>
          {tier === 'grandmaster' && <GrandmasterPill />}
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2" disabled={radiosDisabled}>
            <legend className="text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Map image quality
            </legend>
            <p className="text-xs mb-1" style={{ color: 'var(--neutral-600)' }}>
              Most maps render near 1K. Higher settings apply when the high-resolution model draws the map.
            </p>

            {IMAGE_SIZES.map((size) => {
              const { label, note } = IMAGE_SIZE_COPY[size];
              const locked = size === '4K' && tier !== 'grandmaster';

              if (locked) {
                return (
                  <div
                    key={size}
                    role="radio"
                    aria-checked="false"
                    aria-disabled="true"
                    aria-label={`${label}. Part of Grandmaster.`}
                    tabIndex={0}
                    onClick={revealLocked}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        revealLocked();
                      }
                    }}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer border border-[var(--accent-gold)] bg-[#fffdf6] hover:bg-[var(--pale-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-gold)]"
                  >
                    <LockIcon />
                    <span className="flex flex-col">
                      <span
                        className="flex items-center gap-2 flex-wrap text-sm font-semibold"
                        style={{ color: 'var(--neutral-900)', opacity: 0.62 }}
                      >
                        {label}
                        <GrandmasterPill />
                      </span>
                      <span className="text-xs" style={{ color: 'var(--neutral-600)', opacity: 0.62 }}>
                        {note}
                      </span>
                    </span>
                  </div>
                );
              }

              const checked = imageSize === size;
              return (
                <label
                  key={size}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${checked ? 'var(--primary-blue)' : 'var(--neutral-200)'}`,
                    background: checked ? 'var(--pale-blue)' : 'transparent',
                    opacity: radiosDisabled ? 0.6 : 1,
                  }}
                >
                  <input
                    type="radio"
                    name="imageSize"
                    value={size}
                    checked={checked}
                    onChange={() => handleChange(size)}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col">
                    <span className="flex items-center gap-2 flex-wrap text-sm font-semibold" style={{ color: 'var(--neutral-900)' }}>
                      {label}
                      {size === '4K' && <GrandmasterPill />}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-600)' }}>
                      {note}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {showUpsell && (
            <div
              role="status"
              className="flex items-start gap-2 text-xs rounded-lg px-3 py-2"
              style={{ background: 'var(--pale-gold)', border: '1px solid var(--light-gold)', color: 'var(--gold-ink)' }}
            >
              <CrownIcon />
              <span>{GRANDMASTER_LINE}</span>
            </div>
          )}

          {error && (
            <p className="text-xs" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}
        </div>

        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full text-sm rounded-lg py-2 font-semibold"
            style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: '1px solid var(--neutral-200)' }}
          >
            Close
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
