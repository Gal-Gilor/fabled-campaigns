import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legacyMonsterRedirects, slugify } from './wikiPaths';
import { getAllMonsters, getMonsterGroups } from './wiki';

test('slugify matches the record slugs', () => {
  assert.equal(slugify('White Dragons'), 'white-dragons');
  assert.equal(slugify("Will-o'-Wisp"), 'will-o-wisp');
  for (const m of getAllMonsters()) assert.equal(slugify(m.name), m.slug);
});

const redirects = legacyMonsterRedirects(getAllMonsters());
const find = (slug: string) => redirects.find((r) => r.source === `/wiki/monsters/${slug}`);

test('old record URLs redirect to their group page', () => {
  assert.equal(
    find('adult-white-dragon')?.destination,
    '/wiki/monsters/white-dragons#adult-white-dragon'
  );
  assert.equal(find('azer-sentinel')?.destination, '/wiki/monsters/azer');
  assert.equal(find('wolf')?.destination, '/wiki/animals/wolf');
});

test('URLs that are still pages do not redirect', () => {
  assert.equal(find('aboleth'), undefined);
  // /wiki/monsters/troll is the Troll group page, so it must not redirect to itself.
  assert.equal(find('troll'), undefined);

  const pages = new Set(getMonsterGroups('Monster').map((g) => `/wiki/monsters/${g.slug}`));
  for (const r of redirects) assert.ok(!pages.has(r.source), r.source);
});
