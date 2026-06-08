'use client';

import { WikiBrowser } from '@/app/components/wiki/wiki-browser';
import { MonsterCard } from '@/app/components/wiki/monster-card';
import type { Monster, FilterConfig } from '@/types/wiki';

type Props = {
  monsters: Monster[];
  types: string[];
  crs: string[];
};

export function MonstersBrowser({ monsters, types, crs }: Props) {
  const filters: FilterConfig<Monster>[] = [
    { key: 'name', label: 'Name', type: 'search', getValue: (m) => m.name },
    { key: 'type', label: 'Type', type: 'select', getValue: (m) => m.type, options: types },
    { key: 'cr', label: 'CR', type: 'select', getValue: (m) => m.cr, options: crs },
  ];

  return (
    <WikiBrowser
      items={monsters}
      filters={filters}
      renderCard={(monster) => <MonsterCard monster={monster} />}
    />
  );
}
