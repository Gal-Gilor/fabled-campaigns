// app/components/wiki/card-grid.tsx
import type { ReactNode } from 'react';

type Props<T extends { slug: string }> = {
  items: T[];
  renderCard: (item: T) => ReactNode;
};

// Shared by the client-side WikiBrowser and the server-rendered Suspense
// fallback on the listing pages, so the static HTML carries a link to every
// wiki entry instead of a loading placeholder.
export function CardGrid<T extends { slug: string }>({ items, renderCard }: Props<T>) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gridAutoRows: 'minmax(88px, auto)',
        gap: '1rem',
      }}
    >
      {items.map((item) => (
        <div key={item.slug} style={{ height: '100%' }}>
          {renderCard(item)}
        </div>
      ))}
    </div>
  );
}
