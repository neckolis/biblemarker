# Inductive Bible AI

An expert Bible observation tool for inductive study, built on Cloudflare Workers, React, and Supabase.

**Live Site:** [inductivebible.ai](https://inductivebible.ai)  
**Repo:** https://github.com/neckolis/biblemarker

## Keyboard Shortcuts
- `Cmd/Ctrl+K`: Open command palette
- `V`: Switch to Read Mode
- `R`: Switch to Research/Study Mode
- `A`: Switch to AI Study Mode
- `Cmd/Ctrl+G`: Go to passage
- `Cmd/Ctrl+S`: Save study
- `Esc`: Exit palette / Return to current view

## Features
- **Command Palette**: Raycast-style global search for commands (Mode, Navigation, App).
- **Unified Shortcuts**: Context-aware keyboard shortcuts across all modes.
- **Three Study Modes**:
  - **Read**: Text highlighting, underlining, inductive marking presets
  - **Study**: AI-powered lexicon and Greek/Hebrew tools with Precept Method panel
  - **AI Study**: Perplexity-style chat for inductive Bible study with RAG (Workers AI)
- **Bible Text**: ESV, NASB, NLT, KJV via Bolls.life API (cached at edge).
- **Persistence**: Save studies to Supabase (Postgres with RLS).

## Architecture
- **Monorepo**: pnpm workspace (`apps/web`, `apps/worker`, `packages/shared`).
- **Frontend**: Vite + React + TypeScript + Vanilla CSS.
- **Backend**: Cloudflare Worker (serving API + Static Assets) + Hono router.
- **AI Platform**: Workers AI (LLM + Embeddings), Vectorize (RAG), D1 (chat persistence).
- **Database**: Supabase (Postgres + Auth) + D1 (AI conversations).

## Setup & Development

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Supabase**:
   - Create a project at [supabase.com](https://supabase.com)
   - Run the SQL from `schema.sql` in the Supabase SQL Editor
   - Copy `apps/web/env.example` to `apps/web/.env` and fill in values

3. **Development** (runs both frontend + worker):
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:5173
   - Worker API: http://localhost:8787

## Environments

The project supports three environments:

| Environment | Worker Name | Auth | Deploy Command |
|-------------|-------------|------|----------------|
| **Dev** | `inductive-bible-worker` | ❌ Disabled | `wrangler dev` |
| **Staging** | `inductive-bible-staging` | ✅ Enabled | `wrangler deploy --env staging` |
| **Production** | `inductive-bible-prod` | ✅ Enabled | `wrangler deploy --env production` |

### Deploying

1. **Build the frontend**:
   ```bash
   cd apps/web
   pnpm build
   ```

2. **Deploy to staging** (for testing):
   ```bash
   cd apps/worker
   wrangler deploy --env staging
   ```

3. **Deploy to production** (live site):
   ```bash
   cd apps/worker
   wrangler deploy --env production
   ```

### Setting Secrets

Secrets must be set per-environment:

```bash
# Staging
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging

# Production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

## Key Configuration Files
- `apps/worker/wrangler.toml`: Worker environments, KV namespaces, custom domains
- `apps/worker/.dev.vars`: Local development secrets (gitignored)
- `apps/web/.env`: Frontend environment variables (gitignored)
- `apps/worker/src/lib/bolls.ts`: Bible text caching and translation filtering

## AI Study Setup (Workers AI + D1 + Vectorize)

The AI Study tab requires additional Cloudflare resources:

### 1. Create D1 Database
```bash
# Create databases
wrangler d1 create inductive-bible-db-staging
wrangler d1 create inductive-bible-db-prod

# Run migrations
wrangler d1 execute inductive-bible-db-staging --file=./apps/worker/src/db/schema.sql
wrangler d1 execute inductive-bible-db-prod --file=./apps/worker/src/db/schema.sql
```

Update `wrangler.toml` with the database IDs from the create commands.

### 2. Create Vectorize Index
```bash
wrangler vectorize create precept-embeddings-staging --dimensions=768 --metric=cosine
wrangler vectorize create precept-embeddings-prod --dimensions=768 --metric=cosine
```

### 3. Ingest PreceptAustin Commentary
```bash
# Seed document records
curl -X POST http://localhost:8787/api/admin/ingest/seed

# Index a specific book
curl -X POST http://localhost:8787/api/admin/ingest/book \
  -H "Content-Type: application/json" \
  -d '{"book": "Hebrews"}'

# Check status
curl http://localhost:8787/api/admin/ingest/status
```

### AI Models Used
- **LLM**: `@cf/meta/llama-3-8b-instruct` (via Workers AI)
- **Embeddings**: `@cf/baai/bge-base-en-v1.5` (768 dimensions)
