import { UIMessage, isToolUIPart } from 'ai';
import { createRootAgent } from '../../lib/agents';
import { prepareContext } from '../../lib/contextManager';
import { getSession, updateSessionSummary } from '@/db';
import { auth } from '@/auth';
import type { Collection } from '../../lib/collections';
import { safeJsonParse, isImageOutput } from '../../lib/messageUtils';

export const maxDuration = 60;

function findCollectionReference(messages: UIMessage[], collectionId?: string): string | undefined {
  if (!collectionId) return undefined;
  for (const msg of messages) {
    for (const part of msg.parts) {
      if (!isToolUIPart(part) || part.state !== 'output-available') continue;
      const output = safeJsonParse(part.output as string);
      if (isImageOutput(output) && output.collectionId === collectionId) {
        return output.src;
      }
    }
  }
  return undefined;
}

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

  const collectionReferenceUrl = findCollectionReference(messages, activeCollection?.id);

  const { modelMessages, newSummary } = await prepareContext(
    messages,
    existingSummary
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

  const rootAgent = createRootAgent(activeCollection, collectionReferenceUrl, sessionId ?? undefined);
  const result = await rootAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
