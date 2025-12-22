# Development Workflow Guide

This document outlines the proper workflow for developing, testing, and deploying changes to **Inductive Bible AI**.

---

## 🌳 Branch Strategy

### Main Branches

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production-ready code | Production (`inductivebible.ai`) |
| `staging` | Pre-production testing | Staging environment |
| `feat/*` | Feature development | Local dev only |
| `fix/*` | Bug fixes | Local dev only |

### Creating a Feature Branch

Always create a new branch from `main` or `staging` for your work:

```bash
# Create and switch to a new feature branch
git checkout main
git pull origin main
git checkout -b feat/my-feature-name

# Or for a bug fix
git checkout -b fix/bug-description
```

---

## 🔄 Development Workflow

### Step 1: Local Development (Dev Environment)

1. **Start the dev servers**:
   ```bash
   pnpm dev
   ```
   This runs:
   - Frontend (Vite): http://localhost:5173
   - Worker API (Wrangler): http://localhost:8787

2. **Develop and test locally**:
   - Auth is **disabled** by default in dev mode
   - KV cache is simulated locally
   - Changes hot-reload automatically

3. **Verify your changes**:
   - Test in browser (desktop + mobile viewport)
   - Check browser console for errors
   - Test all affected features

### Step 2: Commit Your Changes

```bash
# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "feat: add mobile hamburger menu"

# Push to remote
git push -u origin feat/my-feature-name
```

### Step 3: Deploy to Staging (Testing)

Before merging to production, **always test in staging**:

```bash
# 1. Build the frontend
cd apps/web
pnpm build

# 2. Deploy to staging
cd ../worker
wrangler deploy --env staging
```

**Staging URL**: Check Cloudflare dashboard for the staging worker URL (typically `inductive-bible-staging.<your-account>.workers.dev`)

**Test in staging**:
- ✅ Auth is **enabled** (test login/logout)
- ✅ Real KV cache (test caching behavior)
- ✅ Test on actual mobile devices
- ✅ Share with team for review

### Step 4: Merge and Deploy to Production

Once staging is verified:

```bash
# 1. Create a Pull Request on GitHub
#    feat/my-feature-name → main

# 2. After PR is approved and merged, switch to main
git checkout main
git pull origin main

# 3. Build the frontend
cd apps/web
pnpm build

# 4. Deploy to production
cd ../worker
wrangler deploy --env production
```

---

## ⚡ Quick Reference Commands

### Development
```bash
pnpm dev                     # Start local dev servers
pnpm build                   # Build frontend for deployment
```

### Git Workflow
```bash
git checkout -b feat/name    # Create feature branch
git add . && git commit      # Commit changes
git push -u origin feat/name # Push branch
```

### Deployment
```bash
# Always build frontend first!
cd apps/web && pnpm build

# Then deploy to the appropriate environment
cd ../worker
wrangler deploy --env staging      # Deploy to staging
wrangler deploy --env production   # Deploy to production (CAREFUL!)
```

### Secrets Management
```bash
# Set secrets per environment
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production

# List secrets
wrangler secret list --env production
```

### Logs & Debugging
```bash
# View live logs
wrangler tail --env staging
wrangler tail --env production
```

---

## ✅ Pre-Deployment Checklist

Before deploying to **staging**:
- [ ] All changes committed to feature branch
- [ ] No console errors in browser
- [ ] Tested on mobile viewport (use Chrome DevTools)
- [ ] Frontend built successfully (`pnpm build`)

Before deploying to **production**:
- [ ] Feature tested and verified in staging
- [ ] Changes merged to `main` branch
- [ ] Team review completed (if applicable)
- [ ] Auth flow tested (login/logout)
- [ ] Mobile experience verified on real device

---

## 🚨 Emergency Rollback

If production breaks:

```bash
# 1. Check recent deployments
wrangler deployments list --env production

# 2. Rollback to previous version
wrangler rollback --env production
```

---

## 📁 Environment Configuration Files

| File | Purpose | Git Status |
|------|---------|------------|
| `apps/worker/wrangler.toml` | Worker config for all environments | ✅ Tracked |
| `apps/worker/.dev.vars` | Local dev secrets | ❌ Gitignored |
| `apps/web/.env` | Frontend dev environment | ❌ Gitignored |
| `apps/web/env.example` | Template for env files | ✅ Tracked |

---

## 🔑 Environment Differences

| Feature | Dev | Staging | Production |
|---------|-----|---------|------------|
| Auth Required | ❌ No | ✅ Yes | ✅ Yes |
| KV Caching | Simulated | Real | Real |
| Custom Domain | localhost | workers.dev | inductivebible.ai |
| HTTPS | No | Yes | Yes |
| Worker Name | inductive-bible-worker | inductive-bible-staging | inductive-bible-prod |

---

## 💡 Tips

1. **Always build before deploying**: The worker serves static files from `apps/web/dist`.

2. **Test mobile on real devices**: Emulators don't catch all touch/scroll issues.

3. **Use staging liberally**: It's cheap and saves production headaches.

4. **Check logs after deploy**: `wrangler tail` shows real-time issues.

5. **Don't deploy on Fridays**: (Unless you like weekend debugging 😅)
