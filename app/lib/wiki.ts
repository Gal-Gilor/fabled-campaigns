// app/lib/wiki.ts
import monstersData from '@/data/monsters.json';
import magicItemsData from '@/data/magic-items.json';
import type { Monster, MagicItem, MagicItemRarity, MagicItemSummary } from '@/types/wiki';

export function getAllMonsters(): Monster[] {
  return monstersData as Monster[];
}

export function getMonsterBySlug(slug: string): Monster | undefined {
  return getAllMonsters().find((m) => m.slug === slug);
}

export function getAllMagicItems(): MagicItem[] {
  return magicItemsData as MagicItem[];
}

export function getMagicItemBySlug(slug: string): MagicItem | undefined {
  return getAllMagicItems().find((i) => i.slug === slug);
}

// Body-less projection for listing/browse views, so the full markdown bodies
// aren't serialized into the client bundle.
export function getMagicItemSummaries(): MagicItemSummary[] {
  return getAllMagicItems().map(({ body, ...summary }) => summary);
}

export function crToNumber(cr: string): number {
  if (cr.includes('/')) {
    const [num, den] = cr.split('/').map(Number);
    return num / den;
  }
  return Number(cr);
}

export function sortedCRs(monsters: Monster[]): string[] {
  const unique = [...new Set(monsters.map((m) => m.cr))];
  return unique.sort((a, b) => crToNumber(a) - crToNumber(b));
}

const RARITY_ORDER: MagicItemRarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
  'Varies',
];

export function sortedRarities(items: Pick<MagicItem, 'rarity'>[]): MagicItemRarity[] {
  const present = new Set(items.map((i) => i.rarity));
  return RARITY_ORDER.filter((r) => present.has(r));
}
