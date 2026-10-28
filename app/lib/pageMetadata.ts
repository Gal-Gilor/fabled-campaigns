// app/lib/pageMetadata.ts
import type { Metadata } from 'next';

// Next.js replaces a parent's openGraph and twitter objects instead of merging
// them, and pages that set neither inherit the homepage's. Without this, a
// shared wiki link previews as the homepage, with og:url pointing at '/'.
// Pass `image` only on routes without an opengraph-image file: config images
// take priority over those files.
export function pageMetadata(
  title: string,
  description: string,
  path: string,
  image?: string
): Metadata {
  // Even `images: undefined` overrides the file, so omit the key entirely.
  const images = image ? { images: [image] } : {};
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'Fabled Campaigns',
      type: 'website',
      ...images,
    },
    twitter: { card: 'summary_large_image', title, description, ...images },
  };
}
