import { ImageResponse } from 'next/og';

export const alt = 'Fabled Campaigns — AI Dungeon Master guide for tabletop RPGs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          padding: '60px',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: '#f59e0b',
            letterSpacing: '0.05em',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          Fabled Campaigns
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#dbeafe',
            textAlign: 'center',
            letterSpacing: '0.03em',
            marginBottom: 16,
          }}
        >
          Where Every Tale Rolls a Natural 20.
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#93c5fd',
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          AI-powered Dungeon Master guide for tabletop RPG players
        </div>
      </div>
    ),
    { ...size }
  );
}
