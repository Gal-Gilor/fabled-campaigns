// app/wiki/monsters/[slug]/opengraph-image.tsx
import { notFound } from 'next/navigation';
import { getAllMonsters, getMonsterBySlug } from '@/app/lib/wiki';
import { wikiOgImage, type OgBadge } from '@/app/lib/wikiOgImage';

export const alt = 'Monster from the Fabled Campaigns Wiki';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return getAllMonsters().map((m) => ({ slug: m.slug }));
}

const BADGE = { background: 'rgba(255, 255, 255, 0.14)', color: '#ffffff' };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const monster = getMonsterBySlug(slug);
  if (!monster) notFound();

  // hp is printed as '315 (42d8 + 126)'; the card shows the average only.
  const badges: OgBadge[] = [
    { label: `CR ${monster.cr}`, ...BADGE },
    { label: `AC ${monster.ac}`, ...BADGE },
    { label: `HP ${monster.hp.split(' ')[0]}`, ...BADGE },
  ];

  return wikiOgImage({
    kind: 'Monster',
    name: monster.name,
    subtitle: `${monster.size} ${monster.type} · ${monster.alignment}`,
    badges,
  });
}
