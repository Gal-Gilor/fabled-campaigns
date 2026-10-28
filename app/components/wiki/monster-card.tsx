// app/components/wiki/monster-card.tsx
import Link from 'next/link';
import { CATEGORY_PATHS } from '@/app/lib/wikiPaths';
import type { MonsterGroupSummary } from '@/types/wiki';

const badgeStyle = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '3px',
};

export function MonsterCard({ group }: { group: MonsterGroupSummary }) {
  const count = group.memberNames.length;
  return (
    <Link
      href={`/wiki/${CATEGORY_PATHS[group.category]}/${group.slug}`}
      style={{ textDecoration: 'none', display: 'block', height: '100%' }}
    >
      <div
        style={{
          border: '1px solid var(--neutral-200)',
          borderRadius: '0.5rem',
          padding: '1rem',
          background: '#fff',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 600,
            color: 'var(--neutral-900)',
            fontSize: '0.9375rem',
            margin: '0 0 0.375rem',
          }}
        >
          {group.name}
        </p>
        <p style={{ color: 'var(--neutral-600)', fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>
          {group.size ? `${group.size} ${group.type}` : group.type}
        </p>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          <span style={{ ...badgeStyle, background: 'var(--pale-gold)', color: 'var(--accent-gold)' }}>
            CR {group.crRange}
          </span>
          {count > 1 && (
            <span
              style={{ ...badgeStyle, background: 'var(--neutral-200)', color: 'var(--neutral-700)' }}
            >
              {count} stat blocks
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
