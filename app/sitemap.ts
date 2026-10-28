// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getAllMagicItems, getMonsterGroups } from '@/app/lib/wiki';
import { CATEGORY_PATHS } from '@/app/lib/wikiPaths';

const BASE_URL = 'https://fabledcampaigns.com';

// No lastModified: stamping every URL with the build time tells Google all
// pages changed on each deploy, which teaches it to ignore the field.
export default function sitemap(): MetadataRoute.Sitemap {
  const groups = [...getMonsterGroups('Monster'), ...getMonsterGroups('Animal')];
  const magicItems = getAllMagicItems();

  return [
    {
      url: BASE_URL,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/wiki`,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/wiki/monsters`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/wiki/animals`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/wiki/magic-items`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...groups.map((g) => ({
      url: `${BASE_URL}/wiki/${CATEGORY_PATHS[g.category]}/${g.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...magicItems.map((i) => ({
      url: `${BASE_URL}/wiki/magic-items/${i.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
