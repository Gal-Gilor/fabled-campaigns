// app/lib/wiki.ts
import monstersData from '@/data/monsters.json';
import magicItemsData from '@/data/magic-items.json';
import type { Monster, MagicItem, MagicItemRarity } from '@/types/wiki';

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
];

export function sortedRarities(items: MagicItem[]): MagicItemRarity[] {
  const present = new Set(items.map((i) => i.rarity));
  return RARITY_ORDER.filter((r) => present.has(r));
}
