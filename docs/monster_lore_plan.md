# Wiki Creatures: Group Pages, an Animals Section, and Lore

The 330 SRD 5.2.1 stat blocks in `data/monsters.json` each have their own page under
`/wiki/monsters`, and none of them has a description or lore. This plan adds both. Lore is written
per `group`, so two changes come first:

1. Animals move to their own section, `/wiki/animals`. Today they share `/wiki/monsters` and are
   told apart only by the Category filter.
2. Each group gets one page holding its lore once and every member's stat block. The four White
   Dragons, for example, share one story and move to one page.

`data/monsters.json` stays as it is. It is regenerated in roll-to-quest and never edited here
(see `monsters_data_plan.md`). No roll-to-quest change is needed: every field used below
(`category`, `group`, `slug`) is already in the `WikiMonster` contract.

## What the data gives us

| Count | Value |
|---|---|
| Records | 330 (235 Monster, 95 Animal) |
| Groups | 272 (177 Monster, 95 Animal). No group mixes categories. |
| Groups with more than one member | 31, all Monster. Every Animal group has one member. |
| Group slugs (`slugify(group)`) | All unique, and none equals the slug of a record in another group |
| Record URLs that change | 190: the 95 animals change section, 88 records in multi-member groups fold into a group page, and 7 single-member groups are named differently from their record |

The 7 renamed single-member groups are Azer (Azer Sentinel), Centaur (Centaur Trooper), Crawling
Claw (Swarm of Crawling Claws), Gnoll (Gnoll Warrior), Kobold (Kobold Warrior), Merfolk (Merfolk
Skirmisher) and Sahuagin (Sahuagin Warrior). The Troll group keeps the `troll` URL and gains
Troll Limb.

Members of one group do not always share fields. The dragons run from Medium to Gargantuan, the
Vampires group mixes Undead with a Humanoid familiar, and the Sphinxes have two alignments. Group
cards and filters have to match on any member, not on the first.

## Decisions

Each step below assumes the recommendation. Confirm or change these before work starts.

| # | Question | Recommendation |
|---|---|---|
| 1 | Page per group, or keep per-record pages and repeat the lore on each | Page per group, for all 272 groups. The URL is `slugify(group)`, so `/wiki/monsters/white-dragons`. Single-member groups use the group slug too, which renames 7 URLs but keeps one rule. |
| 2 | What happens to the old URLs | Permanent (308) redirects, generated from the data in `next.config.ts`. A record in a multi-member group redirects to its section anchor: `/wiki/monsters/adult-white-dragon` goes to `/wiki/monsters/white-dragons#adult-white-dragon`. |
| 3 | How animals are separated | A third wiki section, `/wiki/animals`, with its own browse and detail pages. The monsters browser drops the Category filter. Both sections read the same `data/monsters.json`, split by `category`. The 5 non-Beast animals (Giant Eagle, Giant Elk, Giant Owl, Flying Snake, Giant Vulture) follow the SRD chapter and stay animals. |
| 4 | Order on a group page | Title, description, a jump list of the variants with their CR, lore, one section per stat block, then sources. Lore goes above the stat blocks so it is not buried under four dragon stat blocks. |
| 5 | Where lore lives | Here, in `data/monster-lore.json`, keyed by `group`. Lore is original writing for this site, and this repo is "All Rights Reserved". roll-to-quest declares Apache 2.0, so lore written there would be free for anyone to reuse. A data test catches a group renamed upstream. |
| 6 | General lore or one campaign world | General and setting-neutral. Each user brings their own world through the campaign lore field, so the wiki should not pick one. D&D-original monsters get original setting-neutral lore that a GM can adapt. |
| 7 | Search results on `/wiki` | Stay one result per record, so "adult red" still finds the Adult Red Dragon. Each result links to its group page and anchor. |

## Steps

One PR for steps 1 to 6, one commit per step. Every step leaves the app building. Lore content
ships in later PRs (see Lore content).

### 1. Group helpers and tests

`types/wiki.ts`:

- `MonsterGroup = { slug: string; name: string; category: MonsterCategory; members: Monster[] }`,
  with `members` sorted as `getMonstersInGroup` sorts them.
- `MonsterGroupSummary = { slug; name; category; type: string; creatureTypes: string[];
  crs: string[]; memberNames: string[] }`. `type` is the printed type when all members share it,
  otherwise the sorted `creatureTypes` joined with " or ". `crs` is ascending.

`app/lib/wiki.ts`:

- `slugify(name)`, matching roll-to-quest `src/wiki/models.py`.
- `CATEGORY_PATHS: Record<MonsterCategory, string> = { Monster: 'monsters', Animal: 'animals' }`.
- `getMonsterGroups(category): MonsterGroup[]`, sorted by name.
- `getMonsterGroupBySlug(category, slug): MonsterGroup | undefined`.
- `getMonsterGroupSummaries(category): MonsterGroupSummary[]`.
- `monsterHref(m: Pick<Monster, 'slug' | 'group' | 'category'>): string` returns
  `/wiki/animals/wolf` or `/wiki/monsters/white-dragons#adult-white-dragon`. The anchor is added
  only when the group has more than one member.
- `formatCRRange(crs)` returns `2` or `2–24`.

`app/lib/wiki.test.ts`:

- `getMonsterGroupBySlug('Monster', 'white-dragons')` has the four members in CR order.
- `getMonsterGroupBySlug('Monster', 'wolf')` and `getMonsterGroupBySlug('Animal', 'white-dragons')`
  are undefined.
- `monsterHref` for Wolf, Adult White Dragon, Azer Sentinel (`/wiki/monsters/azer`, no anchor)
  and Troll Limb (`/wiki/monsters/troll#troll-limb`).
- Group slugs are unique across both categories, and no group mixes categories.
- The Vampires summary has `creatureTypes` `['Humanoid', 'Undead']`.
- `formatCRRange(['1/4'])` and `formatCRRange(['2', '24'])`.

Done when: `npm test` passes.

### 2. Group detail pages and redirects

- New `app/components/wiki/monster-group-page.tsx`: a server component that takes a
  `MonsterGroup` and the back link, and renders the layout from decision 4 without lore for now.
  The breadcrumb reads Wiki / Monsters (or Animals) / group name. The H1 is the group name.
  Multi-member groups get the jump list, linking `#slug` with each member's CR. Each member is a
  `<section id={m.slug}>` holding `<StatBlock>` and `<MarkdownBody>`. The "relatives" list goes
  away, since the members are on the page.
- `stat-block.tsx`: add `headingLevel: 1 | 2`, default 1. Group pages pass 2, so the page keeps a
  single H1.
- `markdown-body.tsx`: add `headingOffset` so a stat block body's `## Traits` renders as an `h3`
  with the current `h2` styles when it sits under a member heading.
- `app/wiki/monsters/[slug]/page.tsx`: `generateStaticParams` lists Monster group slugs. The page
  loads the group with `getMonsterGroupBySlug('Monster', slug)` and renders `MonsterGroupPage`.
  Metadata title is the group name. The description is the shared size and type with the CR range
  until step 5 adds lore descriptions.
- `app/wiki/monsters/[slug]/opengraph-image.tsx`: same params. Single-member groups keep the
  current CR, AC and HP badges. Multi-member groups show the CR range and the number of stat
  blocks.
- New `app/lib/wikiRedirects.ts`: `legacyMonsterRedirects()` maps every record whose
  `monsterHref` differs from `/wiki/monsters/{slug}` to `{ source, destination, permanent: true }`.
  It imports the JSON with a relative path, because `next.config.ts` may not resolve the `@/`
  alias. Add it to the `redirects()` array next to the www rule. Test it: 95 Monster entries
  after this step, and none whose source equals its destination.
- `app/wiki/page.tsx` and `app/sitemap.ts`: link and list with `monsterHref` and the group slugs.
  Search keeps the `?from=search&q=` parameters before the anchor.

The animals still render under `/wiki/monsters` at this point, as one-member groups.

Done when: lint and `npx next build` pass, `/wiki/monsters/white-dragons` shows four stat blocks,
and `curl -sI localhost:3000/wiki/monsters/adult-white-dragon` returns 308 with
`Location: /wiki/monsters/white-dragons#adult-white-dragon`. If Next drops the fragment, redirect
to the page without it and note it here.

### 3. Group cards and filters

- `types/wiki.ts`: `FilterConfig.getValue` returns `string | string[]`.
- `wiki-browser.tsx`: compare against `[filter.getValue(item)].flat()`. A search filter matches
  when any value contains the text; a select filter matches when any value equals the option.
  The magic items browser is unaffected, since it returns strings.
- `monsters-browser.tsx`: takes `MonsterGroupSummary[]`. Name searches `[name, ...memberNames]`,
  so "wyrmling" finds all ten dragon groups. Type matches `creatureTypes`. CR matches `crs`, so
  CR 2 lists White Dragons for its wyrmling.
- `monster-card.tsx`: takes a `MonsterGroupSummary`. It shows the group name, `type`, the CR
  range badge, and "4 stat blocks" for multi-member groups.
- `app/wiki/monsters/page.tsx`: pass `getMonsterGroupSummaries('Monster')`. The CR options still
  come from every record.

Done when: `/wiki/monsters` shows 272 cards (177 after step 4), and the filter checks in
Verification pass.

### 4. Animals section

- `app/wiki/animals/page.tsx`, `app/wiki/animals/[slug]/page.tsx` and its `opengraph-image.tsx`:
  thin copies of the monsters routes with `'Animal'`, reusing `MonstersBrowser`, `MonsterCard`
  and `MonsterGroupPage`. Title "Animals". Metadata: "Browse 5e SRD animals by creature type and
  challenge rating."
- `/wiki/monsters`: list Monster groups only, drop the Category filter, and update the
  description to "by creature type and challenge rating".
- `app/wiki/page.tsx`: add an Animals card between Monsters and Magic Items, and change the
  subtitle and placeholder to name animals.
- `app/sitemap.ts`: add `/wiki/animals` and its group pages.
- `legacyMonsterRedirects()` now also yields the 95 animal URLs. Update its test to 190.

Done when: `/wiki/monsters/wolf` returns 308 to `/wiki/animals/wolf`, `/wiki/animals/wolf`
renders with the Animals breadcrumb, and `/wiki/animals/white-dragons` is a 404.

### 5. Lore data and rendering

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

- `data/monster-lore.json`: `Record<group, MonsterLore>`. Seed it with one entry per origin, to
  check the rendering: Wolf (animal), Medusa (myth) and White Dragons (original). The rest ships
  in later PRs.
- `app/lib/wiki.ts`: `getLore(group): MonsterLore | undefined`.
- `MonsterGroupPage`: render the description under the H1 and the lore through `MarkdownBody`.
  Add a "Sources" list after the stat blocks: the title linked to `url`, then publisher, license
  and access date. Below it, one line: "Description and lore are original to Fabled Campaigns.
  Listed sources were consulted for facts and are not quoted." A group without an entry renders
  as it did after step 4.
- Page metadata and JSON-LD use the lore description when there is one.
- `srd-attribution.tsx`: keep the first paragraph verbatim. The second becomes "Entries are
  reformatted for this site. Some magic items are split into one page per variant, and creature
  variants are combined on one page."

Tests in `app/lib/wiki.test.ts`:

- Every lore key is an existing `group`. This fails when roll-to-quest renames a group.
- Every entry has a non-empty `description` and `lore`, and an `origin` from the list.
- Every source has an `https://` URL, a license and an `accessed` date in `YYYY-MM-DD` form.
- `animal` and `myth` entries have at least one source. `original` entries may have none.

There is no coverage test while the entries ship in batches. `npm run lore:status` (a short
script) prints how many groups have lore, by category.

Done when: `npm test` passes, and the three seeded pages render description, lore and sources.

### 6. README

`README.md` lines 83 to 87: list three sections. `/wiki/monsters` has 177 creature pages (235 stat
blocks), `/wiki/animals` has 95, and both filter by name, creature type and challenge rating.
State that variants share one page and that old per-record URLs redirect.

## Verification

Run after step 6:

- `npm run lint` and `npm test` pass.
- `npx next build` passes and reports 177 `/wiki/monsters/[slug]` and 95 `/wiki/animals/[slug]`
  pages. Don't use `npm run build`, which runs `db/migrate.ts` and needs `DATABASE_URL_UNPOOLED`.
- In `npm run dev`:

| Page | Check |
|---|---|
| `/wiki/monsters/white-dragons` | One H1, jump list Wyrmling (CR 2) to Ancient (CR 20), four stat blocks, lore and sources |
| `/wiki/monsters/adult-white-dragon` | 308 to `/wiki/monsters/white-dragons#adult-white-dragon`, lands on the Adult section |
| `/wiki/monsters/azer-sentinel` | 308 to `/wiki/monsters/azer` |
| `/wiki/monsters/troll` | Troll and Troll Limb, no redirect |
| `/wiki/monsters/aboleth` | One stat block, no jump list, no lore section |
| `/wiki/monsters/wolf` | 308 to `/wiki/animals/wolf` |
| `/wiki/animals?type=Celestial` | Exactly Giant Eagle, Giant Elk, Giant Owl |
| `/wiki/monsters?name=wyrmling` | The ten dragon groups |
| `/wiki/monsters?cr=2` | Includes White Dragons and Awakened Plants |
| `/wiki/monsters?type=Humanoid` | Includes Vampires |
| `/wiki?search=adult red` | Adult Red Dragon, linking to `/wiki/monsters/red-dragons?from=search&q=adult%20red#adult-red-dragon` |
| `/sitemap.xml` | Group URLs only, no old record URLs |

## Lore content

Separate PRs after the structure ships, each adding a batch of entries to
`data/monster-lore.json`.

1. Worksheet. `docs/monster_lore_worksheet.md` lists the 272 groups with a proposed `origin`. The
   95 Animal groups are `animal`. The 5 non-Beast animals are giant versions of real species, so
   their facts come from the base animal. The 177 Monster groups are sorted by hand into `myth`
   (Medusa, Minotaur, Griffon, Kraken, Djinni, Werewolf, Vampires, Banshee and similar) and
   `original` (Aboleth, Otyugh, Rust Monster, Owlbear, Gelatinous Cube, Bulette and similar).
2. Source search. A script in `scripts/` queries the Wikipedia and Wikidata APIs with each
   `animal` and `myth` group name and writes candidate links to the worksheet for review. It
   writes no lore.
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
