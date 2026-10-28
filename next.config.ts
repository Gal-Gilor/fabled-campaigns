import type { NextConfig } from "next";
import monsters from "./data/monsters.json";
import { legacyMonsterRedirects } from "./app/lib/wikiPaths";
import type { Monster } from "./types/wiki";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // Search Console lists www copies of wiki pages as separate URLs.
  // Send them to the apex domain the canonical tags and sitemap use.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.fabledcampaigns.com' }],
        destination: 'https://fabledcampaigns.com/:path*',
        permanent: true,
      },
      // Creature pages are one per group, and animals moved to /wiki/animals.
      ...legacyMonsterRedirects(monsters as Monster[]),
    ];
  },
};

export default nextConfig;
