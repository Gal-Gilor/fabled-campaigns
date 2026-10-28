// app/wiki/animals/page.tsx
import type { Metadata } from 'next';
import { pageMetadata } from '@/app/lib/pageMetadata';
import { MonsterBrowsePage } from '@/app/components/wiki/monster-browse-page';

export const metadata: Metadata = pageMetadata(
  'Animals | Fabled Campaigns Wiki',
  'Browse 5e SRD animals by creature type and challenge rating.',
  '/wiki/animals',
  '/opengraph-image'
);

export default function AnimalsPage() {
  return <MonsterBrowsePage category="Animal" />;
}
