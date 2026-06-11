# Campaigns Feature — Design & Implementation Plan

A **Campaign** groups chat sessions the way a Collection groups images. Each campaign has a
name and one optional free-text **Lore** field that steers the LLM for every session in the
campaign. Sessions may belong to at most one campaign, and membership is optional.

This plan is grounded in the current codebase (Next.js 16 / React 19, Neon Postgres via
`@neondatabase/serverless`, Gemini 2.5 Flash through `@ai-sdk/google-vertex`, idempotent
migrations run on every build via `tsx db/migrate.ts`).

---

## 1. Data Model

### New `campaigns` table — `db/schema/campaigns.ts`

```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  lore       TEXT,                -- optional free-text, capped at 20,000 chars in the API
  created_at BIGINT  NOT NULL,
  updated_at BIGINT  NOT NULL
);
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
```

### Changes to `chat_sessions` — appended to `db/schema/chat_sessions.ts`

```sql
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS campaign_id TEXT
  REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS first_message_at BIGINT;
CREATE INDEX IF NOT EXISTS chat_sessions_campaign_id_idx ON chat_sessions(campaign_id);
```

Register `campaignsSchema` in `db/migrate.ts` **before** the `chat_sessions` ALTERs (the FK
needs the table to exist). Because migrations run on every build and use
`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, this is deploy-safe with zero downtime.

### Design decisions (and one deliberate deviation from the brief)

**Membership lives only on the session row.** The brief suggested the campaign record be
"dynamically updated with which session IDs exist in it." Storing a session-ID list on the
campaign row would duplicate state that the `campaign_id` FK already expresses, and the two
copies would drift under concurrent writes. Instead, `campaign_id` on `chat_sessions` is the
single source of truth and a campaign's session list is *derived* by query
(`WHERE campaign_id = $1`), which the index makes O(log n). The API still returns campaigns
with their session IDs — they're just computed, not stored.

**One-to-many, not a junction table.** Collections use a `collection_sessions` junction
because a collection can be shared across sessions *and* a session can show several
collections. Campaigns are explicitly "a session belongs to at most one campaign," so a
nullable FK is simpler, faster (one fewer join), and makes "no campaign" the natural default.

**`ON DELETE SET NULL`** — deleting a campaign must never destroy play history. Sessions
revert to ungrouped. The UI confirms deletion with copy that says exactly this.

**`first_message_at` for chronological ordering.** Messages are stored as a JSONB
`UIMessage[]` blob with no reliable per-message timestamps, so sorting "by the date of the
first message" requires capturing that moment explicitly. `updateSession` in `db/index.ts`
sets `first_message_at = Date.now()` the first time a `messages` patch transitions the
session from empty to non-empty (guard: `first_message_at IS NULL AND messages != '[]'` —
idempotent, no backfill job needed). Within a campaign, sessions are ordered by
`COALESCE(first_message_at, created_at) ASC`, so pre-existing and still-empty sessions sort
sensibly too.

---

## 2. API Surface

Follows the existing conventions exactly: `auth()` guard returning 401, `userId` scoping on
every query, `NextResponse.json` shapes.

| Route | Method | Behavior |
|---|---|---|
| `app/api/campaigns/route.ts` | GET | List the user's campaigns, each with `sessionIds` (derived) — single query with `LEFT JOIN chat_sessions` + `array_agg`, ordered by `updated_at DESC` |
| | POST | Create. Body `{ name, lore? }` |
| `app/api/campaigns/[id]/route.ts` | PUT | Rename / edit lore. Body `{ name?, lore? }` (partial patch, same pattern as `updateCollection`) |
| | DELETE | Delete campaign; sessions revert via `ON DELETE SET NULL` |
| `app/api/sessions/[id]/route.ts` | PUT | **Extend existing patch** with `campaignId?: string \| null` — `null` removes the session from its campaign. Validate the campaign belongs to the user before assigning |

Assign/unassign rides the existing session PUT rather than a new sub-route: it matches the
"patch a session field" pattern already used for `name`/`starred`/`messages`, and drag-drop,
the new-session prompt, and "remove from campaign" all become the same one-line call.

`GET /api/sessions` needs no change — once `campaign_id` is on the row (add it to the
`ChatSession` interface and `serializeRow` in `db/index.ts`), the sidebar can group sessions
client-side from the two lists it already fetches in parallel. No extra round trips.

New DB functions in `db/index.ts`: `listCampaignsWithSessionIds`, `createCampaign`,
`getCampaignById`, `updateCampaign`, `deleteCampaign`, and `setSessionCampaign(sessionId,
userId, campaignId | null)`. Plus the `first_message_at` guard inside `updateSession`.

---

## 3. Lore → LLM Context (the latency-critical part)

### Where lore enters the prompt

`createRootAgent` (`app/lib/agents.ts`) already concatenates an "Active Collection" block
into the agent `instructions`. Lore goes in the same place, but **ordered for cache
stability**: `GM_SYSTEM_PROMPT` + `## Campaign Lore` block (static per campaign) first, then
the per-session collection block (changes more often) last. Example block:

```
## Campaign Lore
This session is part of the campaign "<name>". The following lore is canon.
Keep all narration, NPCs, and plot developments consistent with it:

<lore text>
```

### Where lore is loaded — zero added round trips

Do **not** have the client send lore in the request body (the way `activeCollection` is sent
today): it bloats every POST, and a stale client could replay removed lore. Instead, the chat
route already calls `getSession(sessionId, userId)` before streaming — extend that one query
with a join:

```sql
SELECT s.*, c.name AS campaign_name, c.lore AS campaign_lore
FROM chat_sessions s
LEFT JOIN campaigns c ON c.id = s.campaign_id
WHERE s.id = $1 AND s.user_id = $2
```

Same single DB round trip the route makes now, so **time-to-first-token is unchanged**. The
DB is authoritative: the moment a session joins a campaign, its next message carries the
lore; the moment it leaves, lore vanishes from the next request's context.

### How the "cache append / cache removal" requirement is actually satisfied

The model context is rebuilt from scratch on every request (this app keeps no server-side
conversation state between turns), so the brief's two rules fall out automatically:

- *"Append on the first message after the session was added"* — the first POST after
  assignment joins to the campaign row and the lore lands in `instructions`. Nothing to
  schedule.
- *"Remove the cache when the session is removed"* — the next POST joins to `NULL` and the
  lore block is simply absent. With implicit caching (below) there is no server-side cache
  object to delete; stale provider-side cache entries expire on their own and can never be
  *injected* because the prompt no longer contains the lore.

### Provider-side caching strategy

**v1: rely on Gemini implicit caching (no code, no infrastructure).** Gemini 2.5 models
apply implicit context caching automatically when consecutive requests share an identical
prompt *prefix* (minimum ~1k tokens for 2.5 Flash), discounting the cached input tokens. Our
prompt prefix — system instructions + lore + (per the existing pipeline) the session-memory
block — is byte-stable across the turns of a session, which is exactly the hit pattern
implicit caching rewards. The only engineering requirement is **keep static content first
and byte-identical between requests**, which the instruction ordering above guarantees.

**Defer explicit caching (`cachedContent`) unless lore gets large.** The installed
`@ai-sdk/google-vertex` supports passing a pre-created cached-content resource via provider
options, but explicit caching brings real costs: a cache-creation call, per-hour storage
billing, TTL management, an invalidation hook on every lore edit / campaign unassign, and a
DB table to track cache handles. For a lore field of a few KB the savings over implicit
caching are negligible. Revisit only if telemetry shows lore routinely above ~4k tokens
across high-traffic campaigns; the seam is isolated (model construction in
`agents.ts`/`vertexClient.ts`), so it can be added later without touching anything else.

### Token-budget interaction

`prepareContext` reserves `TOKEN_OVERHEAD_RESERVE_CHARS` (15,000 chars) for system prompt +
tool schemas. A 20,000-char lore cap can exceed that reserve, so make the reserve dynamic:
pass `loreChars` into `prepareContext` and reserve `TOKEN_OVERHEAD_RESERVE_CHARS +
loreChars`. This keeps long-lore campaigns from blowing past the eviction threshold. The API
enforces the 20k cap on write; the campaign editor shows a character counter.

---

## 4. Frontend

No new dependencies except optionally a DnD library (see below). Reuses the existing
patterns: prop-driven `Sidebar`, handler registration through `SessionContext`, modal style
from `wiki-modal.tsx`, Tailwind v4 + CSS-variable palette.

### State (`session-context.tsx` + `chat.tsx`)

- Add `campaigns: Campaign[]` (`{ id, name, lore, sessionIds, createdAt, updatedAt }`) to
  the context; fetch `/api/campaigns` in parallel with the existing `/api/sessions` load.
- Extend `SessionHandlers` with `onCreateCampaign`, `onRenameCampaign`, `onUpdateLore`,
  `onDeleteCampaign`, `onAssignSession(sessionId, campaignId | null)`.
- All mutations are **optimistic** (update local state, fire the request, roll back on
  error) — same feel as the existing star/rename flows, no perceptible latency.

### Sidebar (`sidebar.tsx`)

- New **Campaigns** section above "Recent sessions": collapsible row per campaign
  (name, session count, chevron). Expanding lists its sessions ordered by
  `COALESCE(first_message_at, created_at)` ascending — chronological play order.
- Campaign row context menu (same dropdown pattern as `SessionRow`): Rename (inline edit),
  Edit lore… (opens modal), Delete (confirm modal: "Sessions in this campaign will be kept
  and moved out of the campaign").
- "Recent sessions" continues to show *all* sessions by recency (a session inside a campaign
  is still recent); sessions with a campaign get a small badge. Session context menu gains
  "Move to campaign…" / "Remove from campaign".

### Drag and drop

No DnD library is installed. Recommended: **native HTML5 drag events for v1** —
`draggable` on `SessionRow`, drop targets + hover highlight on campaign rows, drop calls
`onAssignSession`. It's a single straight-line interaction (drag a row onto a group header),
which native DnD handles fine with zero bundle cost. Native DnD does not work on touch, so
the "Move to campaign…" context-menu item is the required fallback (and doubles as the
accessible path). If richer interactions arrive later (reordering, multi-select),
swap in `@dnd-kit` — the drop handler contract stays the same.

### New-session campaign prompt

In the `handleNewSession` flow in `chat.tsx`: if `campaigns.length > 0`, show a small modal
(wiki-modal pattern) — "Add this session to a campaign?" — listing campaigns plus a
prominent **"No campaign"** skip; Escape also skips. To keep the flow snappy, **create the
session immediately and navigate**, showing the prompt over the fresh chat; choosing a
campaign fires the assignment PATCH in the background. Session creation latency is unchanged
and a dismissed prompt costs nothing. Users with zero campaigns never see the modal.

### Campaign create/edit modal

One modal, two modes (create / edit): name input + lore textarea with live character
counter (20k cap) and helper text "Lore is given to the AI for every session in this
campaign." Lore edits take effect on each session's next message automatically (per-request
context assembly — no cache to bust in v1).

---

## 5. Gaps the brief didn't cover (resolved here)

| Gap | Resolution |
|---|---|
| Message timestamps don't exist in the stored `UIMessage[]` | New `first_message_at` column captured at persist time; `COALESCE` fallback to `created_at` |
| What happens to sessions when a campaign is deleted | Kept, reverted to ungrouped (`ON DELETE SET NULL`), confirm dialog says so |
| Stale lore if client supplies it (existing `activeCollection` pattern) | Lore is fetched server-side via join in the chat route — DB is authoritative |
| Lore size vs. context window | 20k-char API cap + dynamic overhead reserve in `prepareContext` |
| Touch devices can't use HTML5 drag | "Move to campaign…" context-menu fallback |
| Guest (unauthenticated) users | Sessions are already auth-only; campaigns are too. No guest path needed |
| Cross-user access | Every campaign query scoped by `user_id`; assignment PATCH verifies campaign ownership |
| Docs drift | `docs/session_management.md` still describes the old SQLite layout — update alongside this work |

## 6. Out of scope for v1 (deliberately)

- Explicit `cachedContent` pipeline (revisit with telemetry; seam already isolated).
- Structured lore fields, lore versioning, per-session lore overrides.
- Campaign-level memory (merging session summaries across a campaign) — natural follow-up:
  the `SessionMemory` blocks of sibling sessions could seed a campaign chronicle.
- Reordering sessions manually within a campaign (chronological order is the spec).

## 7. Implementation order

1. **Schema + DB layer** — `db/schema/campaigns.ts`, `chat_sessions` ALTERs, migrate.ts
   registration, `db/index.ts` functions, `first_message_at` guard in `updateSession`.
2. **API routes** — `/api/campaigns`, `/api/campaigns/[id]`, extend `/api/sessions/[id]` PUT.
3. **Lore in context** — join in `getSession`, lore block in `createRootAgent`
   (cache-stable ordering), dynamic reserve in `prepareContext`.
4. **Frontend state** — context extension, parallel fetch, optimistic handlers.
5. **Sidebar UI** — campaigns section, context menus, modals, new-session prompt.
6. **Drag and drop** — native DnD + menu fallback.
7. **Docs** — update `session_management.md`, add a short `campaigns.md`.

Steps 1–3 ship the backend completely and are independently testable via curl; 4–6 are
pure-frontend and can land incrementally behind the absence of campaigns (empty state shows
nothing new).
