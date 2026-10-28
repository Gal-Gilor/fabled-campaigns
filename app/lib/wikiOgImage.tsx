// app/lib/wikiOgImage.tsx
import { ImageResponse } from 'next/og';
import { formatCRRange } from './wiki';
import type { MonsterGroup } from '@/types/wiki';

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

const GROUP_BADGE = { background: 'rgba(255, 255, 255, 0.14)', color: '#ffffff' };

// A single stat block keeps its CR, AC and HP badges; a group of several shows
// the CR range and how many stat blocks the page holds.
export function monsterGroupOgImage(group: MonsterGroup) {
  const { members } = group;
  if (members.length === 1) {
    const [m] = members;
    // hp is printed as '315 (42d8 + 126)'; the card shows the average only.
    return wikiOgImage({
      kind: group.category,
      name: group.name,
      subtitle: `${m.size} ${m.type} · ${m.alignment}`,
      badges: [
        { label: `CR ${m.cr}`, ...GROUP_BADGE },
        { label: `AC ${m.ac}`, ...GROUP_BADGE },
        { label: `HP ${m.hp.split(' ')[0]}`, ...GROUP_BADGE },
      ],
    });
  }
  return wikiOgImage({
    kind: group.category,
    name: group.name,
    subtitle: [...new Set(members.map((m) => m.type))].join(' · '),
    badges: [
      { label: `CR ${formatCRRange([...new Set(members.map((m) => m.cr))])}`, ...GROUP_BADGE },
      { label: `${members.length} stat blocks`, ...GROUP_BADGE },
    ],
  });
}
