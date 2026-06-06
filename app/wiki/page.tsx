// app/wiki/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllMonsters, getAllMagicItems } from '@/app/lib/wiki';

export const metadata: Metadata = {
  title: 'Wiki | Fabled Campaigns',
  description:
    'Browse D&D 5e SRD monsters and magic items as reference cards. No account required.',
  alternates: { canonical: '/wiki' },
};

export default function WikiPage() {
  const monsterCount = getAllMonsters().length;
  const itemCount = getAllMagicItems().length;

  return (
    <main style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: 'var(--neutral-900)',
          marginBottom: '0.5rem',
        }}
      >
        Wiki
      </h1>
      <p style={{ color: 'var(--neutral-600)', marginBottom: '2rem' }}>
        D&D 5e reference cards from the System Reference Document. No account required.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <Link href="/wiki/monsters" style={{ textDecoration: 'none' }}>
          <div
            style={{
              border: '1px solid var(--neutral-200)',
              borderRadius: '0.5rem',
              padding: '1.25rem',
              background: '#fff',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'var(--neutral-900)',
                margin: '0 0 0.25rem',
                fontSize: '1.125rem',
              }}
            >
              Monsters
            </h2>
            <p
              style={{
                color: 'var(--neutral-600)',
                margin: '0 0 0.75rem',
                fontSize: '0.875rem',
              }}
            >
              Stat blocks for {monsterCount} creatures.
            </p>
            <span style={{ color: 'var(--primary-blue)', fontSize: '0.875rem' }}>
              Browse monsters →
            </span>
          </div>
        </Link>

        <Link href="/wiki/magic-items" style={{ textDecoration: 'none' }}>
          <div
            style={{
              border: '1px solid var(--neutral-200)',
              borderRadius: '0.5rem',
              padding: '1.25rem',
              background: '#fff',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'var(--neutral-900)',
                margin: '0 0 0.25rem',
                fontSize: '1.125rem',
              }}
            >
              Magic Items
            </h2>
            <p
              style={{
                color: 'var(--neutral-600)',
                margin: '0 0 0.75rem',
                fontSize: '0.875rem',
              }}
            >
              {itemCount} items from Common to Legendary.
            </p>
            <span style={{ color: 'var(--primary-blue)', fontSize: '0.875rem' }}>
              Browse items →
            </span>
          </div>
        </Link>
      </div>
    </main>
  );
}
