import { UIMessage } from 'ai';
import { rootAgent } from '../../lib/agents';
import { prepareContext } from '../../lib/contextManager';
import { getSession, updateSessionSummary } from '../../lib/db';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } = await req.json();

  const session = sessionId ? getSession(sessionId) : undefined;
  const existingSummary = session?.summary ?? null;

  const { modelMessages, summaryUpdated, newSummary } = await prepareContext(
    messages,
    existingSummary
  );

  if (summaryUpdated && sessionId && newSummary) {
    setImmediate(() => {
      try {
        updateSessionSummary(sessionId, newSummary);
      } catch (err) {
        console.error('[chat route] failed to persist summary:', err);
      }
    });
  }

  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
