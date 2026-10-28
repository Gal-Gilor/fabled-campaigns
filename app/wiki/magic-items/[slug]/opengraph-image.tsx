// app/wiki/magic-items/[slug]/opengraph-image.tsx
import { notFound } from 'next/navigation';
import { getAllMagicItems, getMagicItemBySlug } from '@/app/lib/wiki';
import { wikiOgImage, type OgBadge } from '@/app/lib/wikiOgImage';
import type { MagicItemRarity } from '@/types/wiki';

export const alt = 'Magic item from the Fabled Campaigns Wiki';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return getAllMagicItems().map((item) => ({ slug: item.slug }));
}

// Hex values of RARITY_COLORS in magic-item-card.tsx.
const RARITY_COLORS: Record<MagicItemRarity, { background: string; color: string }> = {
  Common: { background: '#e2e8f0', color: '#475569' },
  Uncommon: { background: '#dcfce7', color: '#15803d' },
  Rare: { background: '#dbeafe', color: '#2563eb' },
  'Very Rare': { background: '#f3e8ff', color: '#7e22ce' },
  Legendary: { background: '#fef3c7', color: '#f59e0b' },
  Artifact: { background: '#fee2e2', color: '#dc2626' },
  Varies: { background: '#e2e8f0', color: '#475569' },
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getMagicItemBySlug(slug);
  if (!item) notFound();

  const badges: OgBadge[] = [{ label: item.rarity, ...RARITY_COLORS[item.rarity] }];
  if (item.requiresAttunement) {
    badges.push({
      label: 'Requires attunement',
      background: 'rgba(255, 255, 255, 0.14)',
      color: '#ffffff',
    });
  }

  return wikiOgImage({ kind: 'Magic Item', name: item.name, subtitle: item.itemType, badges });
}
