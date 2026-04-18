import { ToolLoopAgent, tool, readUIMessageStream, InferAgentUIMessage } from 'ai';
import type { UIMessage } from 'ai';
import { z } from 'zod';
import { GEMINI_MODEL } from './config';
import { GM_SYSTEM_PROMPT } from './prompts';
import { gmStubTools } from './tools';
import { enhanceMapPrompt, generateMapName, generateEncounterMap } from './mapTools';
import { vertex } from './vertexClient';

const mapSubAgent = new ToolLoopAgent({
  model: vertex(GEMINI_MODEL),
  instructions: `You are a map generation specialist for D&D 5e.
When given a map request:
1. Call generateMapName with the request details to create a location name.
2. Call enhanceMapPrompt with ALL available parameters — userRequest, ambiance, terrain (if identifiable from the request), setting (if a specific building type), perspective (indoor/outdoor), and detailLevel (close-up for rooms/single areas, wide for regions/districts).
3. Call generateEncounterMap with the enhanced prompt and the name.
4. Summarize: state the map name and briefly describe what was generated.`,
  tools: { enhanceMapPrompt, generateMapName, generateEncounterMap },
});

const mapAgentTool = tool({
  description: 'Generate a D&D tactical encounter map image',
  inputSchema: z.object({
    description: z.string().describe('Full description of the map — terrain, setting, key features'),
    vibe: z.string().optional().describe('Mood or atmosphere the map should convey'),
  }),
  execute: async function* ({ description, vibe }, { abortSignal }) {
    const prompt = vibe ? `${description}\nVibe: ${vibe}` : description;
    const result = await mapSubAgent.stream({ prompt, abortSignal });
    for await (const msg of readUIMessageStream({ stream: result.toUIMessageStream() })) {
      yield msg;
    }
  },
  toModelOutput: ({ output: message }) => {
    const lastText = message?.parts?.findLast((p: { type: string }) => p.type === 'text');
    return { type: 'text' as const, value: (lastText as { text?: string })?.text ?? 'Map generated.' };
  },
});

export const rootAgent = new ToolLoopAgent({
  model: vertex(GEMINI_MODEL),
  instructions: GM_SYSTEM_PROMPT,
  tools: { ...gmStubTools, mapAgent: mapAgentTool },
});

export type RootAgentMessage = InferAgentUIMessage<typeof rootAgent>;
