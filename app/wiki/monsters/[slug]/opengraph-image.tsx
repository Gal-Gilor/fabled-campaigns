// app/wiki/monsters/[slug]/opengraph-image.tsx
import { notFound } from 'next/navigation';
import { getMonsterGroupBySlug, getMonsterGroups } from '@/app/lib/wiki';
import { monsterGroupOgImage } from '@/app/lib/wikiOgImage';

export const alt = 'Monster from the Fabled Campaigns Wiki';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return getMonsterGroups('Monster').map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = getMonsterGroupBySlug('Monster', slug);
  if (!group) notFound();
  return monsterGroupOgImage(group);
}
