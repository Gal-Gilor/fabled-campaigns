// app/wiki/monsters/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllMonsters, sortedCRs } from '@/app/lib/wiki';
import { MonstersBrowser } from './monsters-browser';

export const metadata: Metadata = {
  title: 'Monsters | Fabled Campaigns Wiki',
  description: 'Browse D&D 5e SRD monsters by creature type and challenge rating.',
  alternates: { canonical: '/wiki/monsters' },
};

export default function MonstersPage() {
  const monsters = getAllMonsters();
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
          marginBottom: '0.25rem',
        }}
      >
        Monsters
      </h1>
      <p style={{ color: 'var(--neutral-600)', marginBottom: '2rem' }}>
        {monsters.length} creatures from the D&D 5e System Reference Document.
      </p>

      <Suspense fallback={<p style={{ color: 'var(--neutral-600)' }}>Loading...</p>}>
        <MonstersBrowser monsters={monsters} types={types} crs={crs} />
      </Suspense>
    </main>
  );
}
