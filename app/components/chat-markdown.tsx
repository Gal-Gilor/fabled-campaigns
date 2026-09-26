'use client';

import { createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { components } from './wiki/markdown-body';

// A fenced code block's <code> and inline code both go through the same
// `code` override with no prop that tells them apart, so `pre` marks its
// subtree via context and `code` reads it to skip the inline-code styling
// when it's inside a code block (the block already gets its look from `pre`).
// useContext makes this a client-only module — the wiki's Markdown render
// (app/components/wiki/markdown-body.tsx) stays hook-free so Server Component
// wiki pages can import it directly.
const InPreContext = createContext(false);

const chatHeading = (fontSize: string) => ({
  fontFamily: 'var(--font-cinzel), serif',
  color: 'var(--neutral-900)',
  fontSize,
  fontWeight: 600,
  marginTop: '0.875rem',
  marginBottom: '0.375rem',
});

// Chat replies sit in a compact bubble: tighter spacing, smaller headings, and
// the elements a model reply uses that wiki pages don't (links, code).
const chatComponents: Components = {
  ...components,
  h1: ({ children }) => <h3 style={chatHeading('1.0625rem')}>{children}</h3>,
  h2: ({ children }) => <h3 style={chatHeading('1rem')}>{children}</h3>,
  h3: ({ children }) => <h4 style={chatHeading('0.9375rem')}>{children}</h4>,
  h4: ({ children }) => <h5 style={chatHeading('0.9375rem')}>{children}</h5>,
  p: ({ children }) => (
    <p style={{ color: 'var(--neutral-700)', marginBottom: '0.5rem', lineHeight: '1.65' }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ listStyle: 'decimal', paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>{children}</ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: '0.125rem' }}>{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--primary-blue)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
    >
      {children}
    </a>
  ),
  code: ({ children }) => {
    const inPre = useContext(InPreContext);
    if (inPre) return <code>{children}</code>;
    return (
      <code
        style={{
          background: 'var(--neutral-100)',
          borderRadius: '0.25rem',
          padding: '0.0625rem 0.3125rem',
          fontSize: '0.875em',
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      style={{
        background: 'var(--neutral-100)',
        border: '1px solid var(--neutral-200)',
        borderRadius: '0.5rem',
        padding: '0.625rem 0.75rem',
        overflowX: 'auto',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
      }}
    >
      <InPreContext.Provider value={true}>{children}</InPreContext.Provider>
    </pre>
  ),
  hr: () => <hr style={{ borderColor: 'var(--neutral-200)', margin: '0.875rem 0' }} />,
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: '3px solid var(--accent-gold)',
        paddingLeft: '0.75rem',
        color: 'var(--neutral-600)',
        margin: '0.5rem 0',
      }}
    >
      {children}
    </blockquote>
  ),
};

const remarkPlugins = [remarkGfm];

export function ChatMarkdown({ content }: { content: string }) {
  // Raw HTML in a reply is not rendered (no rehype-raw), so model text can't inject markup.
  // Children set their own margins inline (chatHeading/p/ul/etc.), which beats a plain
  // utility class, so the trim needs Tailwind's important modifier (trailing `!` in v4)
  // to actually win.
  return (
    <div className="min-w-0 break-words [&>*:first-child]:mt-0! [&>*:last-child]:mb-0!">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={chatComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
