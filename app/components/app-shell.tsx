'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatSession as Session } from '@/db';
import { SessionContext, SessionHandlers } from './session-context';
import Sidebar from './sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status: authStatus } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [handlers, setHandlers] = useState<SessionHandlers | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Authenticated users get the sidebar open on desktop, closed on mobile.
    // Guests always start with it closed.
    if (authStatus !== 'loading') {
      setSidebarOpen(window.innerWidth >= 768);
    }
  }, [authStatus]);

  const fallbackNewSession = useCallback(async () => {
    const session = await fetch('/api/sessions', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => d.session);
    setSessions((prev) => [session, ...prev]);
    router.push(`/chat?session=${session.id}`);
  }, [router]);

  const fallbackSelectSession = useCallback((id: string) => {
    router.push(`/chat?session=${id}`);
  }, [router]);

  return (
    <SessionContext.Provider
      value={{ sessions, setSessions, activeSessionId, setActiveSessionId, handlers, setHandlers, openSidebar: () => setSidebarOpen(true) }}
    >
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--neutral-100)' }}>
        <Sidebar
          isOpen={sidebarOpen}
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handlers?.onSelectSession ?? fallbackSelectSession}
          onNewSession={handlers?.onNewSession ?? fallbackNewSession}
          onDeleteSession={handlers?.onDeleteSession ?? (() => {})}
          onRenameSession={handlers?.onRenameSession ?? (() => {})}
          onStarSession={handlers?.onStarSession ?? (() => {})}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </SessionContext.Provider>
  );
}
