// app/wiki/page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllMonsters, getAllMagicItems } from '@/app/lib/wiki';
import type { Monster, MagicItem } from '@/types/wiki';

export const metadata: Metadata = {
  title: 'Wiki | Fabled Campaigns',
  description:
    'Browse D&D 5e SRD monsters and magic items as reference cards. No account required.',
  alternates: { canonical: '/wiki' },
};

type SearchResult =
  | { kind: 'monster'; item: Monster }
  | { kind: 'magic-item'; item: MagicItem };

export default async function WikiPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const query = search?.trim() ?? '';
  const q = query.toLowerCase();

  const results: SearchResult[] = q
    ? [
        ...getAllMonsters()
          .filter((m) => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q))
          .map((item) => ({ kind: 'monster' as const, item })),
        ...getAllMagicItems()
          .filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.itemType.toLowerCase().includes(q) ||
              i.rarity.toLowerCase().includes(q)
          )
          .map((item) => ({ kind: 'magic-item' as const, item })),
      ].sort((a, b) => {
        const aStarts = a.item.name.toLowerCase().startsWith(q);
        const bStarts = b.item.name.toLowerCase().startsWith(q);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.item.name.localeCompare(b.item.name);
      })
    : [];

  return (
    <main style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: 'var(--neutral-900)',
          marginBottom: '0.5rem',
        }}
      >
        Wiki
      </h1>
      <p style={{ color: 'var(--neutral-600)', marginBottom: '2rem' }}>
        Magic items and monsters from the D&D 5e System Reference Document..
      </p>

      <form method="get" action="/wiki" style={{ marginBottom: '1.5rem' }}>
        <input
          name="search"
          defaultValue={query}
          placeholder="Search monsters and magic items..."
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            border: '1px solid var(--neutral-200)',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            color: 'var(--neutral-700)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </form>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <Link href="/wiki/monsters" className="block h-full" style={{ textDecoration: 'none' }}>
          <div
            className="border border-neutral-200 hover:border-primary hover:shadow-md rounded-lg p-5 bg-white h-full box-border transition-all duration-150 cursor-pointer"
            style={{ textAlign: 'center' }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'var(--neutral-900)',
                margin: 0,
                fontSize: '1.125rem',
              }}
            >
              Monsters
            </h2>
          </div>
        </Link>

        <Link href="/wiki/magic-items" className="block h-full" style={{ textDecoration: 'none' }}>
          <div
            className="border border-neutral-200 hover:border-primary hover:shadow-md rounded-lg p-5 bg-white h-full box-border transition-all duration-150 cursor-pointer"
            style={{ textAlign: 'center' }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'var(--neutral-900)',
                margin: 0,
                fontSize: '1.125rem',
              }}
            >
              Magic Items
            </h2>
          </div>
        </Link>
      </div>

      {query && (
        <div style={{ marginTop: '1.5rem' }}>
          {results.length === 0 ? (
            <p style={{ color: 'var(--neutral-600)', fontSize: '0.9375rem' }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              {results.map((r) => {
                const href =
                  r.kind === 'monster'
                    ? `/wiki/monsters/${r.item.slug}?from=search&q=${encodeURIComponent(query)}`
                    : `/wiki/magic-items/${r.item.slug}?from=search&q=${encodeURIComponent(query)}`;
                const badge = r.kind === 'monster' ? 'Monster' : 'Magic Item';
                const descriptor =
                  r.kind === 'monster'
                    ? `${r.item.type} · CR ${r.item.cr}`
                    : `${r.item.rarity} · ${r.item.itemType}`;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-baseline gap-3 px-3 py-2 rounded-lg hover:bg-primary-pale transition-colors duration-150"
                      style={{ textDecoration: 'none' }}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--neutral-900)' }}>
                        {r.item.name}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
                        {badge} · {descriptor}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
