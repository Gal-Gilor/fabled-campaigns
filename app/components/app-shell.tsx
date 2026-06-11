'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChatSession as Session } from '@/db';
import { SessionContext, SessionHandlers, Campaign, CampaignActions } from './session-context';
import Sidebar from './sidebar';
import WikiModal from './wiki-modal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status: authStatus } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wikiOpen, setWikiOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

  // Campaigns load in parallel with the session list (fetched by Chat)
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setCampaigns([]);
      return;
    }
    let cancelled = false;
    fetch('/api/campaigns')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.campaigns)) setCampaigns(d.campaigns);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authStatus]);

  const createCampaign = useCallback(async (data: { name: string; lore?: string | null }) => {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const { campaign } = (await res.json()) as { campaign: Campaign };
    setCampaigns((prev) => [campaign, ...prev]);
    return campaign;
  }, []);

  const updateCampaign = useCallback(async (id: string, patch: { name?: string; lore?: string | null }) => {
    const snapshot = campaigns;
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Failed to update campaign: ${res.status}`);
    } catch (err) {
      console.error(err);
      setCampaigns(snapshot);
    }
  }, [campaigns]);

  const deleteCampaign = useCallback(async (id: string) => {
    const campaignSnapshot = campaigns;
    const sessionSnapshot = sessions;
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    // Sessions revert to ungrouped — mirrors the DB's ON DELETE SET NULL
    setSessions((prev) => prev.map((s) => (s.campaign_id === id ? { ...s, campaign_id: null } : s)));
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete campaign: ${res.status}`);
    } catch (err) {
      console.error(err);
      setCampaigns(campaignSnapshot);
      setSessions(sessionSnapshot);
    }
  }, [campaigns, sessions]);

  const assignSessionToCampaign = useCallback(async (sessionId: string, campaignId: string | null) => {
    const previous = sessions.find((s) => s.id === sessionId)?.campaign_id ?? null;
    if (previous === campaignId) return;
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, campaign_id: campaignId } : s)));
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (!res.ok) throw new Error(`Failed to assign session: ${res.status}`);
      const { session } = (await res.json()) as { session: Session };
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? session : s)));
    } catch (err) {
      console.error(err);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, campaign_id: previous } : s)));
    }
  }, [sessions]);

  const campaignActions: CampaignActions = useMemo(
    () => ({ createCampaign, updateCampaign, deleteCampaign, assignSessionToCampaign }),
    [createCampaign, updateCampaign, deleteCampaign, assignSessionToCampaign]
  );

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
      value={{ sessions, setSessions, activeSessionId, setActiveSessionId, handlers, setHandlers, campaigns, campaignActions, openSidebar: () => setSidebarOpen(true) }}
    >
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--neutral-100)' }}>
        <Sidebar
          isOpen={sidebarOpen}
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
          sessions={sessions}
          campaigns={campaigns}
          activeSessionId={activeSessionId}
          onSelectSession={handlers?.onSelectSession ?? fallbackSelectSession}
          onNewSession={handlers?.onNewSession ?? fallbackNewSession}
          onDeleteSession={handlers?.onDeleteSession ?? (() => {})}
          onRenameSession={handlers?.onRenameSession ?? (() => {})}
          onStarSession={handlers?.onStarSession ?? (() => {})}
          campaignActions={campaignActions}
          onWikiOpen={() => setWikiOpen(true)}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </div>
        <WikiModal isOpen={wikiOpen} onClose={() => setWikiOpen(false)} />
      </div>
    </SessionContext.Provider>
  );
}
