// app/lib/wiki.ts
import monstersData from '@/data/monsters.json';
import magicItemsData from '@/data/magic-items.json';
import type {
  Monster,
  MonsterSummary,
  MagicItem,
  MagicItemRarity,
  MagicItemSummary,
} from '@/types/wiki';

export function getAllMonsters(): Monster[] {
  return monstersData as Monster[];
}

export function getMonsterBySlug(slug: string): Monster | undefined {
  return getAllMonsters().find((m) => m.slug === slug);
}

// Card and filter fields for listing/browse views, so the stat blocks
// aren't serialized into the client bundle.
export function getMonsterSummaries(): MonsterSummary[] {
  return getAllMonsters().map(({ slug, name, category, size, type, creatureType, cr }) => ({
    slug,
    name,
    category,
    size,
    type,
    creatureType,
    cr,
  }));
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

export function sortedCRs(monsters: Pick<Monster, 'cr'>[]): string[] {
  const unique = [...new Set(monsters.map((m) => m.cr))];
  return unique.sort((a, b) => crToNumber(a) - crToNumber(b));
}

// Group members ordered by CR, so 'White Dragons' reads Wyrmling to Ancient.
export function getMonstersInGroup(group: string): Monster[] {
  return getAllMonsters()
    .filter((m) => m.group === group)
    .sort((a, b) => crToNumber(a.cr) - crToNumber(b.cr) || a.name.localeCompare(b.name));
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

// The SRD 5.2 CR line, e.g. '10 (XP 5,900, or 7,200 in lair; PB +4)'.
export function formatChallenge(
  m: Pick<Monster, 'cr' | 'xp' | 'xpInLair' | 'proficiencyBonus'>
): string {
  const lair = m.xpInLair != null ? `, or ${m.xpInLair.toLocaleString('en-US')} in lair` : '';
  return `${m.cr} (XP ${m.xp.toLocaleString('en-US')}${lair}; PB +${m.proficiencyBonus})`;
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
