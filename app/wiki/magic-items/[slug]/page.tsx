// app/wiki/magic-items/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllMagicItems, getMagicItemBySlug } from '@/app/lib/wiki';
import { MarkdownBody } from '@/app/components/wiki/markdown-body';

type Props = { params: Promise<{ slug: string }> };

const BASE_URL = 'https://fabled-campaigns.vercel.app';

export function generateStaticParams() {
  return getAllMagicItems().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getMagicItemBySlug(slug);
  if (!item) return {};

  const attunement = item.requiresAttunement
    ? item.attunementBy
      ? `, requires attunement by ${item.attunementBy}`
      : ', requires attunement'
    : '';

  return {
    title: `${item.name} | Fabled Campaigns Wiki`,
    description: `${item.rarity} ${item.itemType}${attunement}.`,
    alternates: { canonical: `/wiki/magic-items/${item.slug}` },
  };
}

export default async function MagicItemPage({ params }: Props) {
  const { slug } = await params;
  const item = getMagicItemBySlug(slug);
  if (!item) notFound();

  const attunementText = item.requiresAttunement
    ? item.attunementBy
      ? ` (Requires Attunement by ${item.attunementBy})`
      : ' (Requires Attunement)'
    : '';

  const attunement = item.requiresAttunement
    ? item.attunementBy
      ? `, requires attunement by ${item.attunementBy}`
      : ', requires attunement'
    : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    name: item.name,
    description: `${item.rarity} ${item.itemType}${attunement}.`,
    url: `${BASE_URL}/wiki/magic-items/${item.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <nav
          style={{
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--neutral-600)',
          }}
        >
          <Link href="/wiki" style={{ color: 'var(--primary-blue)' }}>
            Wiki
          </Link>
          {' / '}
          <Link href="/wiki/magic-items" style={{ color: 'var(--primary-blue)' }}>
            Magic Items
          </Link>
          {' / '}
          {item.name}
        </nav>

        <h1
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: 'var(--neutral-900)',
            marginBottom: '0.25rem',
          }}
        >
          {item.name}
        </h1>
        <p
          style={{
            fontStyle: 'italic',
            color: 'var(--neutral-600)',
            marginBottom: '1.5rem',
            fontSize: '0.9375rem',
          }}
        >
          {item.itemType}, {item.rarity}
          {attunementText}
        </p>

        <MarkdownBody content={item.body} />
      </main>
    </>
  );
}
