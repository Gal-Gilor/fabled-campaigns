'use client';
import { createContext, useContext } from 'react';
import { ChatSession as Session } from '@/db';

export interface SessionHandlers {
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onStarSession: (id: string, starred: boolean) => void;
}

export interface SessionContextValue {
  sessions: Session[];
  setSessions: (s: Session[] | ((prev: Session[]) => Session[])) => void;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  handlers: SessionHandlers | null;
  setHandlers: (h: SessionHandlers | null) => void;
  openSidebar?: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be used inside AppShell');
  return ctx;
}
