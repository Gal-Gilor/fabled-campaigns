import { sql } from './client';

export interface ChatSession {
  id: string;
  user_id: string;
  name: string;
  created_at: number;
  updated_at: number;
  messages: string; // stored as JSONB, returned as string via JSON.stringify for compatibility
  summary: string | null;
  starred: number;
}

type RawChatSession = Omit<ChatSession, 'messages' | 'summary'> & {
  messages: unknown;
  summary: unknown;
};

function serializeRow(row: RawChatSession): ChatSession {
  return {
    ...row,
    messages: JSON.stringify(row.messages),
    summary: row.summary != null ? JSON.stringify(row.summary) : null,
  };
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
  const rows = await sql`
    SELECT * FROM chat_sessions
    WHERE user_id = ${userId}
    ORDER BY starred DESC, updated_at DESC
  `;
  return (rows as RawChatSession[]).map(serializeRow);
}

export async function createSession(userId: string, name?: string): Promise<ChatSession> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const sessionName = name ?? `Session ${new Date(now).toLocaleDateString()}`;

  const rows = await sql`
    INSERT INTO chat_sessions (id, user_id, name, created_at, updated_at, messages, starred)
    VALUES (${id}, ${userId}, ${sessionName}, ${now}, ${now}, '[]', 0)
    RETURNING *
  `;
  return serializeRow((rows as RawChatSession[])[0]);
}

export async function getSession(id: string, userId: string): Promise<ChatSession | null> {
  const rows = await sql`
    SELECT * FROM chat_sessions
    WHERE id = ${id} AND user_id = ${userId}
  `;
  if ((rows as RawChatSession[]).length === 0) return null;
  return serializeRow((rows as RawChatSession[])[0]);
}

export async function updateSession(
  id: string,
  userId: string,
  patch: { name?: string; messages?: string; starred?: number }
): Promise<ChatSession> {
  const now = Date.now();
  const setClauses: string[] = [];
  const values: unknown[] = [];

  // updated_at is always set
  values.push(now);
  setClauses.push(`updated_at = $${values.length}`);

  if (patch.name !== undefined) {
    values.push(patch.name);
    setClauses.push(`name = $${values.length}`);
  }
  if (patch.messages !== undefined) {
    values.push(patch.messages);
    setClauses.push(`messages = $${values.length}`);
  }
  if (patch.starred !== undefined) {
    values.push(patch.starred);
    setClauses.push(`starred = $${values.length}`);
  }

  values.push(id);
  const idParam = `$${values.length}`;
  values.push(userId);
  const userParam = `$${values.length}`;

  const query = `UPDATE chat_sessions SET ${setClauses.join(', ')} WHERE id = ${idParam} AND user_id = ${userParam} RETURNING *`;
  const rows = await sql.query(query, values);
  const row = (rows as unknown as { rows: unknown[] }).rows?.[0] ?? rows[0];
  if (!row) throw new Error('Session not found');
  return serializeRow(row as RawChatSession);
}

export async function updateSessionSummary(
  id: string,
  userId: string,
  summary: string
): Promise<void> {
  const summaryObj: unknown = JSON.parse(summary);
  await sql`
    UPDATE chat_sessions
    SET summary = ${summaryObj}, updated_at = ${Date.now()}
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  await sql`
    DELETE FROM chat_sessions
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
