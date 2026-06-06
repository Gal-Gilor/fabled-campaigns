// app/components/wiki/wiki-browser.tsx
'use client';

import { type ReactNode, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FilterConfig } from '@/types/wiki';

type Props<T extends { slug: string }> = {
  items: T[];
  filters: FilterConfig<T>[];
  renderCard: (item: T) => ReactNode;
};

export function WikiBrowser<T extends { slug: string }>({
  items,
  filters,
  renderCard,
}: Props<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const filtered = useMemo(() => {
    return items.filter((item) =>
      filters.every((filter) => {
        const param = searchParams.get(filter.key) ?? '';
        if (!param) return true;
        const value = filter.getValue(item);
        if (filter.type === 'search') {
          return value.toLowerCase().includes(param.toLowerCase());
        }
        return value === param;
      })
    );
  }, [items, filters, searchParams]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {filters.map((filter) => {
          const value = searchParams.get(filter.key) ?? '';
          if (filter.type === 'search') {
            return (
              <input
                key={filter.key}
                placeholder={`Search by ${filter.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => updateParam(filter.key, e.target.value)}
                aria-label={`Search by ${filter.label.toLowerCase()}`}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--neutral-700)',
                  minWidth: '200px',
                }}
              />
            );
          }
          return (
            <select
              key={filter.key}
              value={value}
              onChange={(e) => updateParam(filter.key, e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--neutral-200)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--neutral-700)',
                background: '#fff',
              }}
            >
              <option value="">All {filter.pluralLabel ?? `${filter.label}s`}</option>
              {filter.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p
          style={{
            color: 'var(--neutral-600)',
            textAlign: 'center',
            padding: '3rem 0',
          }}
        >
          No results match your filters.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {filtered.map((item) => (
            <div key={item.slug}>{renderCard(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
