# Precept Digital Observation

An expert Bible observation tool built on Cloudflare Workers, React, and Supabase.

## Features
- **Bible Text**: ESV, NASB, NLT via Bolls.life API (cached at edge).
- **Annotations**: Rich text highlighting, underlining, and freehand drawing (Tldraw).
- **Persistence**: Save studies to Supabase (Postgres with RLS).
- **Presets**: Create and save your own markup tools.

## Architecture
- **Monorepo**: pnpm workspace (`apps/web`, `apps/worker`, `packages/shared`).
- **Frontend**: Vite + React + TypeScript + Vanilla CSS + Tldraw.
- **Backend**: Cloudflare Worker (serving API + Static Assets) + Hono router.
- **Database**: Supabase (Postgres + Auth).

## Setup & Deployment

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Supabase**:
   - Create a project.
   - Run the SQL from `schema.sql` in the Supabase SQL Editor.
   - Set environment variables in `.env` (dev) and `apps/worker/wrangler.toml` (prod).

3. **Development**:
   - Start the Worker (which proxies frontend):
     ```bash
     cd apps/worker
     pnpm dev
     ```
   - OR run frontend independently (needs env vars):
     ```bash
     cd apps/web
     pnpm dev
     ```

4. **Deploy**:
   - Build website:
     ```bash
     cd apps/web
     pnpm build
     ```
   - Deploy Worker (serves `apps/web/dist`):
     ```bash
     cd apps/worker
     wrangler deploy
     ```

## Key Configuration
- `apps/worker/wrangler.toml`: Configures `[assets]` binding to serve the static site.
- `apps/worker/src/lib/bolls.ts`: Handles Bible text caching and translation filtering.
