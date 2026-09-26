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

  // Sequencing for PATCH requests: only the response for the most recently
  // sent request may touch state. lastConfirmedRef tracks the last value the
  // server actually acknowledged (from the initial GET, or a successful
  // PATCH), so a failed request reverts to that — not to whatever was
  // selected right before the click, which may itself be unconfirmed.
  const requestSeqRef = useRef(0);
  const lastConfirmedRef = useRef<ImageSize | null>(null);

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

  async function handleChange(next: ImageSize) {
    const seq = ++requestSeqRef.current;
    setImageSize(next);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSize: next }),
      });
      if (!res.ok) throw new Error('Failed to save');
      // A newer click already superseded this request — its own response
      // (still in flight or already handled) owns the final state now.
      if (seq !== requestSeqRef.current) return;
      lastConfirmedRef.current = next;
    } catch {
      if (seq !== requestSeqRef.current) return;
      setImageSize(lastConfirmedRef.current);
      setError('Could not save. Try again.');
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
