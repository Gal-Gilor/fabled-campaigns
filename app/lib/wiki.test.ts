import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  abilityModifier,
  formatChallenge,
  formatModifier,
  getAllMonsters,
  getMonsterBySlug,
  getMonstersInGroup,
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

test('getMonstersInGroup orders members by CR', () => {
  assert.deepEqual(
    getMonstersInGroup('White Dragons').map((m) => m.name),
    ['White Dragon Wyrmling', 'Young White Dragon', 'Adult White Dragon', 'Ancient White Dragon']
  );
});
