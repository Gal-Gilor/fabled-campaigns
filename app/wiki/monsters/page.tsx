// app/wiki/monsters/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getMonsterSummaries, sortedCRs } from '@/app/lib/wiki';
import { MonstersBrowser } from './monsters-browser';

export const metadata: Metadata = {
  title: 'Monsters | Fabled Campaigns Wiki',
  description: 'Browse D&D 5e SRD monsters by creature type and challenge rating.',
  alternates: { canonical: '/wiki/monsters' },
};

export default function MonstersPage() {
  const monsters = getMonsterSummaries();
  const types = [...new Set(monsters.map((m) => m.type))].sort();
  const crs = sortedCRs(monsters);

  return (
    <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
        <Link href="/wiki" style={{ color: 'var(--primary-blue)' }}>
          Wiki
        </Link>
        {' / '}
        Monsters
      </nav>

      <h1
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: 'var(--neutral-900)',
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          marginBottom: '2rem',
        }}
      >
        Monsters
      </h1>

      <Suspense fallback={<p style={{ color: 'var(--neutral-600)' }}>Loading...</p>}>
        <MonstersBrowser monsters={monsters} types={types} crs={crs} />
      </Suspense>

      <nav style={{ borderTop: '1px solid var(--neutral-200)', marginTop: '2rem', paddingTop: '1.5rem' }}>
        <Link
          href="/wiki"
          className="inline-block border border-neutral-200 hover:border-primary hover:shadow-md bg-white transition-all duration-150"
          style={{
            padding: '0.625rem 2rem',
            borderRadius: '0.5rem',
            color: 'var(--neutral-700)',
            fontSize: '0.9375rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Back
        </Link>
      </nav>
    </main>
  );
}
