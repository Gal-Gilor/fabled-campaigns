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
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--neutral-200)' }}
        >
          <Link
            href="/"
            className="font-semibold transition-opacity hover:opacity-75"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-700)', fontSize: '1.5rem' }}
          >
            Fabled Campaigns
          </Link>
        </header>
      )}
      {children}
    </>
  );
}
