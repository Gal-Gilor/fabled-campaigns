// app/wiki/magic-items/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllMagicItems, sortedRarities } from '@/app/lib/wiki';
import { MagicItemsBrowser } from './magic-items-browser';

export const metadata: Metadata = {
  title: 'Magic Items | Fabled Campaigns Wiki',
  description: 'Browse D&D 5e SRD magic items by rarity and type.',
  alternates: { canonical: '/wiki/magic-items' },
};

export default function MagicItemsPage() {
  const items = getAllMagicItems();
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
          marginBottom: '0.25rem',
        }}
      >
        Magic Items
      </h1>
      <p style={{ color: 'var(--neutral-600)', marginBottom: '2rem' }}>
        {items.length} items from the D&D 5e System Reference Document.
      </p>

      <Suspense fallback={<p style={{ color: 'var(--neutral-600)' }}>Loading...</p>}>
        <MagicItemsBrowser items={items} rarities={rarities} types={types} />
      </Suspense>
    </main>
  );
}
