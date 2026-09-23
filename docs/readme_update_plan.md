# README Update Plan

The current `README.md` describes the pre-Next.js version of the project: a static HTML frontend
plus Vercel serverless functions under `api/maps/`. That code now lives in `archive/` and is no
longer deployed. The live app is a Next.js 16 App Router project with a Gemini chat agent,
Google sign-in, Neon Postgres, Vercel Blob storage, campaigns, collections, and an SRD wiki.
Almost every section of the README is wrong or incomplete.

This plan lists what is wrong, what replaces it, and the exact source of truth for each fact so
the rewrite can be checked line by line.

## 1. Inventory of outdated content

| README section | Current claim | What the code says | Action |
|---|---|---|---|
| Badges | Node `>=18.0.0` | `next@16.1.6` requires Node `>=20.9.0` (`package-lock.json`) | Change badge to `>=20.9` |
| Badges | Only Vercel and Google Cloud | Neon and Vercel Blob are core dependencies | Add Next.js and Neon badges (optional) |
| Intro | "Currently featuring Gemini-powered battle map generation, with campaign writing assistance in development" | Chat-based campaign assistant is live (`app/api/chat/route.ts`, `app/lib/agents.ts`) | Rewrite |
| Why This Project Matters | "Campaign writing assistance (coming soon)" | Campaigns with lore shipped (`docs/campaigns.md`) | Rewrite or remove |
| Current Features | Form-based generator with terrain/setting dropdowns, "Generation Modes", gallery filtering, "Roll to Quest" button | Maps are requested in chat; the agent calls `mapAgent` (Imagen) or `editEncounterMap` (Gemini image). The form UI is in `archive/frontend/` | Rewrite |
| Current Features | "Leverages Google's Imagen 3.0" only | Three models: `gemini-2.5-flash` (chat, prompt expansion, summaries), `imagen-3.0-generate-002` (new maps), `gemini-2.5-flash-image` (map edits) (`app/lib/config.ts`) | Rewrite |
| Coming Soon | Campaign writing assistant, NPC generator, magic item generator | Campaigns shipped. Magic items exist as an SRD wiki, not a generator. `generateCharacter`, `createCampaign`, `lookupSRD` are stubs (`app/lib/tools.ts`) | Rewrite as a short roadmap tied to the stubs |
| Setup: Prerequisites | Node 18+, GCP, Vercel | Also needs a Neon database, a Vercel Blob store, and a Google OAuth client | Rewrite |
| Setup: Environment Variables | Only `GOOGLE_*` and `NODE_ENV`, file named `.env` | App also reads `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`. The `db:*` scripts load `.env.local` | Rewrite |
| Setup: Start Dev Server | `npm start` or `npm run serve` | `serve` does not exist. Dev is `npm run dev`; `npm start` runs a production build | Fix |
| Setup: Database | Missing | `npm run db:migrate`, `npm run db:reset`; migrations also run in `npm run build` | Add |
| Vercel Deployment | Only `GOOGLE_*` vars | Build runs `tsx db/migrate.ts` against `DATABASE_URL_UNPOOLED`; Neon and Blob integrations inject their own vars | Rewrite |
| API Documentation | `POST /api/maps/generateMap` returning a base64 data URL | Endpoint does not exist. Actual routes are under `app/api/` (see section 4). Images are stored in Vercel Blob and returned as public URLs | Replace |
| Security Features | "5 requests per 15 minutes per IP", CORS middleware, input validation middleware | Those lived in `archive/backend/lib/middleware/`. Current app has Auth.js session checks, per-user row filtering, lore length cap. No rate limiter exists | Rewrite to match current code only |
| Usage | Fill form, click "Roll to Quest", browse gallery | Sign in with Google, chat, collections panel, campaigns sidebar, wiki | Rewrite |
| Troubleshooting | Rate limiting advice, Imagen region | Rate limiting advice is obsolete. Add DB, Blob, and OAuth failure modes | Rewrite |
| Contributing | Generic 5 steps | No lint or test scripts exist in `package.json` | Keep short; state that `npm run build` is the only check |
| License | "Copyright 2025" | Matches `LICENSE` file | Verify year against `LICENSE`, keep |
| Acknowledgments | Imagen, Vercel | Add Neon, Vercel Blob, Auth.js, Vercel AI SDK, D&D 5e SRD (source of wiki data) | Update |

## 2. Target README structure

Keep it in this order. Each heading below maps to a section in the new file.

1. Title, tagline, badges, link to fabledcampaigns.com
2. What it is (2 to 3 sentences)
3. Features
4. Tech stack
5. Architecture
6. Project structure
7. Getting started (local development)
8. Environment variables
9. Database
10. Deployment (Vercel + Neon + Blob)
11. API reference
12. Security notes
13. Troubleshooting
14. Further documentation (links to `docs/`)
15. Contributing
16. License
17. Acknowledgments

Drop "Why This Project Matters" and "Coming Soon" as standalone sections. Fold a one-line
roadmap into Features if needed.

## 3. Section-by-section content

### 3.1 Title and intro

- Keep the name, tagline ("Where Every Tale Rolls a Natural 20"), and site link.
- Replace the intro with the product description already used in `app/layout.tsx` metadata:
  an AI Dungeon Master assistant for managing sessions, homebrew campaigns, and encounter maps
  through a chat interface.
- Badges: Vercel (keep), License (keep), Node `>=20.9` (fix), Google Cloud Vertex AI (keep).
  Optional: Next.js 16, Neon.

### 3.2 Features

One short paragraph or 3 to 6 bullets per feature. Source files in parentheses are for the
writer's verification, not for the README.

- Chat assistant. Streams replies from a Gemini tool-loop agent that acts as a D&D 5e Dungeon
  Master (`app/lib/agents.ts`, `app/lib/prompts.ts`). Guests can chat without signing in;
  sessions are only saved for signed-in users (`app/components/chat.tsx`, `proxy.ts`).
- Encounter map generation. When a request names a location type and a mood, the agent calls
  `mapAgent`: Gemini writes a scene narrative, expands it into an image prompt, and Imagen 3
  renders a 4:3 top-down battle map with a negative prompt that blocks people, text, and
  side views (`app/lib/mapTools.ts`, `app/lib/mapPrompts.ts`). If the request is thin, the
  agent asks one question with a generated example.
- Map editing. "Add a campfire", "make it night" and similar requests go to
  `editEncounterMap`, which sends the source image to `gemini-2.5-flash-image` and stores the
  result as a new version linked to the original (`app/lib/imageEditTools.ts`,
  `artifacts.parent_artifact_id`).
- Collections. Saved visual themes (terrain, setting, ambiance preset, free-text visual
  details) applied to every map generated while the collection is active. List the eight
  ambiance presets from `app/lib/collections.ts`. Maps are grouped as locations under a
  collection and can be downloaded as PNG.
- Sessions. Rename, star, delete; full history stored per user; a sessions page at
  `/chat/sessions`.
- Campaigns. Group sessions, drag and drop sessions onto a campaign, sessions numbered in play
  order, optional lore (max 20,000 characters, `CAMPAIGN_LORE_MAX_CHARS`) injected into the
  agent's system prompt for every session in the campaign (`docs/campaigns.md`).
- Long-conversation memory. When history approaches about 180k tokens, older messages are
  summarized into a structured session memory stored in the DB (`app/lib/contextManager.ts`,
  `docs/session_management.md`).
- SRD Wiki. Public, statically rendered pages at `/wiki/monsters` and `/wiki/magic-items`
  with filters (CR, rarity, type) and detail pages per slug, also openable in a modal inside
  the app (`app/wiki/`, `app/components/wiki-modal.tsx`). Data ships as JSON in `data/`.
  Current counts: 270 magic items, 1 monster (Goblin). State the counts or say "sample
  monster data" so the README does not overpromise.
- SEO. Sitemap covering wiki pages (`app/sitemap.ts`), `robots.txt`, Open Graph image
  (`app/opengraph-image.tsx`). One line is enough.
- Roadmap. The agent exposes `generateCharacter`, `createCampaign`, and `lookupSRD` tools
  that currently return stub text (`app/lib/tools.ts`). A "Campaign Chronicle" is designed in
  `docs/campaigns_feature_plan.md` section 3. Mention these in one or two lines, without
  dates.

### 3.3 Tech stack

A table with layer, technology, and where it is used:

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Google Fonts Cinzel and Roboto via `next/font` |
| AI | Vercel AI SDK 6 (`ai`, `@ai-sdk/react`, `@ai-sdk/google-vertex`) on Google Vertex AI |
| Models | `gemini-2.5-flash`, `imagen-3.0-generate-002`, `gemini-2.5-flash-image` |
| Auth | Auth.js (`next-auth` v5 beta) with Google provider and `@auth/pg-adapter` |
| Database | Neon serverless Postgres (`@neondatabase/serverless`) |
| File storage | Vercel Blob (`@vercel/blob`) for generated map images |
| Markdown | `react-markdown` + `remark-gfm` for chat and wiki bodies |
| Hosting | Vercel |

Note: `@ai-sdk/google` is in `package.json` but not imported anywhere. Do not list it, or flag
it separately as a cleanup item (see section 6).

### 3.4 Architecture

Add a short text description plus one Mermaid diagram (GitHub renders Mermaid). Content:

```
Browser (Next.js client, useChat)
  -> POST /api/chat (Vercel Function, maxDuration 60s)
       -> Auth.js session lookup (Neon, DATABASE_URL_UNPOOLED via pg-adapter)
       -> getSessionChatContext: summary + campaign lore in one query (Neon HTTP, DATABASE_URL)
       -> prepareContext: token window, tool-output pruning, summarization (Gemini)
       -> ToolLoopAgent (gemini-2.5-flash)
            -> mapAgent: narrative + prompt expansion (Gemini) -> Imagen 3
            -> editEncounterMap: Gemini image model with source image
            -> image bytes -> Vercel Blob (public URL) -> locations/artifacts rows in Neon
  <- streamed UI messages
Client persists messages via PUT /api/sessions/[id]
```

Points the text must state explicitly:

- Neon is used in two ways. `db/client.ts` uses the HTTP driver `neon(DATABASE_URL)` for all
  app queries. `auth.ts` and `db/migrate.ts` use a `Pool` over `DATABASE_URL_UNPOOLED`
  (Auth.js adapter and multi-statement migrations need a real connection).
- Vercel Blob holds every generated and edited map. Paths are
  `maps/<collectionId>/<locationId>/<timestamp>-<name>.png` when a collection is active, else
  `maps/<timestamp>-<name>.png`. Blobs are uploaded with `access: 'public'`. The Neon
  `artifacts.blob_url` column stores the URL.
- Blob cleanup. Deleting an artifact (`DELETE /api/artifacts/[id]`) or a collection
  (`DELETE /api/collections/[id]`) calls `del()` on the related blob URLs before removing
  rows. Maps generated with no active collection get no DB row, so they are not cleaned up
  (state this as a known limitation, since it is visible in `saveMapArtifact`).
- `proxy.ts` (Next.js 16 name for middleware) runs Auth.js on every route except `auth`,
  `api/auth`, `_next`, and `favicon`. The `authorized` callback returns `true`, so it does not
  block guests; API routes enforce auth themselves.

### 3.5 Project structure

A trimmed tree with one-line comments. Only top-level folders and key files:

```
app/
  api/            Route handlers (chat, sessions, campaigns, collections, locations, artifacts, auth)
  auth/sign-in/   Google sign-in page
  chat/           Authenticated app shell and chat UI
  components/     Chat, sidebar, modals, wiki components
  lib/            Agent, tools, prompts, context manager, Vertex client, config
  wiki/           Public SRD wiki pages
db/
  client.ts       Neon HTTP client
  index.ts        Query functions
  migrate.ts      Idempotent schema migration
  schema/         SQL for auth, chat_sessions, campaigns, collections
data/             SRD monsters and magic items JSON
docs/             Design notes (campaigns, session management)
types/            Wiki and next-auth type declarations
auth.ts           Auth.js config
proxy.ts          Route proxy (auth session)
archive/          Legacy static site and serverless API, not deployed
```

Add one sentence that `archive/` is the previous version and is kept for reference only.

### 3.6 Getting started (local development)

Exact steps:

1. Prerequisites: Node.js 20.9+, npm, a Google Cloud project with Vertex AI enabled, a Neon
   database, a Vercel Blob store, a Google OAuth client.
2. `git clone https://github.com/Gal-Gilor/fabled-campaigns.git && cd fabled-campaigns`
3. `npm install`
4. Create `.env.local` (not `.env`). The `db:migrate` and `db:reset` scripts pass
   `--env-file=.env.local`, and Next.js also loads it. `.gitignore` already excludes
   `.env*.local`.
5. `npm run db:migrate`
6. `npm run dev` and open `http://localhost:3000`.

Keep the existing Google Cloud service account steps (project, enable `aiplatform.googleapis.com`,
service account with `roles/aiplatform.user`, key file). They are still accurate for
`app/lib/vertexClient.ts`.

Add new sub-steps:

- Google OAuth client: create an OAuth 2.0 Client ID (Web application) in Google Cloud
  Console, authorized redirect URI `http://localhost:3000/api/auth/callback/google` for local
  and `https://<domain>/api/auth/callback/google` for production.
- Neon: create a project, copy the pooled connection string to `DATABASE_URL` and the direct
  (unpooled) string to `DATABASE_URL_UNPOOLED`. If the Neon integration is installed from the
  Vercel Marketplace, `vercel env pull .env.local` fetches both.
- Vercel Blob: create a Blob store on the Vercel project, connect it, and pull
  `BLOB_READ_WRITE_TOKEN` with `vercel env pull .env.local`.
- Auth secret: `npx auth secret` (writes `AUTH_SECRET` to `.env.local`).

### 3.7 Environment variables

Replace the old block with a table. Mark which ones are read explicitly in code and which are
read implicitly by a library, so a reader can grep for them.

| Variable | Required | Read by | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | `db/client.ts` | Neon pooled connection string for app queries (HTTP driver) |
| `DATABASE_URL_UNPOOLED` | Yes | `auth.ts`, `db/migrate.ts` | Neon direct connection for Auth.js adapter and migrations |
| `BLOB_READ_WRITE_TOKEN` | Yes | `@vercel/blob` (implicit) | Upload and delete map images |
| `AUTH_SECRET` | Yes | `next-auth` (implicit) | Signs and encrypts session tokens |
| `AUTH_GOOGLE_ID` | Yes | `next-auth` Google provider (implicit) | OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | `next-auth` Google provider (implicit) | OAuth client secret |
| `GOOGLE_CLOUD_PROJECT` | Yes | `app/lib/vertexClient.ts` | Vertex AI project |
| `GOOGLE_CLOUD_LOCATION` | No (default `us-central1`) | `app/lib/vertexClient.ts` | Vertex AI region |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Production | `app/lib/vertexClient.ts` | Base64 service account JSON |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local alternative | Google auth library (implicit) | Path to service account JSON. Deleted at runtime when `GOOGLE_SERVICE_ACCOUNT_KEY` is set |
| `AUTH_URL` / `AUTH_TRUST_HOST` | Only outside Vercel | `next-auth` (implicit) | Needed when self-hosting behind a proxy |

Remove `NODE_ENV` from the list; Next.js sets it.

Before publishing, confirm the variable names for Neon against the Vercel project's settings.
The Neon Marketplace integration creates `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (plus
`PG*` and `POSTGRES_*` variants that the code does not read).

### 3.8 Database

- Tables and their owners, one line each: `users`, `accounts`, `sessions`,
  `verification_tokens` (Auth.js); `chat_sessions`; `campaigns`; `collections`,
  `collection_sessions`, `locations`, `artifacts`.
- A small ER sketch or relationship list:
  `users 1-n chat_sessions`, `users 1-n campaigns`, `campaigns 1-n chat_sessions`
  (`ON DELETE SET NULL`), `users 1-n collections`, `collections n-n chat_sessions` via
  `collection_sessions`, `collections 1-n locations 1-n artifacts`,
  `artifacts.parent_artifact_id` for edit lineage.
- Migrations are plain SQL strings in `db/schema/*.ts`, all `IF NOT EXISTS` / `ADD COLUMN IF
  NOT EXISTS`, run in order by `db/migrate.ts`: auth, chat_sessions, campaigns, collections.
- `npm run build` runs the migration before `next build`, so every Vercel build (including
  previews) migrates the database it is pointed at.
- `npm run db:reset` drops only `artifacts`, `locations`, `collection_sessions`,
  `collections`, then re-runs the migration. It does not delete the Blob files those rows
  pointed to. State this plainly.
- Link to `docs/campaigns_feature_plan.md` section 7 for the preview-branch caveat (previews
  sharing the production DB migrate production). Suggest Neon branching per preview.

### 3.9 Deployment (Vercel + Neon + Blob)

Replace the current section with:

1. Import the repo into Vercel (framework preset Next.js, `vercel.json` sets it).
2. Add the Neon integration from the Vercel Marketplace and connect it to the project.
3. Create a Blob store under Storage and connect it to the project.
4. Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `GOOGLE_CLOUD_PROJECT`,
   `GOOGLE_CLOUD_LOCATION`, `GOOGLE_SERVICE_ACCOUNT_KEY`.
5. Add the production callback URL to the Google OAuth client.
6. Deploy. The build migrates the database.

Add two operational notes from `docs/campaigns_feature_plan.md` section 7: keep the Vercel
function region and the Neon region close, since each Neon query is an HTTP round trip; the
chat route has `maxDuration = 60`, which bounds map generation time.

Keep `vercel --prod` as the CLI option.

### 3.10 API reference

Replace the single `generateMap` block with a table. All routes except `/api/chat` and
`/api/auth/*` return `401` without a session. `/api/chat` works for guests but skips
persistence.

| Route | Methods | Notes |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Auth.js handlers |
| `/api/chat` | POST | Body `{ messages, sessionId?, activeCollection? }`. Streams UI messages |
| `/api/sessions` | GET, POST | List and create chat sessions |
| `/api/sessions/[id]` | PUT, DELETE | Patch `name`, `messages`, `starred`, `campaignId` |
| `/api/campaigns` | GET, POST | Body `{ name, lore? }` |
| `/api/campaigns/[id]` | PUT, DELETE | Deleting ungroups sessions |
| `/api/collections` | GET, POST | GET needs `?sessionId=` |
| `/api/collections/all` | GET | Needs `?excludeSessionId=` |
| `/api/collections/[id]` | PUT, DELETE | DELETE body `{ sessionId, confirmed? }`. Without `confirmed`, it detaches the collection from that session if other sessions use it, else returns `requires_confirmation`. With `confirmed: true`, it deletes all locations, artifacts, and Blob files |
| `/api/collections/[id]/sessions` | POST | Link a collection to a session |
| `/api/collections/[id]/locations` | GET | Locations for a collection (the client sends `?sessionId=`, the route ignores it) |
| `/api/locations` | POST | Create a location |
| `/api/locations/[id]` | PUT, DELETE | Rename or delete |
| `/api/artifacts` | POST | Register an artifact row for an existing blob URL |
| `/api/artifacts/[id]` | DELETE | Body `{ blobUrl? }`; deletes the blob then the row |

Before publishing, re-read each route file to confirm parameter names. Do not include
request and response JSON samples unless they are copied from real code.

Also document the two agent tools (`mapAgent`, `editEncounterMap`) and their output shape
`{ type: 'image', src, label, collectionId, locationId, artifactId, prompt }`, since that is
what the chat UI renders.

### 3.11 Security notes

Only claims that the current code supports:

- Google sign-in via Auth.js with database sessions stored in Neon.
- Every DB query in `db/index.ts` for sessions, campaigns, and collections filters by
  `user_id`. The lore join is owner-filtered.
- Campaign lore capped at 20,000 characters at the API.
- Service account key read from an env var, never from the repo.
- Blob files are public URLs (anyone with the URL can view a map). State this.

Remove: rate limiting, CORS middleware, and "comprehensive parameter validation" claims.

Open items the maintainer may want to look at before writing security claims (do not put
these in the README, raise them separately): `listLocations`, `updateLocation`,
`deleteLocation`, `deleteArtifact`, `createArtifact`, and `getArtifactWithContext` in `db/index.ts` do not
filter by `user_id`; `DELETE /api/artifacts/[id]` deletes whatever `blobUrl` the client sends.

### 3.12 Troubleshooting

Replace with current failure modes:

- `DATABASE_URL is not set` / `DATABASE_URL_UNPOOLED is not set` at startup or build: thrown
  by `db/client.ts` and `auth.ts`. Check `.env.local` or Vercel env vars.
- Migration fails during `npm run build`: the build depends on the Neon unpooled URL being
  reachable from the build machine.
- Sign-in redirect error (`redirect_uri_mismatch`): callback URL missing from the OAuth client.
- `MissingSecret` from Auth.js: `AUTH_SECRET` unset.
- Map generated but image does not save: `BLOB_READ_WRITE_TOKEN` missing or the Blob store is
  not connected.
- Vertex AI auth errors: keep the existing three bullets (base64 encoding, `roles/aiplatform.user`,
  API enabled). Add the `ENAMETOOLONG` note from `app/lib/vertexClient.ts`.
- Chat request times out: map generation plus editing runs inside the 60 second function
  limit.

### 3.13 Further documentation

Link:

- `docs/campaigns.md` (campaign data model, API, lore injection)
- `docs/campaigns_feature_plan.md` (design rationale, deployment considerations)
- `docs/session_management.md` (context pipeline and session memory). Note that its header
  already warns parts predate the move from SQLite to Neon.

### 3.14 Contributing, License, Acknowledgments

- Contributing: keep it short. There are no test or lint scripts, so the check before a PR is
  `npm run build`. Do not reference `.eslintrc.js` or `.prettierrc`; both target the archived
  code (the ESLint globals list the old frontend functions) and neither is wired into
  `package.json`.
- License: keep text, confirm year and wording against `LICENSE`.
- Acknowledgments: Google Vertex AI (Gemini and Imagen), Vercel (hosting, Blob, AI SDK), Neon,
  Auth.js, D&D 5e SRD for wiki content. Check the SRD version and attribution text required by
  its license (SRD 5.1 is CC-BY-4.0 and requires specific attribution wording) and add it.

## 4. Verification checklist for the rewrite

Each item must pass before the README is merged:

- [ ] Every env var in the README is referenced in code or by a named library. `grep -rn
      "process.env" app db auth.ts proxy.ts` matches the explicit ones.
- [ ] Every npm command in the README exists in `package.json` `scripts`.
- [ ] Every API route in the table exists under `app/api/` with the listed methods.
- [ ] Every model name matches `app/lib/config.ts`.
- [ ] Node version matches `next`'s `engines` in `package-lock.json`.
- [ ] No feature from `archive/` is described as current.
- [ ] Following "Getting started" from a clean clone with a fresh Neon DB and Blob store
      results in a working sign-in, a saved session, and a generated map visible in a
      collection.
- [ ] All internal links (`docs/*.md`, `LICENSE`) resolve on GitHub.
- [ ] Mermaid diagram renders in the GitHub preview.
- [ ] No curly quotes, no emojis.

## 5. Related updates outside README.md

These are small and keep the README honest. Do them in the same PR or a follow-up.

- `.env.example`: rename guidance to `.env.local`; add `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`; drop `NODE_ENV`. The README's env section should point to it.
- `docs/session_management.md`: the schema and file paths still describe SQLite
  (`gm-sessions.db`, `app/lib/db.ts`). Either update or leave the existing warning banner.

## 6. Cleanup items found during review (not README work)

Listed so they are not mistaken for documentation bugs:

- `next.config.ts` lists `better-sqlite3` in `serverExternalPackages`, but the package is not
  installed. Leftover from the SQLite era.
- `@ai-sdk/google` is a dependency with no imports.
- `zod` is imported in `app/lib/agents.ts`, `tools.ts`, `mapTools.ts`, `imageEditTools.ts`,
  `contextManager.ts` but is not a direct dependency; it resolves transitively (4.3.6 in the
  lockfile). Adding it to `dependencies` avoids breakage if the AI SDK stops pulling it.
- `.eslintrc.js` and `.prettierrc` target the archived vanilla JS code.
- `generateMapName` in `app/lib/mapTools.ts` is exported but not wired into the agent.
- `data/monsters.json` has one entry.
