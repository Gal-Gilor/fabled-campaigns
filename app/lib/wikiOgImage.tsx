// app/lib/wikiOgImage.tsx
import { ImageResponse } from 'next/og';

export type OgBadge = { label: string; background: string; color: string };

type Props = {
  kind: string;
  name: string;
  subtitle: string;
  badges: OgBadge[];
};

// Link preview card for a wiki entry, in the same palette as the site-wide
// app/opengraph-image.tsx. Satori can't read CSS variables, so colors are hex.
export function wikiOgImage({ kind, name, subtitle, badges }: Props) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          padding: '72px',
        }}
      >
        <div style={{ fontSize: 26, color: '#93c5fd', letterSpacing: '0.05em', marginBottom: 20 }}>
          {`Fabled Campaigns Wiki · ${kind}`}
        </div>
        <div
          style={{
            fontSize: name.length > 28 ? 60 : 80,
            fontWeight: 700,
            color: '#f59e0b',
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 32, color: '#dbeafe', marginBottom: 36 }}>{subtitle}</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {badges.map((badge) => (
            <div
              key={badge.label}
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 8,
                background: badge.background,
                color: badge.color,
              }}
            >
              {badge.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
