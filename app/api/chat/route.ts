import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { createVertex } from '@ai-sdk/google-vertex';
import { GEMINI_MODEL, DEFAULT_GCP_LOCATION } from '../../lib/config';
import { GM_SYSTEM_PROMPT } from '../../lib/prompts';
import { gmTools } from '../../lib/tools';

const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? DEFAULT_GCP_LOCATION,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: vertex(GEMINI_MODEL),
    system: GM_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: gmTools,
  });

  return result.toUIMessageStreamResponse();
}
