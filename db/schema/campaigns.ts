export const campaignsSchema = `
CREATE TABLE IF NOT EXISTS campaigns (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  lore       TEXT,
  created_at BIGINT  NOT NULL,
  updated_at BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS first_message_at BIGINT;
CREATE INDEX IF NOT EXISTS chat_sessions_campaign_id_idx ON chat_sessions(campaign_id);
`;
