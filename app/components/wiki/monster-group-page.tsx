// app/components/wiki/monster-group-page.tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { describeMonsterGroup, getLore } from '@/app/lib/wiki';
import { CATEGORY_PATHS } from '@/app/lib/wikiPaths';
import { pageMetadata } from '@/app/lib/pageMetadata';
import { StatBlock } from './stat-block';
import { MarkdownBody } from './markdown-body';
import { LoreBody, LoreDescription, LoreSources } from './monster-lore';
import type { MonsterCategory, MonsterGroup } from '@/types/wiki';

const BASE_URL = 'https://www.fabledcampaigns.com';

export const CATEGORY_LABELS: Record<MonsterCategory, string> = {
  Monster: 'Monsters',
  Animal: 'Animals',
};

function groupPath(group: MonsterGroup): string {
  return `/wiki/${CATEGORY_PATHS[group.category]}/${group.slug}`;
}

export function monsterGroupMetadata(group: MonsterGroup): Metadata {
  return pageMetadata(
    `${group.name} | Fabled Campaigns Wiki`,
    describeMonsterGroup(group),
    groupPath(group)
  );
}

type Props = { group: MonsterGroup; from?: string; q?: string };

// One page per SRD group: the group name, its description and lore when
// written, a link to each stat block when there are several, the stat blocks
// in CR order, then the lore's sources.
export function MonsterGroupPage({ group, from, q }: Props) {
  const listHref = `/wiki/${CATEGORY_PATHS[group.category]}`;
  const backHref =
    from === 'search' ? `/wiki${q ? `?search=${encodeURIComponent(q)}` : ''}` : listHref;
  const hasVariants = group.members.length > 1;
  const lore = getLore(group.name);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: group.name,
    description: describeMonsterGroup(group),
    url: `${BASE_URL}${groupPath(group)}`,
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
          <Link href={listHref} style={{ color: 'var(--primary-blue)' }}>
            {CATEGORY_LABELS[group.category]}
          </Link>
          {' / '}
          {group.name}
        </nav>

        <h1
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: 'var(--neutral-900)',
            fontSize: 'clamp(1.5rem, 5vw, 2rem)',
            marginBottom: '1rem',
          }}
        >
          {group.name}
        </h1>

        {lore && <LoreDescription lore={lore} />}
        {lore && <LoreBody lore={lore} />}

        {hasVariants && (
          <nav aria-label="Stat blocks on this page" style={{ marginBottom: '1.5rem' }}>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              {group.members.map((m) => (
                <li key={m.slug}>
                  <a
                    href={`#${m.slug}`}
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: '999px',
                      background: '#fff',
                      color: 'var(--primary-blue)',
                      fontSize: '0.8125rem',
                      textDecoration: 'none',
                    }}
                  >
                    {m.name} · CR {m.cr}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {group.members.map((m) => (
          <section key={m.slug} id={m.slug} style={{ scrollMarginTop: '1rem', marginBottom: '2rem' }}>
            <StatBlock monster={m} />
            <MarkdownBody content={m.body} />
          </section>
        ))}

        {lore && <LoreSources lore={lore} />}

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
