// app/wiki/magic-items/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getMagicItemSummaries, sortedRarities } from '@/app/lib/wiki';
import { MagicItemsBrowser } from './magic-items-browser';

export const metadata: Metadata = {
  title: 'Magic Items | Fabled Campaigns Wiki',
  description: 'Browse D&D 5e SRD magic items by rarity and type.',
  alternates: { canonical: '/wiki/magic-items' },
};

export default function MagicItemsPage() {
  const items = getMagicItemSummaries();
  const rarities = sortedRarities(items);
  const types = [...new Set(items.map((i) => i.itemType))].sort();

  return (
    <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
        <Link href="/wiki" style={{ color: 'var(--primary-blue)' }}>
          Wiki
        </Link>
        {' / '}
        Magic Items
      </nav>

      <h1
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: 'var(--neutral-900)',
          marginBottom: '2rem',
        }}
      >
        Magic Items
      </h1>

      <Suspense fallback={<p style={{ color: 'var(--neutral-600)' }}>Loading...</p>}>
        <MagicItemsBrowser items={items} rarities={rarities} types={types} />
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
