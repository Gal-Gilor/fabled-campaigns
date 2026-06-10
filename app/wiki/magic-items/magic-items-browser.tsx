'use client';

import { WikiBrowser } from '@/app/components/wiki/wiki-browser';
import { MagicItemCard } from '@/app/components/wiki/magic-item-card';
import type { MagicItemSummary, FilterConfig } from '@/types/wiki';

type Props = {
  items: MagicItemSummary[];
  rarities: string[];
  types: string[];
};

export function MagicItemsBrowser({ items, rarities, types }: Props) {
  const filters: FilterConfig<MagicItemSummary>[] = [
    { key: 'name', label: 'Name', type: 'search', getValue: (item) => item.name },
    { key: 'type', label: 'Type', type: 'select', getValue: (item) => item.itemType, options: types },
    {
      key: 'rarity',
      label: 'Rarity',
      type: 'select',
      getValue: (item) => item.rarity,
      options: rarities,
      // 'Varies' catalog items (Ioun Stone, Spell Scroll, ...) show under any rarity.
      alwaysInclude: (item) => item.rarity === 'Varies',
    },
  ];

  return (
    <WikiBrowser
      items={items}
      filters={filters}
      renderCard={(item) => <MagicItemCard item={item} />}
    />
  );
}
