'use client';

import { useEffect, useState } from 'react';
import { ModalOverlay } from './modal';
import { IMAGE_SIZES, DEFAULT_IMAGE_SIZE, type ImageSize } from '../lib/config';

const IMAGE_SIZE_COPY: Record<ImageSize, { label: string; note: string }> = {
  '1K': { label: 'Standard (1K)', note: 'Least detail. Fastest and cheapest.' },
  '2K': { label: 'High (2K)', note: 'More detail. Costs more and takes longer.' },
  '4K': { label: 'Maximum (4K)', note: 'Most detail. Costs the most and takes the longest.' },
};

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [imageSize, setImageSize] = useState<ImageSize>(DEFAULT_IMAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: { settings?: { imageSize?: ImageSize } }) => {
        if (!cancelled && data.settings?.imageSize) setImageSize(data.settings.imageSize);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleChange(next: ImageSize) {
    const previous = imageSize;
    setImageSize(next);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSize: next }),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch {
      setImageSize(previous);
      setError('Could not save. Try again.');
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--neutral-200)' }}>
          <p
            className="text-base font-semibold"
            style={{ color: 'var(--neutral-900)', fontFamily: 'var(--font-cinzel), serif' }}
          >
            Settings
          </p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div>
            <p className="text-sm uppercase tracking-wider mb-1" style={{ color: 'var(--neutral-600)' }}>
              Map image quality
            </p>
            <p className="text-xs" style={{ color: 'var(--neutral-600)' }}>
              Applies to every map you generate or edit from now on.
            </p>
          </div>

          <div className="flex flex-col gap-2" aria-disabled={loading}>
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
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <input
                    type="radio"
                    name="imageSize"
                    value={size}
                    checked={checked}
                    disabled={loading}
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
          </div>

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
