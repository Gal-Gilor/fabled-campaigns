import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citedNumbers, loreErrors, stripCitations } from './loreRules';
import type { MonsterLore } from '@/types/wiki';

const GROUPS = new Set(['Wolf', 'Owlbear']);

const source = {
  title: 'Test page',
  publisher: 'Test publisher',
  url: 'https://example.org/wolf',
  license: 'All rights reserved',
  accessed: '2026-10-28',
};

function entry(overrides: Partial<MonsterLore> = {}): MonsterLore {
  return {
    description: 'A test description.[1]',
    lore: 'Test lore.[1]',
    origin: 'animal',
    sources: [source],
    ...overrides,
  };
}

test('citation markers are found and stripped', () => {
  assert.deepEqual(citedNumbers('One.[1] Two [2] and [1].'), [1, 2, 1]);
  assert.equal(stripCitations('Packs hunt together.[1] They howl [2].'), 'Packs hunt together. They howl.');
});

test('a complete entry passes', () => {
  assert.deepEqual(loreErrors({ Wolf: entry() }, GROUPS), []);
});

test('original lore may have no sources', () => {
  const original = entry({ origin: 'original', description: 'Test.', lore: 'Test.', sources: [] });
  assert.deepEqual(loreErrors({ Owlbear: original }, GROUPS), []);
});

test('entries are checked against the groups and the origin rules', () => {
  assert.deepEqual(loreErrors({ Wolves: entry() }, GROUPS), ['Wolves: not a group in data/monsters.json']);
  assert.deepEqual(
    loreErrors({ Wolf: entry({ description: 'Test.', lore: 'Test.', sources: [] }) }, GROUPS),
    ['Wolf: animal lore needs at least one source']
  );
  assert.deepEqual(
    loreErrors({ Wolf: entry({ description: 'x'.repeat(251) + '[1]' }) }, GROUPS),
    ['Wolf: description over 250 characters']
  );
});

test('every marker needs a source and every source needs a marker', () => {
  assert.deepEqual(loreErrors({ Wolf: entry({ lore: 'Test.[2]' }) }, GROUPS), [
    'Wolf: [2] has no matching source',
  ]);
  assert.deepEqual(loreErrors({ Wolf: entry({ sources: [source, source] }) }, GROUPS), [
    'Wolf: source 2 is never cited',
  ]);
});

test('sources need complete fields and an allowed https link', () => {
  const bad = (overrides: Partial<typeof source>) =>
    loreErrors({ Wolf: entry({ sources: [{ ...source, ...overrides }] }) }, GROUPS);

  assert.deepEqual(bad({ url: 'http://example.org/wolf' }), ['Wolf: source 1 needs an https URL']);
  assert.deepEqual(bad({ accessed: 'October 2026' }), [
    'Wolf: source 1 accessed date must be YYYY-MM-DD',
  ]);
  assert.deepEqual(bad({ license: ' ' }), ['Wolf: source 1 needs a title, publisher and license']);
  for (const url of [
    'https://en.wikipedia.org/wiki/Wolf',
    'https://www.dndbeyond.com/monsters/wolf',
    'https://forgottenrealms.fandom.com/wiki/Wolf',
  ]) {
    assert.deepEqual(bad({ url }), ['Wolf: source 1 links to a blocked site'], url);
  }
  assert.deepEqual(bad({ url: 'https://mythology.fandom.com/wiki/Medusa' }), []);
});
