// app/lib/wiki.ts
import monstersData from '@/data/monsters.json';
import loreData from '@/data/monster-lore.json';
import magicItemsData from '@/data/magic-items.json';
import { monsterHref, slugify } from './wikiPaths';
import { stripCitations } from './loreRules';
import type {
  Monster,
  MonsterCategory,
  MonsterGroup,
  MonsterGroupSummary,
  MonsterLore,
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

// Keyed by SRD group name. Groups without an entry have no lore yet.
export function getAllLore(): Record<string, MonsterLore> {
  return loreData as Record<string, MonsterLore>;
}

export function getLore(group: string): MonsterLore | undefined {
  return getAllLore()[group];
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

function compareByCR(a: Monster, b: Monster): number {
  return crToNumber(a.cr) - crToNumber(b.cr) || a.name.localeCompare(b.name);
}

// Members are ordered by CR, so 'White Dragons' reads Wyrmling to Ancient.
export function getMonsterGroups(category: MonsterCategory): MonsterGroup[] {
  const members = new Map<string, Monster[]>();
  for (const m of getAllMonsters()) {
    if (m.category !== category) continue;
    members.set(m.group, [...(members.get(m.group) ?? []), m]);
  }
  return [...members]
    .map(([name, list]) => ({
      slug: slugify(name),
      name,
      category,
      members: list.sort(compareByCR),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getMonsterGroupBySlug(
  category: MonsterCategory,
  slug: string
): MonsterGroup | undefined {
  return getMonsterGroups(category).find((g) => g.slug === slug);
}

export function formatCRRange(crs: string[]): string {
  return crs.length > 1 ? `${crs[0]}–${crs[crs.length - 1]}` : crs[0];
}

function summarizeGroup({ slug, name, category, members }: MonsterGroup): MonsterGroupSummary {
  const sizes = new Set(members.map((m) => m.size));
  const types = new Set(members.map((m) => m.type));
  const creatureTypes = [...new Set(members.map((m) => m.creatureType))].sort();
  const crs = [...new Set(members.map((m) => m.cr))];
  return {
    slug,
    name,
    category,
    size: sizes.size === 1 ? members[0].size : null,
    type: types.size === 1 ? members[0].type : creatureTypes.join(' or '),
    creatureTypes,
    crs,
    crRange: formatCRRange(crs),
    memberNames: members.map((m) => m.name),
  };
}

// Card and filter fields for listing/browse views, so the stat blocks
// aren't serialized into the client bundle.
export function getMonsterGroupSummaries(category: MonsterCategory): MonsterGroupSummary[] {
  return getMonsterGroups(category).map(summarizeGroup);
}

// One line for page metadata: the lore description when there is one, else
// the stat block line for a single member, else the member names, shared type
// and CR range.
export function describeMonsterGroup(group: MonsterGroup): string {
  const lore = getLore(group.name);
  if (lore) return stripCitations(lore.description);
  if (group.members.length === 1) {
    const [m] = group.members;
    return `${m.size} ${m.type}, CR ${m.cr}. ${m.alignment}.`;
  }
  const { memberNames, type, crRange } = summarizeGroup(group);
  return `${memberNames.length} stat blocks: ${memberNames.join(', ')}. ${type}, CR ${crRange}.`;
}

const groupSizes = new Map<string, number>();
for (const m of getAllMonsters()) groupSizes.set(m.group, (groupSizes.get(m.group) ?? 0) + 1);

// Link to the record's section on its group page.
export function getMonsterHref(m: Pick<Monster, 'slug' | 'group' | 'category'>): string {
  return monsterHref(m, groupSizes.get(m.group) ?? 1);
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
