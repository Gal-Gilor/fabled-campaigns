# Campaigns

A **Campaign** groups chat sessions and carries one optional free-text **Lore** field that is
injected into the LLM context for every session in the campaign. Sessions may belong to at
most one campaign; membership is optional. Design rationale lives in
`campaigns_feature_plan.md`.

## Data model

```sql
CREATE TABLE campaigns (
  id         TEXT    PRIMARY KEY,
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  lore       TEXT,              -- capped at 20,000 chars by the API
  created_at BIGINT  NOT NULL,
  updated_at BIGINT  NOT NULL
);

ALTER TABLE chat_sessions ADD COLUMN campaign_id TEXT
  REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE chat_sessions ADD COLUMN first_message_at BIGINT;
```

Membership lives only on `chat_sessions.campaign_id` (single source of truth); a campaign's
session list is derived by query. Deleting a campaign never deletes sessions — they revert
to ungrouped via `ON DELETE SET NULL`.

`first_message_at` is set by `updateSession` (`db/index.ts`) the first time a `messages`
patch transitions a session from empty to non-empty (the route rejects non-array payloads so
a bad client can't stamp a wrong timestamp). Sessions created before the column existed are
backfilled to `created_at` by the migration. Sessions inside a campaign are ordered by
`COALESCE(first_message_at, created_at)` — chronological play order. A campaign-only patch
(assign/unassign) deliberately does **not** bump `updated_at`, so filing a dormant session
into a campaign doesn't make it "recent".

The schema is registered in `db/migrate.ts` (after `chat_sessions`, which it ALTERs) and
runs idempotently on every build.

## API

| Route | Method | Behavior |
|---|---|---|
| `/api/campaigns` | GET | User's campaigns (plain list — the sidebar derives per-campaign session grouping client-side from `session.campaign_id`) |
| | POST | Create — `{ name, lore? }` |
| `/api/campaigns/[id]` | PUT | Rename / edit lore — `{ name?, lore? }`; 404 only for a genuinely missing campaign, other failures surface as 500 |
| | DELETE | Delete; member sessions revert to ungrouped |
| `/api/sessions/[id]` | PUT | Extended with `campaignId: string \| null` — assign/unassign, with campaign-ownership check |

Body validation for the two campaign routes is shared (`app/lib/campaigns.ts`), so the
name/lore rules can't drift between POST and PUT.

## Lore → LLM context

The chat route's single pre-stream query is `getSessionChatContext` (`db/index.ts`): a
lightweight projection of `summary` + campaign name/lore via `LEFT JOIN campaigns` — zero
added round trips, and it does **not** ship the (potentially multi-MB) `messages` JSONB the
route never reads. The join is owner-filtered (`c.user_id = s.user_id`) so a corrupted
`campaign_id` can never inject another user's lore. The DB is authoritative: a session that
joins or leaves a campaign picks up / drops the lore on its next message automatically.

Injection happens in `createRootAgent` (`app/lib/agents.ts`): a `## Campaign Lore` block is
appended to the system instructions *before* the per-session collection block, keeping the
static prefix byte-identical across a session's requests so Gemini implicit prefix caching
applies. `buildCampaignContext` is the composable seam where the phase-2 campaign chronicle
will be appended.

`prepareContext` reserves the *built campaign block's* character length (the route calls
`buildCampaignContext` and passes its `.length`) on top of `TOKEN_OVERHEAD_RESERVE_CHARS`,
so the reserve tracks exactly what is injected — including the phase-2 chronicle when it
lands — and long lore cannot push the conversation past the eviction threshold.

## Frontend

- `AppShell` (`app/components/app-shell.tsx`) owns `campaigns` state and `campaignActions`
  (create / update / delete / assign), all optimistic with rollback on failure; exposed via
  `SessionContext`.
- The sidebar (`app/components/sidebar.tsx`) renders a **Campaigns** section above "Recent
  sessions": collapsed-by-default groups (state persisted in `localStorage`, active
  session's campaign auto-expands), sessions numbered in play order, a campaign ··· menu
  (Rename / Edit lore… / Delete), and a header `+` that opens the campaign modal.
- Drag & drop is native HTML5: session rows are draggable; campaign headers (expanded or
  collapsed) are drop targets. The session ··· menu's "Move to …" / "Remove from campaign"
  items are the touch and accessibility fallback.
- Recent sessions keep showing all sessions (top 5 by recency) with a small abbreviated
  campaign badge.
- `CampaignEditModal` / `CampaignPromptModal` (`app/components/campaign-modal.tsx`): the
  former is create/edit with a lore character counter; the latter appears after creating a
  new session when at least one campaign exists ("Add this session to a campaign?") — the
  session is created and active immediately, so the prompt adds no creation latency.
