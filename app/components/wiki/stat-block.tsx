// app/components/wiki/stat-block.tsx
import type { Monster } from '@/types/wiki';

function modifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const ABILITY_SCORES = [
  { label: 'STR', key: 'str' },
  { label: 'DEX', key: 'dex' },
  { label: 'CON', key: 'con' },
  { label: 'INT', key: 'int' },
  { label: 'WIS', key: 'wis' },
  { label: 'CHA', key: 'cha' },
] as const;

export function StatBlock({ monster }: { monster: Monster }) {
  return (
    <div
      style={{
        background: 'var(--pale-gold)',
        border: '1px solid var(--accent-gold)',
        borderRadius: '0.5rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: 'var(--neutral-900)',
          margin: '0 0 0.25rem',
          fontSize: '1.5rem',
        }}
      >
        {monster.name}
      </h1>
      <p
        style={{
          color: 'var(--neutral-600)',
          fontStyle: 'italic',
          margin: '0 0 0.75rem',
          fontSize: '0.9375rem',
        }}
      >
        {monster.size} {monster.type}, {monster.alignment}
      </p>

      <hr style={{ borderColor: 'var(--accent-gold)', margin: '0.75rem 0' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          marginBottom: '0.75rem',
          fontSize: '0.9375rem',
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Armor Class</strong> {monster.ac}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Hit Points</strong> {monster.hp}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Speed</strong> {monster.speed}
        </p>
      </div>

      <hr style={{ borderColor: 'var(--accent-gold)', margin: '0.75rem 0' }} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          textAlign: 'center',
          fontSize: '0.875rem',
          marginBottom: '0.75rem',
          gap: '0.25rem',
        }}
      >
        {ABILITY_SCORES.map(({ label, key }) => (
          <div key={key}>
            <div style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>{label}</div>
            <div style={{ color: 'var(--neutral-700)' }}>
              {monster[key]} ({modifier(monster[key])})
            </div>
          </div>
        ))}
      </div>

      <hr style={{ borderColor: 'var(--accent-gold)', margin: '0.75rem 0' }} />

      <p style={{ margin: 0, fontSize: '0.9375rem' }}>
        <strong>Challenge</strong> {monster.cr}
      </p>
    </div>
  );
}
