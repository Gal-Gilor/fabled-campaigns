import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  abilityModifier,
  formatChallenge,
  formatModifier,
  getAllMonsters,
  describeMonsterGroup,
  formatCRRange,
  getMonsterBySlug,
  getMonsterGroupBySlug,
  getMonsterGroupSummaries,
  getMonsterGroups,
  getMonsterHref,
  sortedCRs,
} from './wiki';

// Mirrors WIKI_MONSTER_KEYS in roll-to-quest tests/wiki/test_models.py.
const MONSTER_KEYS = [
  'slug', 'name', 'category', 'group', 'size', 'type', 'creatureType',
  'alignment', 'ac', 'initiative', 'hp', 'speed',
  'str', 'dex', 'con', 'int', 'wis', 'cha', 'saves',
  'skills', 'gear', 'resistances', 'vulnerabilities', 'immunities',
  'senses', 'languages', 'cr', 'xp', 'xpInLair', 'proficiencyBonus', 'body',
].sort(); // prettier-ignore

test('every monster record has exactly the WikiMonster keys', () => {
  for (const m of getAllMonsters()) {
    assert.deepEqual(Object.keys(m).sort(), MONSTER_KEYS, m.slug);
  }
});

test('monster slugs are unique', () => {
  const slugs = getAllMonsters().map((m) => m.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('abilityModifier rounds down', () => {
  assert.deepEqual([1, 10, 11, 30].map(abilityModifier), [-5, 0, 0, 10]);
});

test('formatModifier signs every value', () => {
  assert.deepEqual([-5, 0, 17].map(formatModifier), ['-5', '+0', '+17']);
});

test('formatChallenge prints the SRD CR line', () => {
  assert.equal(
    formatChallenge(getMonsterBySlug('aboleth')!),
    '10 (XP 5,900, or 7,200 in lair; PB +4)'
  );
  assert.equal(formatChallenge(getMonsterBySlug('shrieker-fungus')!), '0 (XP 0; PB +2)');
});

test('sortedCRs orders fractions before whole numbers', () => {
  assert.deepEqual(sortedCRs([{ cr: '1' }, { cr: '1/8' }, { cr: '0' }, { cr: '1/2' }]), [
    '0',
    '1/8',
    '1/2',
    '1',
  ]);
});

test('a group page holds its members in CR order', () => {
  assert.deepEqual(
    getMonsterGroupBySlug('Monster', 'white-dragons')!.members.map((m) => m.name),
    ['White Dragon Wyrmling', 'Young White Dragon', 'Adult White Dragon', 'Ancient White Dragon']
  );
});

test('group pages are looked up within their category', () => {
  assert.equal(getMonsterGroupBySlug('Monster', 'wolf'), undefined);
  assert.equal(getMonsterGroupBySlug('Animal', 'white-dragons'), undefined);
  assert.equal(getMonsterGroupBySlug('Animal', 'wolf')!.members.length, 1);
});

test('no group mixes categories and group slugs are unique', () => {
  const groups = [...getMonsterGroups('Monster'), ...getMonsterGroups('Animal')];
  const slugs = groups.map((g) => g.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(new Set(groups.map((g) => g.name)).size, groups.length);
});

test('group summaries list every member type and CR', () => {
  const vampires = getMonsterGroupSummaries('Monster').find((g) => g.slug === 'vampires')!;
  assert.deepEqual(vampires.creatureTypes, ['Humanoid', 'Undead']);
  assert.equal(vampires.type, 'Humanoid or Undead');
  assert.equal(vampires.crRange, '3–13');

  const dragons = getMonsterGroupSummaries('Monster').find((g) => g.slug === 'white-dragons')!;
  assert.equal(dragons.size, null);
  assert.equal(dragons.type, 'Dragon (Chromatic)');
  assert.deepEqual(dragons.crs, ['2', '6', '13', '20']);
});

test('formatCRRange shows one CR or the lowest and highest', () => {
  assert.equal(formatCRRange(['1/4']), '1/4');
  assert.equal(formatCRRange(['2', '6', '24']), '2–24');
});

test('describeMonsterGroup keeps the stat block line for a single member', () => {
  assert.equal(
    describeMonsterGroup(getMonsterGroupBySlug('Monster', 'aboleth')!),
    'Large Aberration, CR 10. Lawful Evil.'
  );
  assert.match(
    describeMonsterGroup(getMonsterGroupBySlug('Monster', 'bandits')!),
    /^2 stat blocks: Bandit, Bandit Captain\. Humanoid, CR 1\/8–2\.$/
  );
});

test('getMonsterHref links to the group page and the member section', () => {
  assert.equal(getMonsterHref(getMonsterBySlug('wolf')!), '/wiki/animals/wolf');
  assert.equal(
    getMonsterHref(getMonsterBySlug('adult-white-dragon')!),
    '/wiki/monsters/white-dragons#adult-white-dragon'
  );
  assert.equal(getMonsterHref(getMonsterBySlug('azer-sentinel')!), '/wiki/monsters/azer');
  assert.equal(getMonsterHref(getMonsterBySlug('troll-limb')!), '/wiki/monsters/troll#troll-limb');
});
