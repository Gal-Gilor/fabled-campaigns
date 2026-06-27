import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-5"
      style={{ borderTop: '1px solid var(--neutral-200)' }}
    >
      <div>
        <p
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-700)' }}
        >
          Fabled Campaigns
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-600)' }}
        >
          Where Every Tale Rolls a Natural 20.
        </p>
      </div>
      <nav className="flex items-center gap-5">
        <Link
          href="/wiki"
          className="text-sm font-medium transition-opacity hover:opacity-75"
          style={{ color: 'var(--neutral-700)' }}
        >
          Wiki
        </Link>
      </nav>
    </footer>
  );
}
