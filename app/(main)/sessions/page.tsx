'use client';

import { useEffect, useRef, useState } from 'react';
import { Session } from '../../lib/db';
import { useSessionContext } from '../../components/session-context';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} style={{ flexShrink: 0 }}>
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SessionsPage() {
  const { sessions, setSessions } = useSessionContext();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessions.length > 0) return;
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openMenuId]);

  const sorted = [...sessions].sort(
    (a, b) => b.starred - a.starred || b.updated_at - a.updated_at
  );

  async function handleDelete(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setSessions((prev: Session[]) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  }

  async function handleStar(id: string, starred: boolean) {
    await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred }),
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, starred: starred ? 1 : 0 } : s))
    );
  }

  async function handleRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) { setRenamingId(null); return; }
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });
    const { session } = await res.json();
    setSessions((prev) => prev.map((s) => (s.id === id ? session : s)));
    setRenamingId(null);
  }

  return (
    <div className="overflow-y-auto flex-1" style={{ background: 'var(--neutral-100)' }}>
      <div className="py-16 pl-[180px] pr-8" style={{ maxWidth: '1080px' }}>
        <h1
          className="font-semibold tracking-wide mb-6"
          style={{ fontSize: '1.4rem', fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
        >
          Sessions
        </h1>

        <hr style={{ borderColor: 'var(--neutral-200)' }} />

        {sorted.length === 0 && (
          <p className="py-8 text-sm" style={{ color: 'var(--neutral-400)' }}>
            No sessions yet.
          </p>
        )}

        {sorted.map((session) => (
          <div
            key={session.id}
            className="group relative flex items-center border-b"
            style={{ borderColor: 'var(--neutral-200)' }}
          >
            {/* Star indicator */}
            {session.starred ? (
              <span className="mr-2 flex-shrink-0" style={{ color: 'var(--accent-gold)' }}>
                <StarIcon filled />
              </span>
            ) : null}

            {/* Name / inline rename */}
            {renamingId === session.id ? (
              <div className="flex-1 py-5">
                <input
                  autoFocus
                  value={renamingName}
                  onChange={(e) => setRenamingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(session.id, renamingName);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => handleRename(session.id, renamingName)}
                  className="w-full rounded px-2 py-1 text-lg font-medium outline-none"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: 'var(--neutral-900)',
                    background: '#fff',
                    border: '1px solid var(--primary-blue)',
                  }}
                />
              </div>
            ) : (
              <a
                href={`/?session=${session.id}`}
                className="flex-1 py-5 flex flex-col gap-1 transition-all"
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                <p
                  className="text-lg font-medium"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-900)' }}
                >
                  {session.name}
                </p>
                <p className="text-sm" style={{ color: 'var(--neutral-400)' }}>
                  {formatDate(session.updated_at)}
                </p>
              </a>
            )}

            {/* Ellipsis button + dropdown */}
            <div className="relative flex-shrink-0" ref={openMenuId === session.id ? menuRef : undefined}>
              <button
                className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg transition-all text-lg"
                style={{ color: 'var(--neutral-400)' }}
                onClick={(e) => {
                  e.preventDefault();
                  setOpenMenuId((prev) => (prev === session.id ? null : session.id));
                }}
                title="Session actions"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neutral-700)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-400)')}
              >
                ···
              </button>

              {openMenuId === session.id && (
                <div
                  className="absolute right-0 z-20 rounded-lg shadow-lg py-1"
                  style={{
                    top: '100%',
                    minWidth: '10rem',
                    background: '#fff',
                    border: '1px solid var(--neutral-200)',
                  }}
                >
                  {/* Rename */}
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-all"
                    style={{ color: 'var(--neutral-700)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setRenamingId(session.id);
                      setRenamingName(session.name);
                      setOpenMenuId(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Rename
                  </button>

                  {/* Star / Unstar */}
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-all"
                    style={{ color: 'var(--neutral-700)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      handleStar(session.id, !session.starred);
                      setOpenMenuId(null);
                    }}
                  >
                    <span style={{ color: session.starred ? 'var(--accent-gold)' : 'currentColor' }}>
                      <StarIcon filled={!!session.starred} />
                    </span>
                    {session.starred ? 'Unstar' : 'Star'}
                  </button>

                  {/* Delete */}
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-all"
                    style={{ color: '#dc2626' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => {
                      setConfirmDeleteId(session.id);
                      setOpenMenuId(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          <div
            className="rounded-xl shadow-xl px-8 py-6 flex flex-col gap-4"
            style={{ background: '#fff', maxWidth: '24rem', width: '100%', border: '1px solid var(--neutral-200)' }}
          >
            <p className="text-base font-medium" style={{ color: 'var(--neutral-900)' }}>
              Delete this session? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'var(--neutral-200)', color: 'var(--neutral-700)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-200)')}
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: '#dc2626' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#dc2626')}
                onClick={() => handleDelete(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
