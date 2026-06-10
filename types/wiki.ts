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

export type Monster = {
  slug: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  ac: string;
  hp: string;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  cr: string;
  body: string;
};

// Browse/listing views render cards that never read `body` (the stat block).
// Pass this lighter shape to the client to keep the payload small.
export type MonsterSummary = Omit<Monster, 'body'>;

export type FilterConfig<T> =
  | {
      key: string;
      label: string;
      type: 'search';
      getValue: (item: T) => string;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      getValue: (item: T) => string;
      options: string[];
      // When provided, an item that satisfies this predicate matches the filter
      // regardless of the selected option (e.g. 'Varies' rarity items always show).
      alwaysInclude?: (item: T) => boolean;
    };
