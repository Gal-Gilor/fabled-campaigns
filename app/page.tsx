import Link from 'next/link';
import { auth } from '@/auth';

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Fabled Campaigns',
  description:
    'A personal campaign assistant for tabletop RPG players. Manage sessions, plan encounters, generate maps, and keep your homebrew organized through a simple chat interface.',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  url: 'https://fabled-campaigns.vercel.app',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Fabled Campaigns?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Fabled Campaigns is a personal assistant for tabletop RPG players. Describe what you need and it handles the rest. Sessions stay organized so you can pick up where you left off.',
      },
    },
    {
      '@type': 'Question',
      name: 'What can I use it for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Session management, encounter map generation, homebrew campaign building, and character tracking. The chat interface understands plain language with no special commands to learn.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does map generation work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Describe a setting in plain language and Fabled Campaigns generates a matching encounter map. Maps are saved to your account. Group them into collections to keep the visual style consistent across a campaign.',
      },
    },
    {
      '@type': 'Question',
      name: 'What tabletop systems does it support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Any system. It works well with popular systems like Pathfinder, Call of Cthulhu, and Blades in the Dark, as well as any homebrew ruleset.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a collection?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "A collection groups maps by visual theme — terrain, lighting, color palette. Attach a collection to a generation request and the maps it produces will stay visually consistent with the rest of that campaign's materials.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is it free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Fabled Campaigns is free during its current development phase.',
      },
    },
  ],
};

const faqs = jsonLdFaq.mainEntity.map((item) => ({
  q: item.name,
  a: item.acceptedAnswer.text,
}));

export default async function LandingPage() {
  const session = await auth();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <main>
        {/* Hero */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-6 py-28"
          style={{ minHeight: '60vh' }}
        >
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(219,234,254,0.70) 0%, rgba(248,250,252,0.65) 100%), url(/images/hero/hero-bg.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            role="img"
            aria-label="Fantasy tabletop RPG map background"
          />
          <h1
            className="text-5xl font-semibold mb-3"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
          >
            Fabled Campaigns
          </h1>
          <p
            className="text-lg mb-3"
            style={{ color: 'var(--neutral-600)', fontFamily: 'var(--font-cinzel), serif' }}
          >
            Where Every Tale Rolls a Natural 20.
          </p>
          <p className="text-base max-w-lg mb-8" style={{ color: 'var(--neutral-700)' }}>
            Fabled Campaigns is a personal campaign assistant for tabletop players. Manage sessions, plan encounters, and generate maps through a simple chat interface.
          </p>
          {session?.user ? (
            <Link
              href="/chat"
              className="px-6 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-blue)', color: '#fff' }}
            >
              Continue playing
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="px-6 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-blue)', color: '#fff' }}
            >
              Sign in with Google
            </Link>
          )}
        </section>

        {/* Features */}
        <section className="px-6 py-20 max-w-3xl mx-auto">
          <h2
            className="text-2xl font-semibold mb-10 text-center"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
          >
            What it does
          </h2>
          <div className="flex flex-col gap-10">
            <div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
              >
                Campaign assistant
              </h3>
              <p style={{ color: 'var(--neutral-700)' }}>
                Plan sessions, build encounters, and keep campaign notes organized through a simple chat interface. Describe what you need in plain language and get something useful back.
              </p>
            </div>
            <div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
              >
                Map generation
              </h3>
              <p style={{ color: 'var(--neutral-700)' }}>
                Describe a setting (a foggy dockside alley, a collapsed temple at night) and Fabled Campaigns generates a matching encounter map. Maps are saved to your account and ready at the table.
              </p>
            </div>
            <div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
              >
                Collections
              </h3>
              <p style={{ color: 'var(--neutral-700)' }}>
                Group maps by visual theme to keep imagery consistent across a campaign. Attach a
                collection to any generation request and the resulting maps will match the rest of
                that campaign&apos;s materials.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          className="px-6 py-16 max-w-3xl mx-auto border-t"
          style={{ borderColor: 'var(--neutral-200)' }}
        >
          <h2
            className="text-2xl font-semibold mb-10 text-center"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
          >
            Common questions
          </h2>
          <div className="flex flex-col gap-8">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <h3
                  className="text-base font-semibold mb-1"
                  style={{ color: 'var(--neutral-900)' }}
                >
                  {q}
                </h3>
                <p style={{ color: 'var(--neutral-700)' }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section
          className="text-center py-16 px-6 border-t"
          style={{ borderColor: 'var(--neutral-200)', background: 'var(--pale-blue)' }}
        >
          {session?.user ? (
            <Link
              href="/chat"
              className="px-6 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-blue)', color: '#fff' }}
            >
              Continue playing
            </Link>
          ) : (
            <Link
              href="/auth/sign-in"
              className="px-6 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--primary-blue)', color: '#fff' }}
            >
              Get started — it&apos;s free
            </Link>
          )}
        </section>
      </main>
    </>
  );
}
