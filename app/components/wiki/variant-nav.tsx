// app/components/wiki/variant-nav.tsx
'use client';
import { useEffect, useState } from 'react';

export type VariantLink = { slug: string; label: string; cr: string };

// Jump bar for a group page with several stat blocks. It sticks to the top
// while the stat blocks scroll past and marks the one being read: the last
// section whose top has passed a third of the way down the screen.
export function VariantNav({ variants }: { variants: VariantLink[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const line = window.innerHeight / 3;
      let current: string | null = null;
      for (const { slug } of variants) {
        const section = document.getElementById(slug);
        if (section && section.getBoundingClientRect().top <= line) current = slug;
      }
      setActive(current);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [variants]);

  return (
    <nav
      aria-label="Stat blocks on this page"
      className="sticky top-0 z-10 py-2"
      style={{ background: 'var(--neutral-100)', marginBottom: '1rem' }}
    >
      <ul
        className="m-0 grid list-none overflow-hidden rounded-[0.6rem] border bg-white p-0"
        style={{
          gridTemplateColumns: `repeat(${variants.length}, minmax(0, 1fr))`,
          borderColor: 'var(--accent-gold)',
        }}
      >
        {variants.map(({ slug, label, cr }) => (
          <li
            key={slug}
            className="border-l first:border-l-0"
            style={{ borderColor: 'var(--light-gold)' }}
          >
            <a
              href={`#${slug}`}
              aria-current={active === slug ? 'location' : undefined}
              className="flex h-full min-h-11 flex-col items-center justify-center px-0.5 py-2 text-center no-underline transition-colors hover:bg-[var(--pale-gold)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent-gold)] aria-[current=location]:bg-[var(--pale-gold)]"
            >
              <span
                className="leading-tight font-semibold"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'var(--neutral-900)',
                  // Shrinks on narrow phones so 'Wyrmling' fits a quarter of a 320px screen
                  fontSize: 'clamp(0.7rem, 4.4vw - 3px, 0.85rem)',
                }}
              >
                {label}
              </span>
              <span style={{ color: 'var(--gold-ink)', fontSize: '0.72rem' }}>CR {cr}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
