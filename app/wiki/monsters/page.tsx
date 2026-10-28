// app/wiki/monsters/page.tsx
import type { Metadata } from 'next';
import { pageMetadata } from '@/app/lib/pageMetadata';
import { MonsterBrowsePage } from '@/app/components/wiki/monster-browse-page';

export const metadata: Metadata = pageMetadata(
  'Monsters | Fabled Campaigns Wiki',
  'Browse 5e SRD monsters by creature type and challenge rating.',
  '/wiki/monsters',
  '/opengraph-image'
);

export default function MonstersPage() {
  return <MonsterBrowsePage category="Monster" />;
}
