// app/components/wiki/stat-block.tsx
import type { AbilityKey, Monster } from '@/types/wiki';
import { abilityModifier, formatChallenge, formatModifier } from '@/app/lib/wiki';

const ABILITY_SCORES: { label: string; key: AbilityKey }[] = [
  { label: 'STR', key: 'str' },
  { label: 'DEX', key: 'dex' },
  { label: 'CON', key: 'con' },
  { label: 'INT', key: 'int' },
  { label: 'WIS', key: 'wis' },
  { label: 'CHA', key: 'cha' },
];

export function StatBlock({ monster }: { monster: Monster }) {
  // Optional lines, shown only when the stat block prints them.
  const details: [string, string | null][] = [
    ['Skills', monster.skills],
    ['Gear', monster.gear],
    ['Resistances', monster.resistances],
    ['Vulnerabilities', monster.vulnerabilities],
    ['Immunities', monster.immunities],
    ['Senses', monster.senses],
    ['Languages', monster.languages],
  ];

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
          <strong>AC</strong> {monster.ac}
          <strong style={{ marginLeft: '1.5rem' }}>Initiative</strong> {monster.initiative}
        </p>
        <p style={{ margin: 0 }}>
          <strong>HP</strong> {monster.hp}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Speed</strong> {monster.speed}
        </p>
      </div>

      <hr style={{ borderColor: 'var(--accent-gold)', margin: '0.75rem 0' }} />

      <div
        className="grid grid-cols-3 sm:grid-cols-6"
        style={{
          textAlign: 'center',
          fontSize: '0.875rem',
          marginBottom: '0.75rem',
          gap: '0.25rem',
        }}
      >
        {ABILITY_SCORES.map(({ label, key }) => (
          <div key={key}>
            <div style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>{label}</div>
            <div style={{ color: 'var(--neutral-700)' }}>{monster[key]}</div>
            <div style={{ color: 'var(--neutral-600)', fontSize: '0.75rem' }}>
              Mod {formatModifier(abilityModifier(monster[key]))}
            </div>
            <div style={{ color: 'var(--neutral-600)', fontSize: '0.75rem' }}>
              Save {formatModifier(monster.saves[key])}
            </div>
          </div>
        ))}
      </div>

      <hr style={{ borderColor: 'var(--accent-gold)', margin: '0.75rem 0' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          fontSize: '0.9375rem',
        }}
      >
        {details.map(
          ([label, value]) =>
            value != null && (
              <p key={label} style={{ margin: 0 }}>
                <strong>{label}</strong> {value}
              </p>
            )
        )}
        <p style={{ margin: 0 }}>
          <strong>CR</strong> {formatChallenge(monster)}
        </p>
      </div>
    </div>
  );
}
