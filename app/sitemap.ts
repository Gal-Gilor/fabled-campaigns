import type { MetadataRoute } from 'next';

const BASE_URL = 'https://fabled-campaigns.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  // Only list indexable, canonical URLs. /chat and /auth/sign-in are
  // noindex (auth-gated app / utility page), so they're intentionally
  // excluded — listing them would trigger "Submitted URL marked noindex".
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
