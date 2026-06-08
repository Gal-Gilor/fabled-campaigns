// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getAllMonsters, getAllMagicItems } from '@/app/lib/wiki';

const BASE_URL = 'https://fabled-campaigns.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const monsters = getAllMonsters();
  const magicItems = getAllMagicItems();

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/wiki`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/wiki/monsters`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/wiki/magic-items`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...monsters.map((m) => ({
      url: `${BASE_URL}/wiki/monsters/${m.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...magicItems.map((i) => ({
      url: `${BASE_URL}/wiki/magic-items/${i.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
