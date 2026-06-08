'use client';

import { WikiBrowser } from '@/app/components/wiki/wiki-browser';
import { MagicItemCard } from '@/app/components/wiki/magic-item-card';
import type { MagicItem, FilterConfig } from '@/types/wiki';

type Props = {
  items: MagicItem[];
  rarities: string[];
  types: string[];
};

export function MagicItemsBrowser({ items, rarities, types }: Props) {
  const filters: FilterConfig<MagicItem>[] = [
    { key: 'name', label: 'Name', type: 'search', getValue: (item) => item.name },
    { key: 'type', label: 'Type', type: 'select', getValue: (item) => item.itemType, options: types },
    { key: 'rarity', label: 'Rarity', type: 'select', getValue: (item) => item.rarity, options: rarities },
  ];

  return (
    <WikiBrowser
      items={items}
      filters={filters}
      renderCard={(item) => <MagicItemCard item={item} />}
    />
  );
}
