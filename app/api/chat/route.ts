import { UIMessage } from 'ai';
import { createRootAgent, buildCampaignContext } from '../../lib/agents';
import { prepareContext } from '../../lib/contextManager';
import { getSessionChatContext, getUserSettings, updateSessionSummary } from '@/db';
import { auth } from '@/auth';
import { createUsageRecorder } from '../../lib/usage';
import { DEFAULT_IMAGE_SIZE, clampImageSize } from '../../lib/config';
import type { Collection } from '../../lib/collections';

export const maxDuration = 300;

export async function POST(req: Request) {
  const authSession = await auth();
  const userId = authSession?.user?.id ?? null;

  const {
    messages,
    sessionId,
    activeCollection,
  }: { messages: UIMessage[]; sessionId?: string; activeCollection?: Collection } = await req.json();

  // Summary + campaign lore, and the user's image-quality setting, fetched
  // in parallel — the DB is authoritative for both, so a client can't inflate
  // its own image cost by sending a size, and joining/leaving a campaign
  // takes effect on the next message.
  const [ctx, settings] = await Promise.all([
    userId && sessionId ? getSessionChatContext(sessionId, userId) : Promise.resolve(null),
    userId
      ? getUserSettings(userId).catch((err) => {
          console.error('[chat route] failed to load user settings:', err);
          return { imageSize: DEFAULT_IMAGE_SIZE, tier: 'free' as const };
        })
      : Promise.resolve({ imageSize: DEFAULT_IMAGE_SIZE, tier: 'free' as const }),
  ]);
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
  // Clamped server-side so a revoked membership or a stale saved value (e.g.
  // a free user with a previously-saved 4K) never renders above the tier.
  const imageSize = clampImageSize(settings.imageSize, settings.tier);
  const rootAgent = createRootAgent(userId, activeCollection, ownedSessionId, campaign, usage, imageSize);
  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
