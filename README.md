# Inductive Bible AI

An expert Bible observation tool for inductive study, built on Cloudflare Workers, React, and Supabase.

**Live Site:** [inductivebible.ai](https://inductivebible.ai)  
**Repo:** https://github.com/neckolis/biblemarker

## Keyboard Shortcuts
- `Cmd/Ctrl+K`: Open command palette
- `Cmd/Ctrl+T`: Switch to Draw Mode + Text tool
- `Cmd/Ctrl+D`: Switch to Draw Mode + Pen tool
- `Cmd/Ctrl+R`: Switch to Research Mode
- `Cmd/Ctrl+G`: Go to passage
- `Cmd/Ctrl+S`: Save study
- `Esc`: Exit palette / Return to Reader Mode

## Features
- **Command Palette**: Raycast-style global search for commands (Mode, Navigation, App).
- **Unified Shortcuts**: Context-aware keyboard shortcuts across all modes.
- **Three Study Modes**:
  - **Read**: Text highlighting, underlining, emoji annotations
  - **Draw**: Freehand annotation via Tldraw
  - **Research**: AI-powered lexicon and Greek/Hebrew tools
- **Bible Text**: ESV, NASB, NLT, KJV via Bolls.life API (cached at edge).
- **Persistence**: Save studies to Supabase (Postgres with RLS).

## Architecture
- **Monorepo**: pnpm workspace (`apps/web`, `apps/worker`, `packages/shared`).
- **Frontend**: Vite + React + TypeScript + Vanilla CSS + Tldraw.
- **Backend**: Cloudflare Worker (serving API + Static Assets) + Hono router.
- **Database**: Supabase (Postgres + Auth).

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
