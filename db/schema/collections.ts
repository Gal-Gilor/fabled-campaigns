export const collectionsSchema = `
CREATE TABLE IF NOT EXISTS collections (
  id             TEXT    PRIMARY KEY,
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  terrain        TEXT,
  setting        TEXT,
  ambiance       TEXT,
  visual_details TEXT,
  created_at     BIGINT  NOT NULL,
  updated_at     BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);
ALTER TABLE collections DROP COLUMN IF EXISTS session_id;

CREATE TABLE IF NOT EXISTS locations (
  id            TEXT    PRIMARY KEY,
  collection_id TEXT    NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id    TEXT    REFERENCES chat_sessions(id) ON DELETE SET NULL,
  name          TEXT    NOT NULL,
  created_at    BIGINT  NOT NULL,
  updated_at    BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS locations_collection_id_idx ON locations(collection_id);
CREATE INDEX IF NOT EXISTS locations_session_id_idx ON locations(session_id);

CREATE TABLE IF NOT EXISTS artifacts (
  id          TEXT    PRIMARY KEY,
  location_id TEXT    NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  blob_url    TEXT    NOT NULL,
  prompt      TEXT,
  media_type  TEXT,
  created_at  BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS artifacts_location_id_idx ON artifacts(location_id);
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS parent_artifact_id TEXT REFERENCES artifacts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS artifacts_parent_artifact_id_idx ON artifacts(parent_artifact_id);

CREATE TABLE IF NOT EXISTS collection_sessions (
  id            TEXT    PRIMARY KEY,
  collection_id TEXT    NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  session_id    TEXT    REFERENCES chat_sessions(id) ON DELETE CASCADE,
  created_at    BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS collection_sessions_collection_id_idx ON collection_sessions(collection_id);
CREATE INDEX IF NOT EXISTS collection_sessions_session_id_idx ON collection_sessions(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS collection_sessions_unique_idx ON collection_sessions(collection_id, session_id);
`;
