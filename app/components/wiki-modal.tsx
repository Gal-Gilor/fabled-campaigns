'use client';
import { ModalOverlay } from './modal';

interface WikiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WikiModal({ isOpen, onClose }: WikiModalProps) {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClose={onClose} backdrop="rgba(15,23,42,0.6)" zIndex={50}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wiki"
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          width: 'calc(100% - 3rem)',
          maxWidth: '56rem',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }}
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
    </ModalOverlay>
  );
}
