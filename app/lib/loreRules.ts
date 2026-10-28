// app/lib/loreRules.ts
// Checks for data/monster-lore.json. The data test runs them on every entry.
import type { LoreOrigin, MonsterLore } from '@/types/wiki';

const ORIGINS: LoreOrigin[] = ['animal', 'myth', 'history', 'original'];

// Never cited: Wikipedia by the owner's choice, Wizards' own sites, and wikis
// that retell Wizards' books.
export const BLOCKED_SOURCE_HOSTS = [
  'wikipedia.org',
  'wizards.com',
  'dndbeyond.com',
  'forgottenrealms.fandom.com',
];

export const MAX_DESCRIPTION_LENGTH = 250;

const CITATION = /\[(\d+)\]/g;

export function citedNumbers(text: string): number[] {
  return [...text.matchAll(CITATION)].map((match) => Number(match[1]));
}

// For plain-text uses such as page metadata. Drops the space before a marker too.
export function stripCitations(text: string): string {
  return text.replace(/\s*\[\d+\]/g, '');
}

function isBlocked(url: string): boolean {
  const host = new URL(url).hostname;
  return BLOCKED_SOURCE_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// Returns one message per problem, each naming the group, so an empty list means valid.
export function loreErrors(entries: Record<string, MonsterLore>, groups: Set<string>): string[] {
  const errors: string[] = [];
  for (const [group, entry] of Object.entries(entries)) {
    const fail = (message: string) => errors.push(`${group}: ${message}`);

    if (!groups.has(group)) fail('not a group in data/monsters.json');
    if (!ORIGINS.includes(entry.origin)) fail(`unknown origin '${entry.origin}'`);
    if (!entry.description.trim()) fail('empty description');
    if (stripCitations(entry.description).length > MAX_DESCRIPTION_LENGTH) {
      fail(`description over ${MAX_DESCRIPTION_LENGTH} characters`);
    }
    if (!entry.lore.trim()) fail('empty lore');
    if (entry.origin !== 'original' && entry.sources.length === 0) {
      fail(`${entry.origin} lore needs at least one source`);
    }

    entry.sources.forEach((source, i) => {
      const label = `source ${i + 1}`;
      if (!source.title.trim() || !source.publisher.trim() || !source.license.trim()) {
        fail(`${label} needs a title, publisher and license`);
      }
      if (!isDate(source.accessed)) fail(`${label} accessed date must be YYYY-MM-DD`);
      if (!URL.canParse(source.url) || !source.url.startsWith('https://')) {
        fail(`${label} needs an https URL`);
      } else if (isBlocked(source.url)) {
        fail(`${label} links to a blocked site`);
      }
    });

    const cited = new Set(citedNumbers(`${entry.description}\n${entry.lore}`));
    for (const n of cited) {
      if (n < 1 || n > entry.sources.length) fail(`[${n}] has no matching source`);
    }
    entry.sources.forEach((_, i) => {
      if (!cited.has(i + 1)) fail(`source ${i + 1} is never cited`);
    });
  }
  return errors;
}
