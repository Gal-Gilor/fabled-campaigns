// app/components/wiki/srd-attribution.tsx

const linkStyle = { color: 'var(--primary-blue)' };

// CC-BY-4.0 notice for the SRD content on wiki pages. The first paragraph is
// Wizards' required wording; keep it verbatim and add no other credit to them.
export function SrdAttribution() {
  return (
    <aside
      className="px-6 py-4 text-xs"
      style={{ color: 'var(--neutral-600)', borderTop: '1px solid var(--neutral-200)' }}
    >
      <p style={{ margin: 0 }}>
        This work includes material from the System Reference Document 5.2.1 (&quot;SRD
        5.2.1&quot;) by Wizards of the Coast LLC, available at{' '}
        <a href="https://www.dndbeyond.com/srd" style={linkStyle}>
          https://www.dndbeyond.com/srd
        </a>
        . The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International
        License, available at{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/legalcode" style={linkStyle}>
          https://creativecommons.org/licenses/by/4.0/legalcode
        </a>
        .
      </p>
      <p style={{ margin: '0.5rem 0 0' }}>
        Entries are reformatted for this site. Some magic items are split into one page per
        variant, and creature variants share one page.
      </p>
    </aside>
  );
}
