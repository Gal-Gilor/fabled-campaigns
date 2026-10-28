# Wiki Creatures: Group Pages, an Animals Section, and Lore

The 330 SRD 5.2.1 stat blocks in `data/monsters.json` had one page each under `/wiki/monsters`,
and none of them has a description or lore. Lore is written per `group`, so the structure changed
first:

1. Animals have their own section, `/wiki/animals`.
2. Each group has one page holding every member's stat block. The four White Dragons share
   `/wiki/monsters/white-dragons`.

Both are built (see Built). Lore is next (see Remaining).

`data/monsters.json` is unchanged. It is regenerated in roll-to-quest and never edited here (see
`monsters_data_plan.md`). The chosen frontend needs no new field: `category`, `group` and `slug`
cover it.

## What the data gives us

| Count | Value |
|---|---|
| Records | 330 (235 Monster, 95 Animal) |
| Groups | 272 (177 Monster, 95 Animal). No group mixes categories. |
| Groups with more than one member | 31, all Monster. Every Animal group has one member. |
| Group slugs (`slugify(group)`) | All unique, and none equals the slug of a record in another group |
| Old record URLs that redirect | 190: the 95 animals, 88 records in multi-member groups, and 7 single-member groups named differently from their record |

The 7 renamed single-member groups are Azer (Azer Sentinel), Centaur (Centaur Trooper), Crawling
Claw (Swarm of Crawling Claws), Gnoll (Gnoll Warrior), Kobold (Kobold Warrior), Merfolk (Merfolk
Skirmisher) and Sahuagin (Sahuagin Warrior). The Troll group keeps the `troll` URL and holds
Troll Limb too.

Members of one group do not always share fields. The dragons run from Medium to Gargantuan, the
Vampires group mixes Undead with a Humanoid familiar, and the Sphinxes have two alignments. Group
cards and filters match on any member.

## Decisions

Decisions 1 to 4 were picked from mockups of each option. 5 to 7 are still recommendations.

| # | Question | Decision |
|---|---|---|
| 1 | Browse cards | One card per group, with the CR range. Filters match any member. |
| 2 | Group page layout | Stacked stat blocks. Order: title, description, lore, a jump list of the stat blocks with their CR, the stat blocks, then sources. Lore comes before anything about the stat blocks. |
| 3 | Address of a single-member group | The group's address, for every group: `/wiki/monsters/azer`, with `azer-sentinel` redirecting there. |
| 4 | Group page titles | SRD group names as printed ("Troll", "Crawling Claw"). |
| 5 | Where lore lives (recommended) | Here, in `data/monster-lore.json`, keyed by `group`. Lore is original writing for this site, and this repo is "All Rights Reserved". roll-to-quest declares Apache 2.0, so lore written there would be free for anyone to reuse. |
| 6 | General lore or one campaign world (recommended) | General and setting-neutral. Each user brings their own world through the campaign lore field. D&D-original monsters get original setting-neutral lore. |
| 7 | Search results on `/wiki` | One result per stat block, linking to its group page and anchor. Built. |

## Built

- `app/lib/wikiPaths.ts`: `slugify`, `CATEGORY_PATHS`, `monsterHref` and
  `legacyMonsterRedirects`. It has no data import, so client components and `next.config.ts` use
  it too.
- `app/lib/wiki.ts`: `getMonsterGroups`, `getMonsterGroupBySlug`, `getMonsterGroupSummaries`,
  `describeMonsterGroup`, `formatCRRange` and `getMonsterHref`. `getMonstersInGroup` and
  `getMonsterSummaries` are gone.
- `app/components/wiki/monster-group-page.tsx` and `monster-browse-page.tsx`: shared by the
  `/wiki/monsters` and `/wiki/animals` routes, which are thin wrappers.
- `StatBlock` renders the name as an `h2`, since the group name is the page's `h1`.
- `WikiBrowser` filters accept `string | string[]` from `getValue`; an array matches when any
  value matches.
- `next.config.ts`: 308 redirects for the 190 old URLs, with the `#member` anchor kept.
- Wiki home: an Animals card. Sitemap: the 272 group pages. Link previews: CR, AC and HP for a
  single stat block; CR range and count for a group. README and the SRD attribution's second line
  updated.

Checked with `npm test`, `npx tsc --noEmit`, `npm run lint` (no new warnings), `npx next build`
(177 monster and 95 animal pages) and these pages under `next start`:

| Page | Result |
|---|---|
| `/wiki/monsters/adult-white-dragon` | 308 to `/wiki/monsters/white-dragons#adult-white-dragon`, lands on that section |
| `/wiki/monsters/azer-sentinel` | 308 to `/wiki/monsters/azer` |
| `/wiki/monsters/wolf` | 308 to `/wiki/animals/wolf` |
| `/wiki/monsters/troll`, `/wiki/monsters/aboleth` | 200, no redirect |
| `/wiki/animals/white-dragons` | 404 |
| `/wiki/monsters/white-dragons` | One `h1`, jump list Wyrmling (CR 2) to Ancient (CR 20), four sections |
| `/wiki/monsters` | 177 cards, no Category filter |
| `/wiki/monsters?name=wyrmling` | The ten dragon groups |
| `/wiki/monsters?cr=2` | Includes White Dragons and Awakened Plants |
| `/wiki/monsters?type=Humanoid` | Includes Vampires |
| `/wiki/animals?type=Celestial` | Giant Eagle, Giant Elk, Giant Owl |
| `/wiki?search=adult red` | Links to `/wiki/monsters/red-dragons?from=search&q=adult%20red#adult-red-dragon` |

`npx next build` needs `DATABASE_URL` and `DATABASE_URL_UNPOOLED` set, though any placeholder
value works for the wiki pages.

## Remaining

### Lore data and rendering

Waits on decisions 5 and 6.

`types/wiki.ts`:

```ts
export type LoreOrigin = 'animal' | 'myth' | 'original';

export type LoreSource = {
  title: string;
  url: string;
  publisher: string;
  // The source's own license, e.g. 'CC BY-SA 4.0' or 'Public domain'.
  // Sources are cited, never copied.
  license: string;
  accessed: string; // YYYY-MM-DD
};

export type MonsterLore = {
  // One or two sentences: appearance and behavior.
  description: string;
  // Markdown, a few short paragraphs.
  lore: string;
  origin: LoreOrigin;
  sources: LoreSource[];
};
```

- `data/monster-lore.json`: `Record<group, MonsterLore>`, filled in batches (see Lore content).
- `app/lib/wiki.ts`: `getLore(group): MonsterLore | undefined`.
- `MonsterGroupPage`: the description under the `h1`, then the lore through `MarkdownBody`, both
  above the jump list. After the stat blocks, a "Sources" list: the title linked to `url`, then
  publisher, license and access date. Below it, one line: "Description and lore are original to
  Fabled Campaigns. Listed sources were consulted for facts and are not quoted." A group without
  an entry renders as it does now.
- `describeMonsterGroup` returns the lore description when there is one, for metadata and JSON-LD.

Tests:

- Every lore key is an existing `group`. This fails when roll-to-quest renames a group.
- Every entry has a non-empty `description` and `lore`, and an `origin` from the list.
- Every source has an `https://` URL, a license and an `accessed` date in `YYYY-MM-DD` form.
- `animal` and `myth` entries have at least one source. `original` entries may have none.

No coverage test while entries ship in batches.

### Lore content

Separate PRs, each adding a batch of entries.

1. Worksheet. `docs/monster_lore_worksheet.md` lists the 272 groups with a proposed `origin`. The
   95 Animal groups are `animal`. The 5 non-Beast animals (Giant Eagle, Giant Elk, Giant Owl,
   Flying Snake, Giant Vulture) are giant versions of real species, so their facts come from the
   base animal. The 177 Monster groups are sorted by hand into `myth` (Medusa, Minotaur, Griffon,
   Kraken, Djinni, Werewolf, Vampires, Banshee and similar) and `original` (Aboleth, Otyugh, Rust
   Monster, Owlbear, Gelatinous Cube, Bulette and similar).
2. Source search. A script queries the Wikipedia and Wikidata APIs with each `animal` and `myth`
   group name and writes candidate links to the worksheet for review. It writes no lore.
3. Batches in order of available sources: animals, then myth, then original. A draft can be
   written by an agent from the reviewed links. Before an entry ships, a person checks the facts
   and that no sentence closely follows a single source.

Rules for every entry:

- Never copy or closely paraphrase the Monster Manual, D&D Beyond or any other Wizards text. For
  `original` groups, invent lore instead of summarizing theirs.
- Wikipedia and Fandom wikis (including the Forgotten Realms Wiki) are CC BY-SA. Cite them for
  facts and do not adapt their wording. Fandom pages often contain text copied from the books.
- Public-domain originals (Ovid, Hesiod and Pliny through Perseus, Wikisource or Project
  Gutenberg; translations published before about 1930) can be cited directly.
- For `original` groups, the SRD is cited for mechanics only, by the existing attribution. A
  documented real-world origin can be cited, such as the plastic toys behind the owlbear and the
  rust monster.

## Out of scope

Any roll-to-quest change, lore text in the browse cards, the `lookupSRD` stub in
`app/lib/tools.ts`, and magic items.
