# BibleMarker

An expert Bible observation tool built on Cloudflare Workers, React, and Supabase.

Repo: https://github.com/neckolis/biblemarker

## Keyboard Shortcuts
- `Cmd/Ctrl+K`: Open command palette
- `Cmd/Ctrl+T`: Switch to Draw Mode + Text tool
- `Cmd/Ctrl+D`: Switch to Draw Mode + Pen tool
- `Cmd/Ctrl+G`: Go to passage
- `Cmd/Ctrl+S`: Save study
- `Esc`: Exit palette / Return to Reader Mode

## Features
- **Command Palette**: Raycast-style global search for commands (Mode, Navigation, App).
- **Unified Shortcuts**: Context-aware keyboard shortcuts across all modes.
- **Mode Switching**: Seamlessly toggle between Reader and Draw (tldraw) modes.
- **Bible Text**: ESV, NASB, NLT via Bolls.life API (cached at edge).
- **Freehand Observation**: Precision drawing and annotation via Tldraw.
- **Persistence**: Save studies to Supabase (Postgres with RLS).

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
   - Start all services:
     ```bash
     pnpm dev
     ```

4. **Syncing Progress**:
   ```bash
   pnpm sync
   ```

5. **Deploy**:
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
