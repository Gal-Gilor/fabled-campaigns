// app/wiki/monsters/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllMonsters, getMonsterBySlug } from '@/app/lib/wiki';
import { StatBlock } from '@/app/components/wiki/stat-block';
import { MarkdownBody } from '@/app/components/wiki/markdown-body';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; q?: string }> };

const BASE_URL = 'https://fabledcampaigns.com';

export function generateStaticParams() {
  return getAllMonsters().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const monster = getMonsterBySlug(slug);
  if (!monster) return {};

  return {
    title: `${monster.name} | Fabled Campaigns Wiki`,
    description: `${monster.size} ${monster.type}, CR ${monster.cr}. ${monster.alignment}.`,
    alternates: { canonical: `/wiki/monsters/${monster.slug}` },
  };
}

export default async function MonsterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, q } = await searchParams;
  const backHref =
    from === 'search' ? `/wiki${q ? `?search=${encodeURIComponent(q)}` : ''}` : '/wiki/monsters';
  const monster = getMonsterBySlug(slug);
  if (!monster) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: monster.name,
    description: `${monster.size} ${monster.type}, CR ${monster.cr}. ${monster.alignment}.`,
    url: `${BASE_URL}/wiki/monsters/${monster.slug}`,
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
          <Link href="/wiki/monsters" style={{ color: 'var(--primary-blue)' }}>
            Monsters
          </Link>
          {' / '}
          {monster.name}
        </nav>

        <StatBlock monster={monster} />
        <MarkdownBody content={monster.body} />
        <nav style={{ borderTop: '1px solid var(--neutral-200)', marginTop: '2rem', paddingTop: '1.5rem' }}>
          <Link
            href={backHref}
            className="inline-block border border-neutral-200 hover:border-primary hover:shadow-md bg-white transition-all duration-150"
            style={{
              padding: '0.625rem 2rem',
              borderRadius: '0.5rem',
              color: 'var(--neutral-700)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Back
          </Link>
        </nav>
      </main>
    </>
  );
}
