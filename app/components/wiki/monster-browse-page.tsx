// app/components/wiki/monster-browse-page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { getAllMonsters, getMonsterGroupSummaries, sortedCRs } from '@/app/lib/wiki';
import { MonstersBrowser } from '@/app/wiki/monsters/monsters-browser';
import { CardGrid } from './card-grid';
import { MonsterCard } from './monster-card';
import { CATEGORY_LABELS } from './monster-group-page';
import type { MonsterCategory } from '@/types/wiki';

// The /wiki/monsters and /wiki/animals listings: one card per group.
export function MonsterBrowsePage({ category }: { category: MonsterCategory }) {
  const groups = getMonsterGroupSummaries(category);
  const types = [...new Set(groups.flatMap((g) => g.creatureTypes))].sort();
  const crs = sortedCRs(getAllMonsters().filter((m) => m.category === category));
  const title = CATEGORY_LABELS[category];

  return (
    <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
        <Link href="/wiki" style={{ color: 'var(--primary-blue)' }}>
          Wiki
        </Link>
        {' / '}
        {title}
      </nav>

      <h1
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: 'var(--neutral-900)',
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          marginBottom: '2rem',
        }}
      >
        {title}
      </h1>

      <Suspense
        fallback={
          <CardGrid items={groups} renderCard={(group) => <MonsterCard group={group} />} />
        }
      >
        <MonstersBrowser groups={groups} types={types} crs={crs} />
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
