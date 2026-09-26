'use client';

import { useEffect, useRef, useState } from 'react';
import { ModalOverlay } from './modal';
import { IMAGE_SIZES, type ImageSize } from '../lib/config';

const IMAGE_SIZE_COPY: Record<ImageSize, { label: string; note: string }> = {
  '1K': { label: 'Standard (1K)', note: 'Least detail. Fastest and cheapest.' },
  '2K': { label: 'High (2K)', note: 'More detail. Costs more and takes longer.' },
  '4K': { label: 'Maximum (4K)', note: 'Most detail. Costs the most and takes the longest.' },
};

export function SettingsModal({ onClose }: { onClose: () => void }) {
  // null = not loaded yet (or the load failed) — never show a value the
  // server hasn't actually confirmed.
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        return res.json() as Promise<{ settings?: { imageSize?: ImageSize } }>;
      })
      .then((data) => {
        if (cancelled) return;
        const size = data.settings?.imageSize;
        if (!size) throw new Error('Malformed settings response');
        lastConfirmedRef.current = size;
        desiredRef.current = size;
        setImageSize(size);
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
    desiredRef.current = next;
    setImageSize(next);
    setError(null);
    if (!savingRef.current) {
      void savePick(next);
    }
  }

  const radiosDisabled = loading || imageSize === null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--neutral-200)' }}>
          <h2
            className="text-base font-semibold"
            style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}
          >
            Settings
          </h2>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2" disabled={radiosDisabled}>
            <legend className="text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Map image quality
            </legend>
            <p className="text-xs mb-1" style={{ color: 'var(--neutral-600)' }}>
              Applies to every map you generate or edit from now on.
            </p>

            {IMAGE_SIZES.map((size) => {
              const { label, note } = IMAGE_SIZE_COPY[size];
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
                    <span className="text-sm font-semibold" style={{ color: 'var(--neutral-900)' }}>
                      {label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--neutral-600)' }}>
                      {note}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

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
