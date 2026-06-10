// app/components/wiki/magic-item-card.tsx
import Link from 'next/link';
import type { MagicItemSummary, MagicItemRarity } from '@/types/wiki';

const RARITY_COLORS: Record<MagicItemRarity, { bg: string; color: string }> = {
  Common: { bg: 'var(--neutral-200)', color: 'var(--neutral-600)' },
  Uncommon: { bg: '#dcfce7', color: '#15803d' },
  Rare: { bg: 'var(--pale-blue)', color: 'var(--primary-blue)' },
  'Very Rare': { bg: '#f3e8ff', color: '#7e22ce' },
  Legendary: { bg: 'var(--pale-gold)', color: 'var(--accent-gold)' },
  Artifact: { bg: '#fee2e2', color: '#dc2626' },
  Varies: { bg: 'var(--neutral-200)', color: 'var(--neutral-600)' },
};

export function MagicItemCard({ item }: { item: MagicItemSummary }) {
  const colors = RARITY_COLORS[item.rarity];
  return (
    <Link
      href={`/wiki/magic-items/${item.slug}`}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.5rem',
            marginBottom: '0.375rem',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              fontWeight: 600,
              color: 'var(--neutral-900)',
              fontSize: '0.9375rem',
              margin: 0,
            }}
          >
            {item.name}
          </p>
          <span
            style={{
              background: colors.bg,
              color: colors.color,
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {item.rarity}
          </span>
        </div>
        <p style={{ color: 'var(--neutral-600)', fontSize: '0.8125rem', margin: 0 }}>
          {item.itemType}
          {item.requiresAttunement ? ' · Attunement' : ''}
        </p>
      </div>
    </Link>
  );
}
