'use client';
import { useEffect, useRef } from 'react';

// Escape-to-close with a ref-stable callback so the listener never re-subscribes
export function useEscape(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

// Shared modal shell: centered backdrop, escape-to-close, body scroll lock,
// click-outside-to-close. Children render the card; inner clicks don't close.
export function ModalOverlay({
  onClose,
  children,
  backdrop = 'rgba(0,0,0,0.5)',
  zIndex = 100,
}: {
  onClose: () => void;
  children: React.ReactNode;
  backdrop?: string;
  zIndex?: number;
}) {
  useEscape(onClose);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: backdrop, zIndex }}
      onClick={onClose}
    >
      <div className="contents" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
