import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

// DB lives at repo root, outside app/ to avoid Next.js public exposure
const DB_PATH = path.join(process.cwd(), '..', 'gm-sessions.db');

export interface Session {
  id: string;
  name: string;
  starred: number;
  created_at: number;
  updated_at: number;
  messages: string; // JSON-serialized UIMessage[]
  summary: string | null;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        messages    TEXT NOT NULL DEFAULT '[]'
      )
    `);
    try {
      _db.exec(`ALTER TABLE sessions ADD COLUMN starred INTEGER NOT NULL DEFAULT 0`);
    } catch {
      // Column already exists — safe to ignore
    }
    try {
      _db.exec(`ALTER TABLE sessions ADD COLUMN summary TEXT DEFAULT NULL`);
    } catch {
      // Column already exists — safe to ignore
    }
  }
  return _db;
}

export function listSessions(): Session[] {
  return getDb()
    .prepare('SELECT * FROM sessions ORDER BY starred DESC, updated_at DESC')
    .all() as Session[];
}

export function createSession(name?: string): Session {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const sessionName =
    name ??
    `Session — ${new Date(now).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`;

  db.prepare(
    'INSERT INTO sessions (id, name, created_at, updated_at, messages) VALUES (?, ?, ?, ?, ?)'
  ).run(id, sessionName, now, now, '[]');

  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session;
}

export function getSession(id: string): Session | undefined {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
}

export function updateSession(
  id: string,
  patch: { name?: string; messages?: string; starred?: number }
): Session {
  const db = getDb();
  const now = Date.now();
  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.messages !== undefined) {
    fields.push('messages = ?');
    values.push(patch.messages);
  }
  if (patch.starred !== undefined) {
    fields.push('starred = ?');
    values.push(patch.starred);
  }

  values.push(id);
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session;
}

export function updateSessionSummary(id: string, summary: string): void {
  getDb()
    .prepare('UPDATE sessions SET summary = ?, updated_at = ? WHERE id = ?')
    .run(summary, Date.now(), id);
}

export function deleteSession(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}
