# CSM Silks Production Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all production gaps to reach Flipkart-grade deployment readiness.

**Architecture:** Fill missing infra files (env template, prod docker, Sentry SDK init), add OG/PWA/SEO meta to frontend, harden API client with 429 handling, and commit the pending auth/CSS changes.

**Tech Stack:** Django 6, DRF, React 18 + Vite, Docker Compose, sentry-sdk, PWA manifest.

## Global Constraints
- No placeholder values in .env.example — every key must have a comment explaining where to get it
- All CSS follows existing token variables (--ink, --page, --gold, etc.)
- Python additions go in requirements.txt at the root
- Docker Compose prod file mirrors docker-compose.yml but production-tuned

---

### Task 1: Commit the modified auth/style files
**Files:** `frontend/src/components/GoogleSignInButton.tsx`, `frontend/src/pages/CustomerAuth.tsx`, `frontend/src/styles/commerce.css`
- [ ] Stage and commit the three modified files

### Task 2: Add OG/Twitter Card/PWA meta to index.html
**Files:** `frontend/index.html`, `frontend/public/manifest.json`
- [ ] Add Open Graph, Twitter Card, canonical, apple-touch-icon, manifest link to index.html
- [ ] Create manifest.json PWA manifest

### Task 3: robots.txt + sitemap.xml
**Files:** `frontend/public/robots.txt`, `frontend/public/sitemap.xml`
- [ ] Create robots.txt allowing all, pointing to sitemap
- [ ] Create sitemap.xml with all public routes

### Task 4: API client 429 / throttle error handling
**Files:** `frontend/src/lib/api.ts`
- [ ] Detect 429 status, parse Retry-After header, throw descriptive error

### Task 5: Sentry SDK backend init
**Files:** `requirements.txt`, `backend/csm_backend/sentry.py`, `backend/csm_backend/settings.py`
- [ ] Add sentry-sdk to requirements.txt
- [ ] Create sentry.py that initializes Sentry when SENTRY_DSN is set
- [ ] Import sentry init at bottom of settings.py

### Task 6: .env.example
**Files:** `.env.example`
- [ ] Create comprehensive .env.example with every env var documented

### Task 7: docker-compose.prod.yml
**Files:** `docker-compose.prod.yml`
- [ ] Create production-tuned Docker Compose with restart policies, health checks, env vars from .env

### Task 8: Dockerfile multi-stage build
**Files:** `Dockerfile`
- [ ] Upgrade Dockerfile to multi-stage build (builder + runtime)

### Task 9: Commit all production hardening
- [ ] Stage and commit all new/modified files
