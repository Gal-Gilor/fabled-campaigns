# Wiki Creatures: Group Pages, an Animals Section, and Lore

The 330 SRD 5.2.1 stat blocks in `data/monsters.json` had one page each under `/wiki/monsters`,
and none of them has a description or lore. Lore is written per `group`, so the structure changed
first:

1. Animals have their own section, `/wiki/animals`.
2. Each group has one page holding every member's stat block. The four White Dragons share
   `/wiki/monsters/white-dragons`.

Both are built, and so is the lore display (see Built). Writing the entries is next (see Lore
content).

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

All confirmed. 1 to 4, 8 and 9 were picked from mockups of each option.

| # | Question | Decision |
|---|---|---|
| 1 | Browse cards | One card per group, with the CR range. Filters match any member. |
| 2 | Group page layout | Stacked stat blocks. Order: title, description, lore, a jump list of the stat blocks with their CR, the stat blocks, then sources. Lore comes before anything about the stat blocks. |
| 3 | Address of a single-member group | The group's address, for every group: `/wiki/monsters/azer`, with `azer-sentinel` redirecting there. |
| 4 | Group page titles | SRD group names as printed ("Troll", "Crawling Claw"). |
| 5 | Where lore lives | Here, in `data/monster-lore.json`, keyed by `group`. Lore is original writing for this site, and this repo is "All Rights Reserved". |
| 6 | General lore or one campaign world | General and setting-neutral. Each user brings their own world through the campaign lore field. |
| 7 | Search results on `/wiki` | One result per stat block, linking to its group page and anchor. |
| 8 | How sources are cited | Numbered markers like `[1]` in the description and lore, linking to a numbered Sources list after the stat blocks. |
| 9 | Descriptions on browse cards | No. Cards keep the name, type and CR range. |

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

### Lore display

- `types/wiki.ts`: `LoreOrigin` (`animal`, `myth`, `history`, `original`), `LoreSource` and
  `MonsterLore`.
- `data/monster-lore.json`: `Record<group, MonsterLore>`, empty until the first batch.
- `app/lib/wiki.ts`: `getAllLore` and `getLore`. `describeMonsterGroup` returns the description,
  with its markers removed, for metadata and JSON-LD.
- `app/components/wiki/monster-lore.tsx`: the description under the `h1`, a "Lore" section above
  the jump list, and after the stat blocks a numbered "Sources" list. Each source shows the
  author or translator when known, the linked title, publisher, license and access date. A line
  below says the text is original to Fabled Campaigns, and that listed sources were consulted for
  facts and are not quoted. A group without an entry renders as before.
- `app/lib/loreRules.ts`: `loreErrors`, run on every entry by a data test, with its own tests in
  `loreRules.test.ts`. Its rules are below.

## Lore content

`docs/monster_lore_worksheet.md` lists the 272 groups with their origin: 95 animal, 75 myth, 7
history and 95 original. Entries ship in batches, one PR each, in this order: animals, myth,
history, original. Mark each row done as its entry merges.

### Entry rules

The data test enforces the rules marked (test).

- One description per group: one or two sentences, at most 250 characters (test), on what the
  creature looks like and how it behaves. Lore is a few short paragraphs of Markdown.
- Every `[n]` marker has a source, and every source is cited at least once (test).
- `animal`, `myth` and `history` entries need at least one source (test). `original` entries need
  none and say they were written for this site.
- Each source has a title, publisher, license, an `https` URL and an `accessed` date in
  `YYYY-MM-DD` form (test). Add the author or translator when the source names one.
- No Wizards material. Nothing from the Monster Manual, D&D Beyond or any other Wizards product is
  copied, paraphrased or cited. The SRD is credited only by the footer attribution, for the stat
  blocks. `original` lore is invented, not a summary of Wizards' version.
- Blocked sites (test): wikipedia.org (not used for research either), wizards.com,
  dndbeyond.com, and forgottenrealms.fandom.com. Other D&D wikis on Fandom retell Wizards' books
  too; add them to `BLOCKED_SOURCE_HOSTS` when found.
- Other Fandom wikis, such as mythology wikis, can be cited for facts. Their text is CC BY-SA, so
  it is cited and linked but never copied.
- Animals: zoos, wildlife agencies, universities and natural history museums. Fantasy versions
  ("Giant Wasp") take their facts from the real animal.
- Myth: the original text in a named public-domain translation (Perseus, Project Gutenberg, the
  Internet Archive), then other reliable sites.
- Text is in our own words. Before an entry ships, a person checks each fact against its source,
  that each link opens the cited page, and that no sentence closely follows a source's wording.

### Network access

This cloud environment blocks the source sites. Before research can start, the environment's
Network access settings need these domains allowed (or a broader access level): nationalzoo.si.edu,
www.nps.gov, www.fws.gov, www.fisheries.noaa.gov, animaldiversity.org, www.nhm.ac.uk,
www.amnh.org, naturalhistory.si.edu, www.perseus.tufts.edu, www.gutenberg.org, archive.org and
fandom.com.

## Out of scope

Any roll-to-quest change, lore text in the browse cards, the `lookupSRD` stub in
`app/lib/tools.ts`, and magic items.
