# Wiki Monsters: Replace the Placeholder with the SRD Dataset

`data/monsters.json` holds one hand-written Goblin in the SRD 5.1 format. This plan replaces it
with every stat block from the SRD 5.2.1 Monsters A-Z and Animals chapters, shaped by the
`WikiMonster` model in roll-to-quest (`src/wiki/models.py` on `claude/wiki-monster-model`), and
updates the Wiki code to read the new shape.

It follows the magic items rollout: a structured-output model in roll-to-quest produces the JSON,
the JSON is copied into `data/`, and the Wiki types and components change to match.

## Source data

`monster_az.md` at the roll-to-quest root, checked while writing this plan:

| Check | Result |
|---|---|
| Stat blocks (`#### ` headings) | 330: 235 under `## Monsters A-Z`, 95 under `## Animals` |
| Group headings (`### `) | 272, none with prose between the group heading and its first stat block |
| Size and alignment on the italic line | All 330 fit `MonsterSize` and `MonsterAlignment` |
| Printed creature types | 31 distinct values, which reduce to the 14 `CreatureType` members |
| AC, HP, Initiative, Speed, Senses, Languages, CR lines | Present in all 330, and AC/HP/Initiative match the model's patterns |
| Optional lines | Skills 216, Immunities 147, Resistances 70, Gear 45, Vulnerabilities 15 |
| Section headings (`##### `) | Only Traits, Actions, Bonus Actions, Reactions, Legendary Actions |
| Slugs from `slugify(name)` | All unique |

Three CR lines put "XP" after the number: Gold Dragon Wyrmling (`3 (700 XP; PB +2)`), White Dragon
Wyrmling (`2 (450 XP; PB +2)`) and Young White Dragon (`6 (2,300 XP; PB +3)`). Every other block
prints `CR 10 (XP 5,900, ...)`. Fix these three in `monster_az.md` before the run so the source
and the cross-check below agree.

## Part 1: roll-to-quest, generate `monsters.json`

Work on `claude/fabled-monster-data-plan-110tw4`, branched from `claude/wiki-monster-model` (or
from `main` once that branch merges), so `src/wiki/models.py` and its tests are available.

### 1.1 Split the source into stat blocks

Add `src/wiki/splitter.py` with one function that walks `monster_az.md` line by line and yields
one record per `#### ` heading:

- `category`: `"Monster"` while under `## Monsters A-Z`, `"Animal"` under `## Animals`.
- `group`: the most recent `### ` heading text.
- `name`: the `#### ` heading text.
- `text`: the stat block from its `#### ` line up to the next `#### ` or `### ` line.

This is plain string handling, with tests in `tests/wiki/test_splitter.py` asserting 330 blocks,
the 235/95 split, and the group for a few known entries (Adult White Dragon is in White Dragons,
Bandit Captain is in Bandits).

### 1.2 Extract with Gemini structured output

Add `src/scripts/build_wiki_monsters.py`:

1. Split the source (1.1).
2. For each block, call Gemini with `response_schema=WikiMonster` (the schema already excludes
   `slug`), wrapped in `gemini_async_retry()` from `src/services/gemini.py` the way
   `src/extraction/utils.py` does for entity extraction. The prompt template goes in
   `src/templates/extract_wiki_monster.md` and carries the category, group and stat block text.
   It restates the field rules the model descriptions already encode: copy values as printed,
   rewrite `##### ` section headings as `## `, keep entries verbatim, and use `null` for absent
   optional lines.
3. Validate each response with `WikiMonster.model_validate`. On `ValidationError`, retry once
   with the error text appended to the prompt; log and collect blocks that still fail.
4. Gate calls with an `AsyncLimiter`, as `src/scripts/extract_entities.py` does.

### 1.3 Cross-check against the source

The source is regular enough that most scalar fields can be read back with a regex. After
validation, compare each record with its block and fail the run on any mismatch:

- `name`, `category`, `group` equal the splitter values.
- `ac`, `initiative`, `hp`, `speed`, `senses`, `languages`, `skills`, `gear`, `resistances`,
  `vulnerabilities`, `immunities` equal the text after the matching `**Label** `.
- `cr`, `xp`, `xpInLair`, `proficiencyBonus` match the parsed CR line.
- The six scores and saves match the ability table.
- `body` equals the block from the first `##### ` line onward, with `##### ` replaced by `## `.

Every field except `type`, `creatureType`, `size` and `alignment` is checked this way, and those
four are constrained by the model's `Literal` and enum types. This makes LLM transcription errors
in the body or numbers fail loudly instead of reaching the Wiki.

### 1.4 Write the output

Sort the validated records by `name` (the Wiki lists monsters and animals together) and write
`model_dump()` output to `data/wiki/monsters.json` with `indent=2` and `ensure_ascii=False`.
Commit the script, splitter, template, tests and output.

Done when: `poetry run pytest tests/wiki` passes, the script reports 330 records with zero
validation failures and zero cross-check mismatches, and `ruff check` is clean.

## Part 2: fabled-campaigns, adapt the Wiki

One PR on `claude/fabled-monster-data-plan-110tw4`. The type change and the data swap land
together because `getAllMonsters()` casts the JSON to `Monster[]` without runtime checks.

### 2.1 `types/wiki.ts`

Replace `Monster` with the `WikiMonster` shape (the key set in `tests/wiki/test_models.py`):

```ts
export type MonsterCategory = 'Monster' | 'Animal';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type Monster = {
  slug: string;
  name: string;
  category: MonsterCategory;
  group: string;
  size: string;
  type: string; // as printed, e.g. 'Fiend (Demon)'
  creatureType: string; // base type for filtering, e.g. 'Fiend'
  alignment: string;
  ac: number; // was a string like '15 (leather armor, shield)'
  initiative: string;
  hp: string;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  saves: Record<AbilityKey, number>;
  skills: string | null;
  gear: string | null;
  resistances: string | null;
  vulnerabilities: string | null;
  immunities: string | null;
  senses: string;
  languages: string;
  cr: string;
  xp: number;
  xpInLair: number | null;
  proficiencyBonus: number;
  body: string;
};
```

Optional fields are `string | null` rather than `?:` because the Python model dumps `null`.

`MonsterSummary` changes from `Omit<Monster, 'body'>` to a `Pick` of what the card and filters
read: `slug`, `name`, `category`, `size`, `type`, `creatureType`, `cr`. With 330 records and the
new fields, omitting only `body` would send saves, senses and the rest to the client for nothing.

### 2.2 `app/lib/wiki.ts`

- `getMonsterSummaries()` maps to the narrowed `MonsterSummary` explicitly.
- Add `formatModifier(n: number): string` (`+3`, `-1`, `+0`), moved out of `stat-block.tsx` so
  the save column can use it too.
- Add `formatChallenge(m)` returning the SRD line, e.g. `10 (XP 5,900, or 7,200 in lair; PB +4)`,
  with `toLocaleString('en-US')` for the thousands separator.
- Add `getMonstersInGroup(group)` for 2.5.
- `crToNumber` and `sortedCRs` stay as they are.

Add `app/lib/wiki.test.ts` (already matched by `npm test`) covering `formatModifier`,
`formatChallenge` with and without lair XP, and `sortedCRs` on `['1', '1/8', '0', '1/2']`.

### 2.3 `app/components/wiki/stat-block.tsx`

Rewrite to the SRD 5.2 layout:

- Italic line: `{size} {type}, {alignment}` (unchanged; "Medium or Small" reads correctly).
- AC, Initiative, HP, Speed.
- Ability table with Score, Mod and Save columns. Mod is computed, Save comes from
  `monster.saves`. Keep the current 3-column mobile / 6-column desktop grid, one cell per ability
  showing all three values.
- Skills, Gear, Resistances, Vulnerabilities, Immunities, each rendered only when non-null, then
  Senses and Languages.
- `CR {formatChallenge(monster)}` replaces "Challenge {cr}".

The body already starts with `## Traits` or `## Actions`, which `MarkdownBody` styles as h2, so
the detail page needs no body handling change. The placeholder's untitled traits paragraph goes
away with the placeholder.

### 2.4 Browse page and filters

`app/wiki/monsters/page.tsx` and `monsters-browser.tsx`:

- Type filter reads `creatureType` instead of `type`: 14 options instead of 31 tagged variants.
- New Category select (Monster, Animal) before Type.
- CR filter unchanged.

`monster-card.tsx` keeps its layout and reads from the narrowed summary.

### 2.5 Detail page

`app/wiki/monsters/[slug]/page.tsx`:

- Metadata and JSON-LD descriptions keep their current template; all fields they read still exist.
- Below the body, when `getMonstersInGroup(monster.group)` returns more than one entry, list the
  others as links under the group name (White Dragons: Wyrmling, Young, Adult, Ancient). This is
  what `group` exists for. It is the one UI addition beyond matching the data, and can be split out
  if not wanted now.

### 2.6 Wiki search and README

- `app/wiki/page.tsx`: the result badge uses `r.item.category` ("Monster" or "Animal") instead of
  the fixed "Monster". Matching on `name` and `type` is unchanged.
- `README.md`: replace "The dataset currently contains one sample entry" with the real count and
  filters (330 stat blocks, 235 monsters and 95 animals, filterable by name, category, creature
  type and challenge rating).

`app/sitemap.ts` and `generateStaticParams` pick up the new slugs with no change.

### 2.7 Data

Copy `data/wiki/monsters.json` from roll-to-quest over `data/monsters.json`.

Done when: `npm run lint`, `npm test` and `next build` pass; the build generates 330
`/wiki/monsters/[slug]` pages; and these pages render correctly in `npm run dev`:

| Page | What it exercises |
|---|---|
| `/wiki/monsters/aboleth` | Lair XP, Legendary Actions, telepathy in Languages |
| `/wiki/monsters/adult-white-dragon` | Group links, Immunities, tagged type |
| `/wiki/monsters/werewolf` | "Medium or Small", Gear, Bonus Actions |
| `/wiki/monsters/allosaurus` | Animal category, no Traits section |
| `/wiki/monsters?category=Animal&type=Beast` | Category and creature type filters together |
| `/wiki?search=dragon` | Search badge and descriptor |

## Order of work

1. roll-to-quest: fix the three CR lines, add the splitter and tests (1.1).
2. roll-to-quest: script, template and cross-check (1.2, 1.3); run it and commit the JSON (1.4).
3. fabled-campaigns: types, lib helpers and tests (2.1, 2.2).
4. fabled-campaigns: stat block, browser, detail page, search, README (2.3 to 2.6).
5. fabled-campaigns: swap the data (2.7), build, and check the pages above.
