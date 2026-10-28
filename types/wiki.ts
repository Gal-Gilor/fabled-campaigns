// A magic item's single rarity. 'Varies' covers catalog entries with many
// sub-items of differing rarity (Ioun Stone, Spell Scroll, ...); items at a
// fixed bonus or variant are split into separate entries upstream, so each one
// carries a concrete tier.
export type MagicItemRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Very Rare'
  | 'Legendary'
  | 'Artifact'
  | 'Varies';

export type MagicItem = {
  slug: string;
  name: string;
  itemType: string;
  rarity: MagicItemRarity;
  requiresAttunement: boolean;
  attunementBy?: string;
  body: string;
};

// Browse/listing views render cards that never read `body` (the bulk of each
// record). Pass this lighter shape to the client to keep the payload small.
export type MagicItemSummary = Omit<MagicItem, 'body'>;

export type MonsterCategory = 'Monster' | 'Animal';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

// One SRD 5.2.1 stat block. The data contract is WikiMonster in roll-to-quest
// (src/wiki/models.py); text fields are copied as printed. Optional lines are
// null when absent, never missing.
export type Monster = {
  slug: string;
  name: string;
  category: MonsterCategory;
  // SRD heading shared by variants, e.g. 'White Dragons'.
  group: string;
  size: string;
  // As printed, e.g. 'Fiend (Demon)'.
  type: string;
  // Base type for filtering, e.g. 'Fiend'.
  creatureType: string;
  alignment: string;
  ac: number;
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

// One page per SRD group, e.g. the four White Dragons. `name` is the group
// heading as printed; `members` are sorted by CR.
export type MonsterGroup = {
  slug: string;
  name: string;
  category: MonsterCategory;
  members: Monster[];
};

// Browse/listing views only read the card and filter fields. Pass this lighter
// shape to the client to keep the payload small.
export type MonsterGroupSummary = {
  slug: string;
  name: string;
  category: MonsterCategory;
  // Shared by every member, else null.
  size: string | null;
  // The printed type when every member shares it, else the base types joined with ' or '.
  type: string;
  creatureTypes: string[];
  // Distinct member CRs, ascending.
  crs: string[];
  // '2' or '2–20'.
  crRange: string;
  memberNames: string[];
};

// Where a group's lore comes from, which decides whether it needs sources.
export type LoreOrigin = 'animal' | 'myth' | 'history' | 'original';

export type LoreSource = {
  title: string;
  // Author or translator, when the source names one.
  author?: string;
  publisher: string;
  url: string;
  // The source's own license, e.g. 'CC BY-SA 3.0' or 'Public domain'.
  // Sources are cited for facts, never quoted.
  license: string;
  // YYYY-MM-DD
  accessed: string;
};

// Written once per SRD group. A marker like [1] in the description or lore
// cites sources[0].
export type MonsterLore = {
  // One or two sentences: appearance and behavior.
  description: string;
  // Markdown, a few short paragraphs.
  lore: string;
  origin: LoreOrigin;
  sources: LoreSource[];
};

export type FilterConfig<T> =
  | {
      key: string;
      label: string;
      type: 'search';
      // An array matches when any of its values matches.
      getValue: (item: T) => string | string[];
    }
  | {
      key: string;
      label: string;
      type: 'select';
      getValue: (item: T) => string | string[];
      options: string[];
      // When provided, an item that satisfies this predicate matches the filter
      // regardless of the selected option (e.g. 'Varies' rarity items always show).
      alwaysInclude?: (item: T) => boolean;
    };
