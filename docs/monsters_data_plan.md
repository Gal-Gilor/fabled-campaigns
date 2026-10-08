# Wiki Monsters: Ship the SRD Dataset

`data/monsters.json` holds one hand-written Goblin in the SRD 5.1 shape. This plan replaces it
with the 330 SRD 5.2.1 stat blocks built in roll-to-quest (`data/wiki/monsters.json` on `main`,
merged in PR #3) and adapts the Wiki to the new shape. The contract is `WikiMonster` in
roll-to-quest `src/wiki/models.py`, with the key set in `tests/wiki/test_models.py`. Data fixes
happen upstream and arrive as a regenerated file; the JSON is never edited here.

It follows the magic items rollout: types aligned with the data (`2913156`, `46144b4`), the data
swapped (`31add4b`), and browse pages fed a light summary (`6d5f377`, `ea1f926`).

## Decisions

Each step below assumes the recommendation. Confirm or change these before work starts.

| # | Question | Recommendation |
|---|---|---|
| 1 | Type filter on `creatureType` (14) or `type` (31) | `creatureType`. The 31 printed types split Dragon into 3 options and Humanoid into 4. Cards and the stat block keep showing the printed `type`. The URL key stays `type`. |
| 2 | Monster/Animal filter, and how search labels animals | Add a Category select before Type. Search results show the record's `category` ("Monster" or "Animal") as the badge. All 90 Beasts are Animals, so Category mostly matters for the 5 non-Beast animals (Giant Eagle, Giant Elk, Giant Owl, Flying Snake, Giant Vulture) and for matching the SRD chapter split. |
| 3 | Link group members from detail pages | Yes, as the last step, so it can be dropped without touching the rest. 31 of 272 groups have more than one member. Sort members by CR, so White Dragons reads Wyrmling, Young, Adult, Ancient (name order would put Wyrmling third). |
| 4 | Stat block labels and ability layout | SRD 5.2 labels (AC, Initiative, HP, Speed, CR), since Initiative and the CR line are 5.2 values printed as-is. Keep the 3/6-column grid; each cell shows the ability label, the score, then "Mod +5" and "Save +5" on two small lines. |
| 5 | Helpers that move into `app/lib/wiki.ts` and get tests | `formatModifier`, `formatChallenge`, `getMonstersInGroup`, plus tests for the untested `sortedCRs`. Add one data test that checks every record's key set and slug uniqueness, since `getAllMonsters()` casts the JSON with no runtime check. |

## Steps

One PR, one commit per step. Every step leaves the app building.

### 1. Types and data together

- `types/wiki.ts`: replace `Monster` with the 31-key shape. Add
  `MonsterCategory = 'Monster' | 'Animal'` and `AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'`.
  `ac`, `xp` and `proficiencyBonus` are `number`; `xpInLair` is `number | null`; `saves` is
  `Record<AbilityKey, number>`; `skills`, `gear`, `resistances`, `vulnerabilities` and
  `immunities` are `string | null` (the dump writes `null`, never omits the key). The rest are
  `string`, as `MagicItem` does for `itemType`.
- `types/wiki.ts`: `MonsterSummary` becomes
  `Pick<Monster, 'slug' | 'name' | 'category' | 'size' | 'type' | 'creatureType' | 'cr'>`.
  `Omit<Monster, 'body'>` would ship 229 KB to the browse page; the `Pick` ships 49 KB.
- `app/lib/wiki.ts`: `getMonsterSummaries()` maps those seven fields explicitly.
- `data/monsters.json`: copy from roll-to-quest `data/wiki/monsters.json`. Name the source commit
  in the commit message.

The existing components compile unchanged against this: they read `name`, `size`, `type`,
`alignment`, `ac`, `hp`, `speed`, the scores and `cr`, which all still exist.

Done when: `npm run lint` and `npx tsc --noEmit` pass, and `npx prettier --check data/monsters.json`
passes. If Prettier disagrees with the upstream formatting, add `data/monsters.json` to
`.prettierignore` rather than reformatting the file.

### 2. Helpers and tests

`app/lib/wiki.ts`:

- `formatModifier(n: number): string` returns `+3`, `-1` or `+0`. It replaces `modifier()` in
  `stat-block.tsx` and also formats saves.
- `abilityModifier(score: number): number` returns `Math.floor((score - 10) / 2)`.
- `formatChallenge(m: Pick<Monster, 'cr' | 'xp' | 'xpInLair' | 'proficiencyBonus'>): string`
  returns `10 (XP 5,900, or 7,200 in lair; PB +4)` or `0 (XP 0; PB +2)`, using
  `toLocaleString('en-US')`.
- `getMonstersInGroup(group: string): Monster[]` returns the group's members sorted by
  `crToNumber`, then name.

New `app/lib/wiki.test.ts`, in the `node:test` style of `app/lib/prompts.test.ts`:

- `abilityModifier` at 1, 10, 11 and 30 (-5, 0, 0, +10), and `formatModifier` at -5, 0 and 17.
- `formatChallenge` for Aboleth (lair XP) and Shrieker Fungus (CR 0, no lair).
- `sortedCRs(['1', '1/8', '0', '1/2'])` returns `['0', '1/8', '1/2', '1']`.
- `getMonstersInGroup('White Dragons')` returns Wyrmling, Young, Adult, Ancient.
- Every record in `getAllMonsters()` has exactly the 31 keys (listed in the test, matching
  `WIKI_MONSTER_KEYS`), and slugs are unique. No count assertion, so a legitimate regeneration
  doesn't fail it.

Done when: `npm test` runs the new file and passes.

### 3. Stat block

`app/components/wiki/stat-block.tsx`, keeping its inline styles:

- Italic line unchanged: `{size} {type}, {alignment}` ("Medium or Small Monstrosity (Lycanthrope),
  Chaotic Evil").
- `AC {ac}` and `Initiative {initiative}` on one line, then `HP`, then `Speed`.
- Ability grid as in decision 4: `formatModifier(abilityModifier(score))` and
  `formatModifier(saves[key])`. `ABILITY_SCORES` keys type as `AbilityKey`.
- Skills, Gear, Resistances, Vulnerabilities and Immunities, each only when non-null, then Senses
  and Languages.
- `CR {formatChallenge(monster)}` replaces `Challenge {cr}`.

No change to `markdown-body.tsx` or the detail page body: every body starts with an H2 (Traits,
Actions, or Reactions for Shrieker Fungus), which the existing `h2` renderer styles.

Done when: lint passes and the detail pages in Verification render every field.

### 4. Browse page

- `app/wiki/monsters/page.tsx`: derive `creatureTypes` from `m.creatureType` instead of `m.type`.
  Update the metadata description to mention animals and category.
- `app/wiki/monsters/monsters-browser.tsx`: add
  `{ key: 'category', label: 'Category', type: 'select', getValue: (m) => m.category, options: ['Monster', 'Animal'] }`
  before Type, and point the `type` filter's `getValue` at `m.creatureType`. CR is unchanged.
- `app/components/wiki/monster-card.tsx`: no change. It reads `name`, `size`, `type` and `cr`,
  all in the summary.

Done when: the filter checks in Verification pass.

### 5. Search and README

- `app/wiki/page.tsx`: the monster badge becomes `r.item.category`. Matching on `name` and `type`
  stays, since `type` contains the base type.
- `README.md` line 83: replace "The dataset currently contains one sample entry" with "330 stat
  blocks (235 monsters, 95 animals), filterable by name, category, creature type and challenge
  rating."

`app/sitemap.ts` and `generateStaticParams` pick up the new slugs with no change. The `goblin`
slug goes away (the SRD 5.2 has Goblin Minion, Warrior and Boss); nothing in the repo links to it.

Done when: `/wiki?search=dragon` shows dragons with the Monster badge and a printed type such as
"Dragon (Chromatic) · CR 13".

### 6. Group links (decision 3)

`app/wiki/monsters/[slug]/page.tsx`: after `<MarkdownBody>`, when
`getMonstersInGroup(monster.group)` has more than one member, render the group name as a heading
and the other members as links, styled like the breadcrumb links. The page stays a server
component.

Done when: `adult-white-dragon` links to the other three White Dragons and `aboleth` shows no
group section.

## Verification

Run after step 6 (or step 5 if group links are dropped):

- `npm run lint` and `npm test` pass.
- `npx next build` passes and reports 330 `/wiki/monsters/[slug]` pages. Don't use
  `npm run build`, which runs `db/migrate.ts` and needs `DATABASE_URL_UNPOOLED`.
- In `npm run dev`:

| Page | Check |
|---|---|
| `/wiki/monsters/aboleth` | CR line `10 (XP 5,900, or 7,200 in lair; PB +4)`, Legendary Actions section |
| `/wiki/monsters/adult-white-dragon` | Type "Dragon (Chromatic)", Immunities "Cold", group links |
| `/wiki/monsters/werewolf` | "Medium or Small", Gear "Longbow", Bonus Actions section |
| `/wiki/monsters/allosaurus` | Body opens with Actions, no Traits heading |
| `/wiki/monsters/shrieker-fungus` | Body opens with Reactions, saves of -5 render as `-5` |
| `/wiki/monsters?category=Animal&type=Celestial` | Exactly Giant Eagle, Giant Elk, Giant Owl |
| `/wiki?search=dragon` | Dragon results with badge and descriptor; magic items still listed |

## Out of scope

The `lookupSRD` stub in `app/lib/tools.ts`, magic items, and any roll-to-quest change.
