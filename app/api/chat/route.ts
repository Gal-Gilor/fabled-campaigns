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

  const { modelMessages, summaryUpdated, newSummary } = await prepareContext(
    messages,
    existingSummary
  );

  if (summaryUpdated && sessionId && newSummary && userId) {
    Promise.resolve().then(async () => {
      try {
        await updateSessionSummary(sessionId, userId, newSummary);
      } catch (err) {
        console.error('[chat route] failed to persist summary:', err);
      }
    });
  }

  const rootAgent = createRootAgent(activeCollection);
  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
