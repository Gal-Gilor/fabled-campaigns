import { UIMessage } from 'ai';
import { createRootAgent, buildCampaignContext } from '../../lib/agents';
import { prepareContext } from '../../lib/contextManager';
import { getSessionChatContext, updateSessionSummary } from '@/db';
import { auth } from '@/auth';
import { createUsageRecorder } from '../../lib/usage';
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

  // Summary + campaign lore in one lightweight pre-stream query — the DB is
  // authoritative, so joining/leaving a campaign takes effect on the next message
  const ctx = userId && sessionId ? await getSessionChatContext(sessionId, userId) : null;
  // ctx is non-null only when this user owns this session, so a client-supplied
  // sessionId can't attribute usage to another account or a nonexistent row
  const usage = ctx && userId && sessionId ? createUsageRecorder(userId, sessionId) : undefined;
  const existingSummary = ctx?.summary ?? null;

  const campaign = ctx?.campaign_lore
    ? { name: ctx.campaign_name ?? 'Untitled campaign', lore: ctx.campaign_lore }
    : undefined;
  const campaignContext = buildCampaignContext(campaign);

  const { modelMessages, newSummary } = await prepareContext(
    messages,
    existingSummary,
    campaignContext.length,
    usage
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

  // Map tools write rows under this session, so only hand over one the user owns
  const ownedSessionId = ctx && sessionId ? sessionId : undefined;
  const rootAgent = createRootAgent(userId, activeCollection, ownedSessionId, campaign, usage);
  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
