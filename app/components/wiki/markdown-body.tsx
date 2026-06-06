// app/components/wiki/markdown-body.tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  h2: ({ children }) => (
    <h2
      style={{
        fontFamily: 'var(--font-cinzel), serif',
        color: 'var(--neutral-900)',
        fontSize: '1.125rem',
        fontWeight: 600,
        marginTop: '1.5rem',
        marginBottom: '0.5rem',
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      style={{
        fontFamily: 'var(--font-cinzel), serif',
        color: 'var(--neutral-900)',
        fontSize: '1rem',
        fontWeight: 600,
        marginTop: '1.25rem',
        marginBottom: '0.375rem',
      }}
    >
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ color: 'var(--neutral-700)', marginBottom: '0.75rem', lineHeight: '1.65' }}>
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong style={{ color: 'var(--neutral-900)', fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--neutral-600)' }}>{children}</em>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9375rem' }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
      style={{
        borderBottom: '2px solid var(--neutral-200)',
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        color: 'var(--neutral-900)',
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        borderBottom: '1px solid var(--neutral-200)',
        padding: '0.5rem 0.75rem',
        color: 'var(--neutral-700)',
      }}
    >
      {children}
    </td>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem', color: 'var(--neutral-700)' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem', color: 'var(--neutral-700)' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
  hr: () => (
    <hr style={{ borderColor: 'var(--neutral-200)', margin: '1.5rem 0' }} />
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: '3px solid var(--accent-gold)',
        paddingLeft: '1rem',
        color: 'var(--neutral-600)',
        margin: '1rem 0',
      }}
    >
      {children}
    </blockquote>
  ),
};

export function MarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
