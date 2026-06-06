'use client';
import { useEffect } from 'react';

interface WikiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WikiModal({ isOpen, onClose }: WikiModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '56rem',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--neutral-200)',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontWeight: 600,
              color: 'var(--neutral-900)',
              fontSize: '1rem',
            }}
          >
            Wiki
          </span>
          <button
            onClick={onClose}
            aria-label="Close wiki"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: 'var(--neutral-600)',
              fontSize: '1.1rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <iframe
          src="/wiki"
          title="Wiki"
          style={{ flex: 1, border: 'none', width: '100%' }}
        />
      </div>
    </div>
  );
}
