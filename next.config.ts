import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
