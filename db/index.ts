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
  campaign_id: string | null;
  first_message_at: number | null;
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

export interface SessionChatContext {
  summary: string | null;
  campaign_name: string | null;
  campaign_lore: string | null;
}

// Hot-path projection for the chat route: summary + campaign lore in one query,
// without shipping the (potentially multi-MB) messages JSONB over the wire.
// The join is owner-filtered so a corrupted campaign_id can never leak another
// user's lore into this user's prompt.
export async function getSessionChatContext(
  id: string,
  userId: string
): Promise<SessionChatContext | null> {
  const rows = await sql`
    SELECT s.summary, c.name AS campaign_name, c.lore AS campaign_lore
    FROM chat_sessions s
    LEFT JOIN campaigns c ON c.id = s.campaign_id AND c.user_id = s.user_id
    WHERE s.id = ${id} AND s.user_id = ${userId}
  `;
  const list = rows as { summary: unknown; campaign_name: string | null; campaign_lore: string | null }[];
  if (list.length === 0) return null;
  const row = list[0];
  return {
    summary: row.summary != null ? JSON.stringify(row.summary) : null,
    campaign_name: row.campaign_name ?? null,
    campaign_lore: row.campaign_lore ?? null,
  };
}

// ---------------------------------------------------------------------------
// Shared dynamic-patch UPDATE
// ---------------------------------------------------------------------------

type RawClause = { render: (param: string) => string; value: unknown };

// Runs `UPDATE <table> SET … WHERE id AND user_id RETURNING *` from a map of
// column assignments (undefined entries skipped; null is a real value) plus
// optional raw clauses for expressions a plain assignment can't express.
// Returns the updated row, or null when no row matched. Table and column
// names are compile-time literals at every call site — never user input.
async function runPatchUpdate(
  table: string,
  assignments: Record<string, unknown>,
  id: string,
  userId: string,
  rawClauses: RawClause[] = []
): Promise<Record<string, unknown> | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [column, value] of Object.entries(assignments)) {
    if (value === undefined) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }
  for (const { render, value } of rawClauses) {
    values.push(value);
    setClauses.push(render(`$${values.length}`));
  }

  // Empty patch: nothing to write — read the row so callers still get it back
  if (setClauses.length === 0) {
    const rows = await sql.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [id, userId]);
    const row = (rows as unknown as { rows: unknown[] }).rows?.[0] ?? (rows as unknown[])[0];
    return (row as Record<string, unknown>) ?? null;
  }

  values.push(id);
  const idParam = `$${values.length}`;
  values.push(userId);
  const userParam = `$${values.length}`;

  const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ${idParam} AND user_id = ${userParam} RETURNING *`;
  const rows = await sql.query(query, values);
  const row = (rows as unknown as { rows: unknown[] }).rows?.[0] ?? (rows as unknown[])[0];
  return (row as Record<string, unknown>) ?? null;
}

export async function updateSession(
  id: string,
  userId: string,
  patch: { name?: string; messages?: string; starred?: number; campaign_id?: string | null }
): Promise<ChatSession> {
  const now = Date.now();
  // updated_at tracks session activity, so a campaign-only patch must not bump
  // it — filing a dormant session into a campaign shouldn't make it "recent"
  const touchesContent =
    patch.name !== undefined || patch.messages !== undefined || patch.starred !== undefined;
  // Capture the moment the session first gains messages — campaigns sort by it
  const stampsFirstMessage = patch.messages !== undefined && patch.messages !== '[]';

  const row = await runPatchUpdate(
    'chat_sessions',
    {
      updated_at: touchesContent ? now : undefined,
      name: patch.name,
      messages: patch.messages,
      starred: patch.starred,
      campaign_id: patch.campaign_id,
    },
    id,
    userId,
    stampsFirstMessage
      ? [{ render: (p) => `first_message_at = COALESCE(first_message_at, ${p})`, value: now }]
      : []
  );
  if (!row) throw new Error('Session not found');
  return serializeRow(row as unknown as RawChatSession);
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

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface DbCampaign {
  id: string;
  userId: string;
  name: string;
  lore: string | null;
  createdAt: number;
  updatedAt: number;
}

type RawCampaign = {
  id: string;
  user_id: string;
  name: string;
  lore: string | null;
  created_at: number;
  updated_at: number;
};

function serializeCampaign(row: RawCampaign): DbCampaign {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    lore: row.lore,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCampaigns(userId: string): Promise<DbCampaign[]> {
  const rows = await sql`
    SELECT * FROM campaigns WHERE user_id = ${userId} ORDER BY updated_at DESC
  `;
  return (rows as RawCampaign[]).map(serializeCampaign);
}

export async function getCampaignById(userId: string, id: string): Promise<DbCampaign | null> {
  const rows = await sql`
    SELECT * FROM campaigns WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!(rows as RawCampaign[]).length) return null;
  return serializeCampaign((rows as RawCampaign[])[0]);
}

export async function createCampaign(
  userId: string,
  data: { name: string; lore?: string | null }
): Promise<DbCampaign> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const rows = await sql`
    INSERT INTO campaigns (id, user_id, name, lore, created_at, updated_at)
    VALUES (${id}, ${userId}, ${data.name}, ${data.lore ?? null}, ${now}, ${now})
    RETURNING *
  `;
  return serializeCampaign((rows as RawCampaign[])[0]);
}

// Returns null when the campaign doesn't exist (or isn't the user's) so the
// route can 404; genuine DB failures propagate instead of masquerading as 404s
export async function updateCampaign(
  id: string,
  userId: string,
  patch: { name?: string; lore?: string | null }
): Promise<DbCampaign | null> {
  const row = await runPatchUpdate(
    'campaigns',
    { updated_at: Date.now(), name: patch.name, lore: patch.lore },
    id,
    userId
  );
  return row ? serializeCampaign(row as unknown as RawCampaign) : null;
}

export async function deleteCampaign(id: string, userId: string): Promise<void> {
  // Sessions revert to ungrouped via ON DELETE SET NULL on chat_sessions.campaign_id
  await sql`
    DELETE FROM campaigns WHERE id = ${id} AND user_id = ${userId}
  `;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export interface DbCollection {
  id: string;
  userId: string;
  name: string;
  terrain: string | null;
  setting: string | null;
  ambiance: string | null;
  visualDetails: string | null;
  createdAt: number;
  updatedAt: number;
}

type RawCollection = {
  id: string;
  user_id: string;
  name: string;
  terrain: string | null;
  setting: string | null;
  ambiance: string | null;
  visual_details: string | null;
  created_at: number;
  updated_at: number;
};

function serializeCollection(row: RawCollection): DbCollection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    terrain: row.terrain,
    setting: row.setting,
    ambiance: row.ambiance,
    visualDetails: row.visual_details,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCollections(userId: string): Promise<DbCollection[]> {
  const rows = await sql`
    SELECT * FROM collections WHERE user_id = ${userId} ORDER BY updated_at DESC
  `;
  return (rows as RawCollection[]).map(serializeCollection);
}

export async function listCollectionsBySession(userId: string, sessionId: string): Promise<DbCollection[]> {
  const rows = await sql`
    SELECT c.* FROM collections c
    JOIN collection_sessions cs ON cs.collection_id = c.id
    WHERE c.user_id = ${userId} AND cs.session_id = ${sessionId}
    ORDER BY c.updated_at DESC
  `;
  return (rows as RawCollection[]).map(serializeCollection);
}

export async function getCollectionsForUser(userId: string, excludeSessionId: string): Promise<DbCollection[]> {
  const rows = await sql`
    SELECT c.* FROM collections c
    WHERE c.user_id = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM collection_sessions cs
        WHERE cs.collection_id = c.id AND cs.session_id = ${excludeSessionId}
      )
    ORDER BY c.updated_at DESC
  `;
  return (rows as RawCollection[]).map(serializeCollection);
}

export async function getCollectionById(userId: string, id: string): Promise<DbCollection | null> {
  const rows = await sql`
    SELECT * FROM collections WHERE id = ${id} AND user_id = ${userId}
  `;
  if (!(rows as RawCollection[]).length) return null;
  return serializeCollection((rows as RawCollection[])[0]);
}

export async function createCollection(
  userId: string,
  data: { name: string; terrain?: string; setting?: string; ambiance?: string; visualDetails?: string }
): Promise<DbCollection> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const rows = await sql`
    INSERT INTO collections (id, user_id, name, terrain, setting, ambiance, visual_details, created_at, updated_at)
    VALUES (
      ${id},
      ${userId},
      ${data.name},
      ${data.terrain ?? null},
      ${data.setting ?? null},
      ${data.ambiance ?? null},
      ${data.visualDetails ?? null},
      ${now},
      ${now}
    )
    RETURNING *
  `;
  return serializeCollection((rows as RawCollection[])[0]);
}

export async function updateCollection(
  id: string,
  userId: string,
  patch: { name?: string; terrain?: string; setting?: string; ambiance?: string; visualDetails?: string }
): Promise<DbCollection> {
  const row = await runPatchUpdate(
    'collections',
    {
      updated_at: Date.now(),
      name: patch.name,
      terrain: patch.terrain,
      setting: patch.setting,
      ambiance: patch.ambiance,
      visual_details: patch.visualDetails,
    },
    id,
    userId
  );
  if (!row) throw new Error('Collection not found');
  return serializeCollection(row as unknown as RawCollection);
}

export async function deleteCollection(id: string, userId: string): Promise<void> {
  await sql`
    DELETE FROM collections WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function linkCollectionToSession(collectionId: string, sessionId: string): Promise<void> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await sql`
    INSERT INTO collection_sessions (id, collection_id, session_id, created_at)
    VALUES (${id}, ${collectionId}, ${sessionId}, ${now})
    ON CONFLICT (collection_id, session_id) DO NOTHING
  `;
}

export async function deleteCollectionSessionLink(collectionId: string, sessionId: string): Promise<void> {
  await sql`
    DELETE FROM collection_sessions
    WHERE collection_id = ${collectionId} AND session_id = ${sessionId}
  `;
}

export async function getSessionIdsForCollection(collectionId: string): Promise<string[]> {
  const rows = await sql`
    SELECT session_id FROM collection_sessions
    WHERE collection_id = ${collectionId} AND session_id IS NOT NULL
  `;
  return (rows as { session_id: string }[]).map((r) => r.session_id);
}

export async function countOtherSessionsForCollection(
  collectionId: string,
  currentSessionId: string
): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM collection_sessions
    WHERE collection_id = ${collectionId}
      AND session_id IS NOT NULL
      AND session_id != ${currentSessionId}
  `;
  return (rows as { count: number }[])[0]?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export interface DbLocation {
  id: string;
  collectionId: string;
  sessionId: string | null;
  name: string;
  createdAt: number;
  updatedAt: number;
}

type RawLocation = {
  id: string;
  collection_id: string;
  session_id: string | null;
  name: string;
  created_at: number;
  updated_at: number;
};

function serializeLocation(row: RawLocation): DbLocation {
  return {
    id: row.id,
    collectionId: row.collection_id,
    sessionId: row.session_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLocations(collectionId: string, sessionId?: string): Promise<DbLocation[]> {
  if (sessionId) {
    const rows = await sql`
      SELECT * FROM locations
      WHERE collection_id = ${collectionId} AND session_id = ${sessionId}
      ORDER BY created_at DESC
    `;
    return (rows as RawLocation[]).map(serializeLocation);
  }
  const rows = await sql`
    SELECT * FROM locations WHERE collection_id = ${collectionId} ORDER BY created_at DESC
  `;
  return (rows as RawLocation[]).map(serializeLocation);
}

export async function createLocation(data: {
  id: string; collectionId: string; sessionId: string | null; name: string;
}): Promise<DbLocation> {
  const now = Date.now();
  const rows = await sql`
    INSERT INTO locations (id, collection_id, session_id, name, created_at, updated_at)
    VALUES (${data.id}, ${data.collectionId}, ${data.sessionId}, ${data.name}, ${now}, ${now})
    RETURNING *
  `;
  return serializeLocation((rows as RawLocation[])[0]);
}

export async function updateLocation(id: string, name: string): Promise<DbLocation | null> {
  const rows = await sql`
    UPDATE locations SET name = ${name}, updated_at = ${Date.now()}
    WHERE id = ${id} RETURNING *
  `;
  if (!(rows as RawLocation[]).length) return null;
  return serializeLocation((rows as RawLocation[])[0]);
}

export async function deleteLocation(id: string): Promise<void> {
  await sql`DELETE FROM locations WHERE id = ${id}`;
}

export async function deleteLocationsByCollectionAndSession(
  collectionId: string,
  sessionId: string
): Promise<string[]> {
  // First collect blob_urls to delete from storage
  const artifacts = await sql`
    SELECT a.blob_url FROM artifacts a
    JOIN locations l ON l.id = a.location_id
    WHERE l.collection_id = ${collectionId} AND l.session_id = ${sessionId}
  `;
  const blobUrls = (artifacts as { blob_url: string }[]).map((a) => a.blob_url);

  // Delete locations (artifacts cascade)
  await sql`
    DELETE FROM locations
    WHERE collection_id = ${collectionId} AND session_id = ${sessionId}
  `;

  return blobUrls;
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export interface DbArtifact {
  id: string;
  locationId: string;
  blobUrl: string;
  prompt: string | null;
  mediaType: string | null;
  parentArtifactId: string | null;
  createdAt: number;
}

type RawArtifact = {
  id: string;
  location_id: string;
  blob_url: string;
  prompt: string | null;
  media_type: string | null;
  parent_artifact_id: string | null;
  created_at: number;
};

function serializeArtifact(row: RawArtifact): DbArtifact {
  return {
    id: row.id,
    locationId: row.location_id,
    blobUrl: row.blob_url,
    prompt: row.prompt,
    mediaType: row.media_type,
    parentArtifactId: row.parent_artifact_id,
    createdAt: row.created_at,
  };
}

export async function createArtifact(
  locationId: string,
  data: { blobUrl: string; prompt?: string; mediaType?: string; parentArtifactId?: string }
): Promise<DbArtifact> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const rows = await sql`
    INSERT INTO artifacts (id, location_id, blob_url, prompt, media_type, parent_artifact_id, created_at)
    VALUES (${id}, ${locationId}, ${data.blobUrl}, ${data.prompt ?? null}, ${data.mediaType ?? null}, ${data.parentArtifactId ?? null}, ${now})
    RETURNING *
  `;
  return serializeArtifact((rows as RawArtifact[])[0]);
}

export async function deleteArtifact(id: string): Promise<void> {
  await sql`DELETE FROM artifacts WHERE id = ${id}`;
}

export interface ArtifactWithContext {
  artifact: DbArtifact;
  location: DbLocation;
  collection: DbCollection;
}

export async function getArtifactWithContext(artifactId: string): Promise<ArtifactWithContext | null> {
  const rows = await sql`
    SELECT
      a.id              AS a_id,
      a.location_id     AS a_location_id,
      a.blob_url        AS a_blob_url,
      a.prompt          AS a_prompt,
      a.media_type      AS a_media_type,
      a.parent_artifact_id AS a_parent_artifact_id,
      a.created_at      AS a_created_at,
      l.id              AS l_id,
      l.collection_id   AS l_collection_id,
      l.session_id      AS l_session_id,
      l.name            AS l_name,
      l.created_at      AS l_created_at,
      l.updated_at      AS l_updated_at,
      c.id              AS c_id,
      c.user_id         AS c_user_id,
      c.name            AS c_name,
      c.terrain         AS c_terrain,
      c.setting         AS c_setting,
      c.ambiance        AS c_ambiance,
      c.visual_details  AS c_visual_details,
      c.created_at      AS c_created_at,
      c.updated_at      AS c_updated_at
    FROM artifacts a
    JOIN locations  l ON l.id = a.location_id
    JOIN collections c ON c.id = l.collection_id
    WHERE a.id = ${artifactId}
    LIMIT 1
  `;
  const list = rows as Record<string, unknown>[];
  if (!list.length) return null;
  const r = list[0];
  return {
    artifact: serializeArtifact({
      id: r.a_id as string,
      location_id: r.a_location_id as string,
      blob_url: r.a_blob_url as string,
      prompt: (r.a_prompt as string | null) ?? null,
      media_type: (r.a_media_type as string | null) ?? null,
      parent_artifact_id: (r.a_parent_artifact_id as string | null) ?? null,
      created_at: r.a_created_at as number,
    }),
    location: serializeLocation({
      id: r.l_id as string,
      collection_id: r.l_collection_id as string,
      session_id: (r.l_session_id as string | null) ?? null,
      name: r.l_name as string,
      created_at: r.l_created_at as number,
      updated_at: r.l_updated_at as number,
    }),
    collection: serializeCollection({
      id: r.c_id as string,
      user_id: r.c_user_id as string,
      name: r.c_name as string,
      terrain: (r.c_terrain as string | null) ?? null,
      setting: (r.c_setting as string | null) ?? null,
      ambiance: (r.c_ambiance as string | null) ?? null,
      visual_details: (r.c_visual_details as string | null) ?? null,
      created_at: r.c_created_at as number,
      updated_at: r.c_updated_at as number,
    }),
  };
}
