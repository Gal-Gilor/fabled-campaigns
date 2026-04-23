import { UIMessage } from 'ai';
import { rootAgent } from '../../lib/agents';
import { prepareContext } from '../../lib/contextManager';
import { getSession, updateSessionSummary } from '@/db';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = authSession.user.id;

  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } = await req.json();

  const session = sessionId ? await getSession(sessionId, userId) : undefined;
  const existingSummary = session?.summary ?? null;

  const { modelMessages, summaryUpdated, newSummary } = await prepareContext(
    messages,
    existingSummary
  );

  if (summaryUpdated && sessionId && newSummary) {
    Promise.resolve().then(async () => {
      try {
        await updateSessionSummary(sessionId, userId, newSummary);
      } catch (err) {
        console.error('[chat route] failed to persist summary:', err);
      }
    });
  }

  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
