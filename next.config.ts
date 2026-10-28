import type { NextConfig } from "next";
import monsters from "./data/monsters.json";
import { legacyMonsterRedirects } from "./app/lib/wikiPaths";
import type { Monster } from "./types/wiki";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // The apex-to-www redirect lives in the Vercel domain settings. A host
  // redirect here loops with any domain redirect pointing the other way.
  async redirects() {
    return [
      // Creature pages are one per group, and animals moved to /wiki/animals.
      ...legacyMonsterRedirects(monsters as Monster[]),
    ];
  },
};

export default nextConfig;
