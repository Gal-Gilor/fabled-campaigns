'use client';

import { WikiBrowser } from '@/app/components/wiki/wiki-browser';
import { MonsterCard } from '@/app/components/wiki/monster-card';
import type { MonsterGroupSummary, FilterConfig } from '@/types/wiki';

type Props = {
  groups: MonsterGroupSummary[];
  types: string[];
  crs: string[];
};

// Each card is a group, so filters match when any member matches.
export function MonstersBrowser({ groups, types, crs }: Props) {
  const filters: FilterConfig<MonsterGroupSummary>[] = [
    { key: 'name', label: 'Name', type: 'search', getValue: (g) => [g.name, ...g.memberNames] },
    { key: 'type', label: 'Type', type: 'select', getValue: (g) => g.creatureTypes, options: types },
    { key: 'cr', label: 'CR', type: 'select', getValue: (g) => g.crs, options: crs },
  ];

  return (
    <WikiBrowser
      items={groups}
      filters={filters}
      renderCard={(group) => <MonsterCard group={group} />}
    />
  );
}
