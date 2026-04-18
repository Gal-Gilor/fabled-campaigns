import { convertToModelMessages, UIMessage } from 'ai';
import { rootAgent } from '../../lib/agents';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = await rootAgent.stream({
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
