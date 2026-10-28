// app/lib/wikiPaths.ts
// URL helpers for creature pages. No data import and relative imports only, so
// client components and next.config.ts (which loads outside the '@/' alias) can use it.
import type { Monster, MonsterCategory } from '../../types/wiki';

export const CATEGORY_PATHS: Record<MonsterCategory, string> = {
  Monster: 'monsters',
  Animal: 'animals',
};

// 'White Dragons' -> 'white-dragons', as roll-to-quest slugifies names.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type HrefFields = Pick<Monster, 'slug' | 'group' | 'category'>;

// Each group has one page. When it holds several stat blocks, the anchor
// points at this one.
export function monsterHref(m: HrefFields, groupSize: number): string {
  const page = `/wiki/${CATEGORY_PATHS[m.category]}/${slugify(m.group)}`;
  return groupSize > 1 ? `${page}#${m.slug}` : page;
}

// Records used to have one page each under /wiki/monsters. Send every old URL
// that is no longer a page to the group page holding the record.
export function legacyMonsterRedirects(monsters: HrefFields[]) {
  const sizes = new Map<string, number>();
  for (const m of monsters) sizes.set(m.group, (sizes.get(m.group) ?? 0) + 1);

  return monsters
    .map((m) => ({
      source: `/wiki/monsters/${m.slug}`,
      destination: monsterHref(m, sizes.get(m.group)!),
      permanent: true,
    }))
    .filter((r) => r.destination.split('#')[0] !== r.source);
}
