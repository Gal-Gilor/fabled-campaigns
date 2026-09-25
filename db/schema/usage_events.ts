export const usageEventsSchema = `
CREATE TABLE IF NOT EXISTS usage_events (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id          TEXT REFERENCES chat_sessions(id) ON DELETE SET NULL,
  source              TEXT NOT NULL,
  model               TEXT NOT NULL,
  created_at          BIGINT NOT NULL,
  input_tokens        INTEGER,
  cached_input_tokens INTEGER,
  output_tokens       INTEGER,
  image_count         INTEGER,
  voice_seconds       INTEGER
);

CREATE INDEX IF NOT EXISTS usage_events_user_id_created_at_idx ON usage_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS usage_events_session_id_idx ON usage_events(session_id);
`;
