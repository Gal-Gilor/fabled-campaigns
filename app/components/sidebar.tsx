'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ChatSession as Session } from '@/db';

interface SidebarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onStarSession: (id: string, starred: boolean) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} style={{ flexShrink: 0 }}>
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  const d = direction === 'right' ? 'M8 1L15 7L8 13' : 'M12 1L5 7L12 13';
  const lineX1 = direction === 'right' ? 15 : 5;
  const lineX2 = direction === 'right' ? 1 : 19;
  return (
    <svg width="16" height="12" viewBox="0 0 20 14" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={lineX1} y1="7" x2={lineX2} y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SessionRow({
  session,
  isActive,
  onSelect,
  editingId,
  editingName,
  onEditingNameChange,
  onStartEdit,
  onCommitRename,
  onCancelEdit,
  onDelete,
  onStar,
  openMenuId,
  onToggleMenu,
  menuRef,
  compact = false,
}: {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  editingId: string | null;
  editingName: string;
  onEditingNameChange: (v: string) => void;
  onStartEdit: (s: Session) => void;
  onCommitRename: (id: string) => void;
  onCancelEdit: () => void;
  onDelete?: (id: string) => void;
  onStar?: (id: string, starred: boolean) => void;
  openMenuId: string | null;
  onToggleMenu: (id: string) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  compact?: boolean;
}) {
  const isMenuOpen = openMenuId === session.id;

  return (
    <div
      className="group relative flex items-start gap-2 px-3 mx-2 my-0.5 rounded-lg cursor-pointer transition-all"
      style={{
        paddingTop: compact ? '0.375rem' : '0.625rem',
        paddingBottom: compact ? '0.375rem' : '0.625rem',
        background: isActive ? 'var(--pale-blue)' : 'transparent',
        border: isActive ? '1px solid var(--primary-blue)' : '1px solid transparent',
      }}
      onClick={() => editingId !== session.id && onSelect()}
    >
      <div className="flex-1 min-w-0">
        {editingId === session.id ? (
          <input
            autoFocus
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitRename(session.id);
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={() => onCommitRename(session.id)}
            className="text-sm font-medium w-full rounded px-1 outline-none"
            style={{
              color: 'var(--neutral-800)',
              background: 'var(--neutral-100)',
              border: '1px solid var(--primary-blue)',
            }}
          />
        ) : (
          <div className="flex items-center gap-1 min-w-0">
            {session.starred ? (
              <span style={{ color: 'var(--accent-gold)', flexShrink: 0 }}>
                <StarIcon filled size={11} />
              </span>
            ) : null}
            <p
              className="text-sm truncate"
              style={{ color: 'var(--neutral-800)' }}
            >
              {session.name}
            </p>
          </div>
        )}
        {!compact && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--neutral-400)' }}>
            {formatDate(session.updated_at)}
          </p>
        )}
      </div>

      {/* Ellipsis button */}
      {onDelete && (
        <div
          className="relative"
          ref={isMenuOpen ? menuRef : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-xs w-5 h-5 flex items-center justify-center rounded transition-all mt-0.5 leading-none"
            style={{ color: 'var(--neutral-400)', fontSize: '1rem', letterSpacing: '0.05em' }}
            onClick={() => onToggleMenu(session.id)}
            title="Session actions"
          >
            ···
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 z-30 rounded-lg shadow-lg py-1"
              style={{
                top: '100%',
                minWidth: '9rem',
                background: '#fff',
                border: '1px solid var(--neutral-200)',
              }}
            >
              {/* Rename */}
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-all"
                style={{ color: 'var(--neutral-700)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  onStartEdit(session);
                  onToggleMenu(session.id);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Rename
              </button>

              {/* Star / Unstar */}
              {onStar && (
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-all"
                  style={{ color: 'var(--neutral-700)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    onStar(session.id, !session.starred);
                    onToggleMenu(session.id);
                  }}
                >
                  <span style={{ color: session.starred ? 'var(--accent-gold)' : 'currentColor' }}>
                    <StarIcon filled={!!session.starred} size={12} />
                  </span>
                  {session.starred ? 'Unstar' : 'Star'}
                </button>
              )}

              {/* Delete */}
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-all"
                style={{ color: '#dc2626' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  onDelete(session.id);
                  onToggleMenu(session.id);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
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
      )}
    </div>
  );
}

function UserFooter() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) return null;

  const { name, image } = session.user;
  const initial = name ? name[0].toUpperCase() : '?';

  return (
    <>
      <hr style={{ borderColor: 'var(--neutral-200)' }} />
      <div className="flex items-center gap-2.5 px-3 py-3">
        {image ? (
          <img
            src={image}
            alt={name ?? 'User avatar'}
            width={28}
            height={28}
            className="rounded-full flex-shrink-0"
            style={{ width: '1.75rem', height: '1.75rem' }}
          />
        ) : (
          <div
            className="rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white"
            style={{ width: '1.75rem', height: '1.75rem', background: 'var(--primary-blue)' }}
          >
            {initial}
          </div>
        )}
        <span className="flex-1 text-sm truncate min-w-0" style={{ color: 'var(--neutral-700)' }}>
          {name}
        </span>
        <button
          onClick={() => signOut()}
          className="flex-shrink-0 text-xs px-2 py-1 rounded transition-all"
          style={{ color: 'var(--neutral-600)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-200)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Sidebar({
  isOpen,
  onOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onStarSession,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  function startEdit(session: Session) {
    setEditingId(session.id);
    setEditingName(session.name);
  }

  function commitRename(id: string) {
    const trimmed = editingName.trim();
    if (trimmed) onRenameSession(id, trimmed);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function toggleMenu(id: string) {
    setOpenMenuId((prev) => (prev === id ? null : id));
  }

  const sortedSessions = [...sessions].sort(
    (a, b) => b.starred - a.starred || b.updated_at - a.updated_at
  );
  const recentSessions = sortedSessions.slice(0, 5);

  const rowProps = {
    editingId,
    editingName,
    onEditingNameChange: setEditingName,
    onStartEdit: startEdit,
    onCommitRename: commitRename,
    onCancelEdit: cancelEdit,
    openMenuId,
    onToggleMenu: toggleMenu,
    menuRef,
  };

  return (
    <aside
      className={
        isOpen
          ? 'fixed inset-0 z-50 flex flex-col md:relative md:inset-auto md:z-auto md:flex-shrink-0 md:w-[22rem] md:min-w-[22rem] md:border-r md:overflow-x-hidden md:transition-all md:duration-200'
          : 'hidden md:flex md:flex-shrink-0 md:flex-col md:border-r md:overflow-x-hidden md:transition-all md:duration-200'
      }
      style={
        isOpen
          ? { background: 'var(--neutral-100)', borderColor: 'var(--neutral-200)' }
          : {
              width: '2.5rem',
              minWidth: '2.5rem',
              borderColor: 'var(--neutral-200)',
              background: 'var(--neutral-100)',
            }
      }
    >
      {!isOpen ? (
        <div className="flex flex-col items-center justify-start pt-3 gap-1">
          {/* Star branding */}
          <div className="p-2">
            <StarIcon filled={false} size={19} />
          </div>

          {/* Expand button */}
          <button
            onClick={onOpen}
            className="flex items-center justify-center rounded-lg p-2 transition-all"
            style={{ color: 'var(--neutral-600)' }}
            title="Expand sidebar"
          >
            <ChevronIcon direction="right" />
          </button>

          <div style={{ height: '1px', width: '24px', background: 'var(--neutral-200)', margin: '4px 0' }} />

          {/* New session */}
          <button
            onClick={onNewSession}
            className="flex items-center justify-center rounded-lg p-2 transition-all"
            style={{ color: 'var(--neutral-600)' }}
            title="New session"
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
              <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Sessions link */}
          <Link
            href="/sessions"
            className="flex items-center justify-center rounded-lg p-2 transition-all"
            style={{ color: 'var(--neutral-600)' }}
            title="Sessions"
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
              <path d="M2 3C2 2.44772 2.44772 2 3 2H9C9.55228 2 10 2.44772 10 3V9C10 9.55228 9.55228 10 9 10H3C2.44772 10 2 9.55228 2 9V3Z" stroke="currentColor" strokeWidth="1.25"/>
              <path d="M6 6C6 5.44772 6.44772 5 7 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H7C6.44772 13 6 12.5523 6 12V6Z" stroke="currentColor" strokeWidth="1.25"/>
            </svg>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col h-full md:w-[22rem]">
          {/* Mobile topbar — back button, hidden on desktop */}
          <div
            className="flex md:hidden items-center justify-between px-4 py-3 border-b"
            style={{ background: 'var(--primary-blue)', borderColor: 'var(--pale-blue)' }}
          >
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-medium text-white"
            >
              ← Back to Chat
            </button>
            <span style={{ fontFamily: 'var(--font-cinzel), serif', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
              Fabled Campaigns
            </span>
          </div>

          {/* Desktop header — hidden on mobile */}
          <div
            className="hidden md:flex items-center justify-between px-4 py-5 border-b"
            style={{ borderColor: 'var(--neutral-200)' }}
          >
            <div className="flex items-center gap-2">
              <StarIcon filled={false} size={20} />
              <span style={{ fontFamily: 'var(--font-cinzel), serif', color: 'var(--neutral-700)', fontSize: '1.5rem', fontWeight: 600 }}>
                Fabled Campaigns
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg p-1 transition-all"
              style={{ color: 'var(--neutral-500)' }}
              title="Collapse sidebar"
            >
              <ChevronIcon direction="left" />
            </button>
          </div>

          {/* Nav section */}
          <div className="px-2 pt-2 pb-1 flex flex-col gap-0.5">
            {/* New session */}
            <button
              onClick={onNewSession}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all text-left"
              style={{ color: 'var(--neutral-700)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: '0.94rem' }}>New session</span>
            </button>

            {/* Sessions link */}
            <Link
              href="/sessions"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all"
              style={{ color: 'var(--neutral-700)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--neutral-100)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
                <path d="M2 3C2 2.44772 2.44772 2 3 2H9C9.55228 2 10 2.44772 10 3V9C10 9.55228 9.55228 10 9 10H3C2.44772 10 2 9.55228 2 9V3Z" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M6 6C6 5.44772 6.44772 5 7 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H7C6.44772 13 6 12.5523 6 12V6Z" stroke="currentColor" strokeWidth="1.25"/>
              </svg>
              <span style={{ fontSize: '0.94rem' }}>Sessions</span>
            </Link>
          </div>

          <div className="flex-1" />

          {/* Recent sessions */}
          <div>
            <hr style={{ borderColor: 'var(--neutral-200)' }} />
            <p
              className="text-xs uppercase tracking-wider px-3 py-2"
              style={{ color: 'var(--neutral-400)' }}
            >
              Recent sessions
            </p>
            <div className="pb-2">
              {recentSessions.length === 0 && (
                <p className="px-4 py-1 text-xs" style={{ color: 'var(--neutral-400)' }}>
                  No sessions yet.
                </p>
              )}
              {recentSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  onSelect={() => onSelectSession(session.id)}
                  onDelete={onDeleteSession}
                  onStar={onStarSession}
                  compact
                  {...rowProps}
                />
              ))}
            </div>
          </div>
          <div className="flex-1" />
          <UserFooter />
        </div>
      )}
    </aside>
  );
}
