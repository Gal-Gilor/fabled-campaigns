'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WikiLayout({ children }: { children: React.ReactNode }) {
  const [isEmbedded, setIsEmbedded] = useState(true);

  useEffect(() => {
    try {
      setIsEmbedded(window.self !== window.top);
    } catch {
      setIsEmbedded(true);
    }
  }, []);

  return (
    <>
      {!isEmbedded && (
        <header style={{ borderBottom: '1px solid var(--neutral-200)', padding: '0.75rem 1.5rem' }}>
          <Link
            href="/"
            className="text-sm transition-opacity hover:opacity-75"
            style={{ color: 'var(--primary-blue)' }}
          >
            ← Fabled Campaigns
          </Link>
        </header>
      )}
      {children}
    </>
  );
}
