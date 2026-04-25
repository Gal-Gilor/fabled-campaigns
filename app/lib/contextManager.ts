import { convertToModelMessages, generateObject, getToolName, isToolUIPart, UIMessage } from 'ai';
import { z } from 'zod';
import { TOKEN_EVICTION_THRESHOLD, TOKEN_OVERHEAD_RESERVE_CHARS, GEMINI_MODEL } from './config';
import { vertex } from './vertexClient';

type ModelMessages = Awaited<ReturnType<typeof convertToModelMessages>>;

// ---------------------------------------------------------------------------
// Session memory schema
// ---------------------------------------------------------------------------

const NpcSchema = z.object({
  name: z.string(),
  description: z.string(),
  relationship: z.enum(['allied', 'hostile', 'neutral', 'unknown']).optional(),
});

const LocationSchema = z.object({
  name: z.string(),
  description: z.string(),
  map_generated: z.boolean().optional(),
});

const QuestSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.enum(['active', 'resolved', 'abandoned']).default('active'),
});

export const SessionMemorySchema = z.object({
  npcs: z.array(NpcSchema).default([]),
  locations: z.array(LocationSchema).default([]),
  quests: z.array(QuestSchema).default([]),
  key_decisions: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type SessionMemory = z.infer<typeof SessionMemorySchema>;

// ---------------------------------------------------------------------------
// Image pruning helpers
// ---------------------------------------------------------------------------

function pruneImageSrc(output: unknown): unknown {
  if (typeof output !== 'object' || output === null) return output;

  const o = output as Record<string, unknown>;
  if (o.type === 'image' && typeof o.src === 'string' && o.src.startsWith('data:')) {
    return { ...o, src: '[image data]' };
  }

  if ('parts' in o && Array.isArray(o.parts)) {
    return {
      ...o,
      parts: (o.parts as unknown[]).map((p) => {
        if (
          typeof p === 'object' &&
          p !== null &&
          (p as Record<string, unknown>).type === 'tool-invocation' &&
          (p as Record<string, unknown>).state === 'output-available'
        ) {
          const part = p as Record<string, unknown>;
          return { ...part, output: pruneOutput(part.output) };
        }
        return p;
      }),
    };
  }

  return output;
}

// Parse JSON if string, prune, re-serialize to the same form.
function pruneOutput(output: unknown): unknown {
  if (typeof output !== 'string') return pruneImageSrc(output);
  try {
    return JSON.stringify(pruneImageSrc(JSON.parse(output)));
  } catch {
    return output;
  }
}

export function pruneToolOutputs(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => ({
    ...msg,
    parts: msg.parts.map((part) => {
      if (!isToolUIPart(part) || part.state !== 'output-available') return part;
      return { ...part, output: pruneOutput(part.output) };
    }),
  }));
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

const CHARS_PER_TOKEN = 4;           // Gemini English prose baseline
const TOOL_OUTPUT_CAP_CHARS = 2_000; // max chars counted from any single tool output

function estimateMessageChars(message: UIMessage): number {
  let chars = 0;
  for (const part of message.parts) {
    if (part.type === 'text') {
      chars += (part as { type: 'text'; text: string }).text.length;
    } else if (isToolUIPart(part)) {
      chars += getToolName(part).length;
      const p = part as { input?: unknown; output?: unknown; state: string };
      if (p.input !== undefined) chars += JSON.stringify(p.input).length;
      if (p.state === 'output-available' && p.output !== undefined) {
        const out = typeof p.output === 'string' ? p.output : JSON.stringify(p.output);
        chars += Math.min(out.length, TOOL_OUTPUT_CAP_CHARS);
      }
    }
  }
  return chars;
}

export function estimateMessageTokens(message: UIMessage): number {
  return Math.ceil(estimateMessageChars(message) / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Window management (token-based)
// ---------------------------------------------------------------------------

export function applyTokenWindow(
  messages: UIMessage[]
): { recent: UIMessage[]; evicted: UIMessage[] } {
  const budgetChars = TOKEN_EVICTION_THRESHOLD * CHARS_PER_TOKEN - TOKEN_OVERHEAD_RESERVE_CHARS;

  let accumulated = 0;
  let splitIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgChars = estimateMessageChars(messages[i]);
    if (accumulated + msgChars > budgetChars) break;
    accumulated += msgChars;
    splitIndex = i;
  }

  // Always keep at least the most recent message (the current user turn).
  // Prevents a zero-message request if a single message alone exceeds budget.
  if (splitIndex >= messages.length && messages.length > 0) {
    splitIndex = messages.length - 1;
  }

  return {
    recent: messages.slice(splitIndex),
    evicted: messages.slice(0, splitIndex),
  };
}

// ---------------------------------------------------------------------------
// Summarization
// ---------------------------------------------------------------------------

function serializeForSummary(messages: UIMessage[]): string {
  return messages
    .map((m) => {
      const parts: string[] = [];
      for (const p of m.parts) {
        if (p.type === 'text') {
          parts.push((p as { type: 'text'; text: string }).text);
        } else if (isToolUIPart(p)) {
          parts.push(`[tool: ${(p as { toolName: string }).toolName}]`);
        }
      }
      const content = parts.join(' ').trim();
      return content ? `${m.role}: ${content}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

function tryParseMemory(raw: string): SessionMemory | null {
  try {
    const parsed = JSON.parse(raw);
    return SessionMemorySchema.parse(parsed);
  } catch (err) {
    if (raw.trimStart().startsWith('{')) {
      console.warn('[contextManager] tryParseMemory: failed to parse structured summary, falling back to notes:', err);
    }
    return { npcs: [], locations: [], quests: [], key_decisions: [], notes: raw };
  }
}

function renderMemory(m: SessionMemory): string {
  const lines: string[] = ['[Session Memory — summary of earlier conversation]'];

  if (m.npcs.length > 0) {
    lines.push('\n**NPCs**');
    for (const npc of m.npcs) {
      const rel = npc.relationship ? ` (${npc.relationship})` : '';
      lines.push(`- **${npc.name}**${rel}: ${npc.description}`);
    }
  }

  if (m.locations.length > 0) {
    lines.push('\n**Locations**');
    for (const loc of m.locations) {
      const mapTag = loc.map_generated ? ' [map generated]' : '';
      lines.push(`- **${loc.name}**${mapTag}: ${loc.description}`);
    }
  }

  const activeQuests = m.quests.filter((q) => q.status === 'active');
  if (activeQuests.length > 0) {
    lines.push('\n**Active Quests**');
    for (const q of activeQuests) {
      lines.push(`- **${q.title}**: ${q.description}`);
    }
  }

  const resolvedQuests = m.quests.filter((q) => q.status !== 'active');
  if (resolvedQuests.length > 0) {
    lines.push('\n**Resolved / Abandoned Quests**');
    for (const q of resolvedQuests) {
      lines.push(`- **${q.title}** (${q.status}): ${q.description}`);
    }
  }

  if (m.key_decisions.length > 0) {
    lines.push('\n**Key Decisions**');
    for (const d of m.key_decisions) {
      lines.push(`- ${d}`);
    }
  }

  if (m.notes) {
    lines.push('\n**Notes**');
    lines.push(m.notes);
  }

  return lines.join('\n');
}

export async function summarize(
  evicted: UIMessage[],
  existingSummary: SessionMemory | null
): Promise<SessionMemory> {
  const conversationText = serializeForSummary(evicted);

  const existingBlock = existingSummary
    ? `<existing_memory>\n${JSON.stringify(existingSummary, null, 2)}\n</existing_memory>\n\n`
    : '';

  const { object } = await generateObject({
    model: vertex(GEMINI_MODEL),
    schema: SessionMemorySchema,
    prompt:
      `You are maintaining persistent memory for a D&D GM session.\n` +
      `Extract and update the structured session state from the conversation below.\n` +
      `Use specific names for all NPCs and locations. For quests, set status to 'resolved' or 'abandoned' if the conversation indicates so.\n` +
      `Merge with existing memory — do not drop entries unless they are explicitly resolved.\n` +
      `Set map_generated: true for any location where a map was generated during this session.\n\n` +
      existingBlock +
      `Conversation:\n${conversationText}`,
  });

  return object;
}

// ---------------------------------------------------------------------------
// Context preparation
// ---------------------------------------------------------------------------

export interface PreparedContext {
  modelMessages: ModelMessages;
  newSummary: string | null;
  summaryUpdated: boolean;
}

export async function prepareContext(
  messages: UIMessage[],
  existingSummary: string | null
): Promise<PreparedContext> {
  const { recent: rawRecent, evicted } = applyTokenWindow(messages);
  const recent = pruneToolOutputs(rawRecent);

  const parsedSummary = existingSummary ? tryParseMemory(existingSummary) : null;

  // Run summarization and model message conversion in parallel — they operate on disjoint slices
  const summaryPromise = evicted.length > 0
    ? summarize(evicted, parsedSummary).catch((err) => {
        console.error('[contextManager] summarize failed, proceeding without summary:', err);
        return null;
      })
    : Promise.resolve(null);

  const [newSummaryObj, modelMessages] = await Promise.all([
    summaryPromise,
    convertToModelMessages(recent),
  ]);

  const summaryUpdated = newSummaryObj !== null;
  const newSummary = newSummaryObj ? JSON.stringify(newSummaryObj) : null;
  const effectiveSummary = newSummaryObj ?? parsedSummary;

  if (effectiveSummary) {
    const summaryMessage = {
      role: 'user' as const,
      content: renderMemory(effectiveSummary),
    };
    return { modelMessages: [summaryMessage, ...modelMessages], newSummary, summaryUpdated };
  }

  return { modelMessages, newSummary, summaryUpdated };
}
