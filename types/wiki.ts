// Known single-tier rarities used for badge colors and filter ordering. The
// `rarity` field below is a free string, because the SRD also has bonus-scaling
// items ("Uncommon (+1), Rare (+2), or Very Rare (+3)") and "Rarity Varies" items.
export type MagicItemRarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Very Rare'
  | 'Legendary'
  | 'Artifact';

export type MagicItem = {
  slug: string;
  name: string;
  itemType: string;
  rarity: string;
  requiresAttunement: boolean;
  attunementBy?: string;
  body: string;
};

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
    };
