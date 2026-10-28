// app/components/wiki/monster-lore.tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { components } from './markdown-body';
import type { MonsterLore } from '@/types/wiki';

// '[2]' becomes a link to the second entry in the Sources list.
function linkCitations(text: string): string {
  return text.replace(/\[(\d+)\]/g, '[[$1]](#source-$1)');
}

const loreComponents: Components = {
  ...components,
  a: ({ href, children }) =>
    href?.startsWith('#source-') ? (
      <sup>
        <a href={href} style={{ color: 'var(--primary-blue)', textDecoration: 'none' }}>
          {children}
        </a>
      </sup>
    ) : (
      <a href={href} style={{ color: 'var(--primary-blue)' }}>
        {children}
      </a>
    ),
};

const descriptionComponents: Components = {
  ...loreComponents,
  p: ({ children }) => (
    <p
      style={{
        color: 'var(--neutral-700)',
        fontSize: '1.0625rem',
        lineHeight: '1.6',
        marginBottom: '1.25rem',
      }}
    >
      {children}
    </p>
  ),
};

const headingStyle = {
  fontFamily: 'var(--font-cinzel), serif',
  color: 'var(--neutral-900)',
  fontSize: '1.125rem',
  fontWeight: 600,
  marginTop: '1.5rem',
  marginBottom: '0.5rem',
};

export function LoreDescription({ lore }: { lore: MonsterLore }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={descriptionComponents}>
      {linkCitations(lore.description)}
    </ReactMarkdown>
  );
}

export function LoreBody({ lore }: { lore: MonsterLore }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h2 style={headingStyle}>Lore</h2>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={loreComponents}>
        {linkCitations(lore.lore)}
      </ReactMarkdown>
    </section>
  );
}

function formatAccessed(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// The numbered list the citation markers point at.
export function LoreSources({ lore }: { lore: MonsterLore }) {
  if (lore.sources.length === 0) return null;

  return (
    <section style={{ marginTop: '1rem' }}>
      <h2 style={headingStyle}>Sources</h2>
      <ol
        style={{
          listStyle: 'decimal',
          paddingLeft: '1.5rem',
          marginBottom: '0.75rem',
          color: 'var(--neutral-700)',
        }}
      >
        {lore.sources.map((source, i) => (
          <li
            key={`${i}-${source.url}`}
            id={`source-${i + 1}`}
            style={{ marginBottom: '0.375rem', scrollMarginTop: '1rem', fontSize: '0.9375rem' }}
          >
            {source.author && `${source.author}, `}
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary-blue)' }}
            >
              {source.title}
            </a>
            {/[.?!]$/.test(source.title) ? ' ' : '. '}
            {source.publisher}. {source.license}. Accessed {formatAccessed(source.accessed)}.
          </li>
        ))}
      </ol>
    </section>
  );
}
