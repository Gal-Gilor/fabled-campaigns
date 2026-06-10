'use client';

import { WikiBrowser } from '@/app/components/wiki/wiki-browser';
import { MonsterCard } from '@/app/components/wiki/monster-card';
import type { MonsterSummary, FilterConfig } from '@/types/wiki';

type Props = {
  monsters: MonsterSummary[];
  types: string[];
  crs: string[];
};

export function MonstersBrowser({ monsters, types, crs }: Props) {
  const filters: FilterConfig<MonsterSummary>[] = [
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
