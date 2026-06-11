import { UIMessage } from 'ai';
import { createRootAgent } from '../../lib/agents';
import { prepareContext } from '../../lib/contextManager';
import { getSession, updateSessionSummary } from '@/db';
import { auth } from '@/auth';
import type { Collection } from '../../lib/collections';

export const maxDuration = 60;

export async function POST(req: Request) {
  const authSession = await auth();
  const userId = authSession?.user?.id ?? null;

  const {
    messages,
    sessionId,
    activeCollection,
  }: { messages: UIMessage[]; sessionId?: string; activeCollection?: Collection } = await req.json();

  const session = userId && sessionId ? await getSession(sessionId, userId) : undefined;
  const existingSummary = session?.summary ?? null;

  // Campaign lore arrives via the same getSession query (LEFT JOIN) — the DB is
  // authoritative, so joining/leaving a campaign takes effect on the next message
  const campaign = session?.campaign_lore
    ? { name: session.campaign_name ?? 'Untitled campaign', lore: session.campaign_lore }
    : undefined;

  const { modelMessages, newSummary } = await prepareContext(
    messages,
    existingSummary,
    campaign?.lore.length ?? 0
  );

  if (newSummary && sessionId && userId) {
    Promise.resolve().then(async () => {
      try {
        await updateSessionSummary(sessionId, userId, newSummary);
      } catch (err) {
        console.error('[chat route] failed to persist summary:', err);
      }
    });
  }

  const rootAgent = createRootAgent(activeCollection, sessionId ?? undefined, campaign);
  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
