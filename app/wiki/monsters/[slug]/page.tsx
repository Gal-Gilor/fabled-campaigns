// app/wiki/monsters/[slug]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMonsterGroupBySlug, getMonsterGroups } from '@/app/lib/wiki';
import { MonsterGroupPage, monsterGroupMetadata } from '@/app/components/wiki/monster-group-page';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; q?: string }> };

export function generateStaticParams() {
  return getMonsterGroups('Monster').map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = getMonsterGroupBySlug('Monster', slug);
  return group ? monsterGroupMetadata(group) : {};
}

export default async function MonsterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, q } = await searchParams;
  const group = getMonsterGroupBySlug('Monster', slug);
  if (!group) notFound();
  return <MonsterGroupPage group={group} from={from} q={q} />;
}
