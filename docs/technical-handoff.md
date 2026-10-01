# Technical Handoff

_Verified Consulting PR Platform_

_Last updated: October 1, 2026._

## Repository

GitHub:

```text
https://github.com/CurlyCr8tive/VC-Portal.git
```

Local project path:

```text
/Users/chericeheron/Desktop/VC Dashboard
```

Current handoff index:

```text
docs/handoff-index-2026-10-01.md
```

## Project Shape

- Browser frontend: root HTML files plus vanilla JavaScript modules in `src/`
- Owner portal: `owner.html`, `src/owner/app.js`, `src/owner/components/`
- Client portal: `client.html`, `src/client/app.js`, `src/client/components/`
- Owner API: `server/owner-api`, default local port `4001`
- Client API: `server/client-api`, default local port `4002`
- Browser frontend server: `npm run serve:frontend`, default local port `8420`
- Browser deploy build: `npm run build:frontend`
- Build/health check: `npm run check`

The app intentionally keeps local demo fallbacks. Do not remove localStorage/demo fallback paths while wiring production features.

## Local Commands

From the repo root:

```sh
cd "/Users/chericeheron/Desktop/VC Dashboard"
```

Run the full local stack:

```sh
npm run start:local
```

Alternative individual commands:

```sh
npm run serve:frontend
npm run start:owner-api
npm run start:client-api
```

Run checks:

```sh
npm run check
```

If a port is already in use, `npm run start:local` checks health and reuses already-running services:

- browser frontend: `8420`
- owner API: `4001`
- client API: `4002`

## Main Demo URLs

```text
http://127.0.0.1:8420/owner.html?demo=owner&recording=pr-platform
```

```text
http://127.0.0.1:8420/client.html?demo=greyz-bistro&view=coaching&recording=pr-platform
```

## Current Demo Scope

The PR Platform demo should focus on:

- Reports
- AI-assisted executive summary and narrative drafting
- Save Draft / Approve
- Canva-ready CSV/report export
- Greyz Bistro coaching client portal
- PR-only client coaching request CTA

Do not center the demo on lead time. Lead time is present with demo/mock data, but full Gmail/Calendar auth is post-demo.

## Deployment Plan

PR Platform target:

- Deploy the browser frontend, owner API, and client API through Render Blueprint.
- Keep demo/preview links separate from real owner/client login testing.
- Use Supabase for auth/data.
- Use real owner/admin/client accounts for deployed QA.

Important technical note:

- `render.yaml` defines all three services.
- The frontend build writes browser-safe files to `dist`.
- Frontend public env vars are converted into `dist/config.js` during `npm run build:frontend`.
- Backend secrets live only in Render env vars.

Use [Render Deployment Checklist](render-deployment-checklist.md) for exact steps.

## Deployment Readiness Checklist

1. Push latest repo changes to GitHub.
2. Create Render Blueprint from `CurlyCr8tive/VC-Portal`.
3. Confirm Render detects `render.yaml`.
4. Add frontend public env vars.
5. Add owner API env vars.
6. Add client API env vars.
7. Redeploy owner API, client API, then frontend.
8. Confirm both API `/health` endpoints.
9. Test real owner/admin login.
10. Test Greyz Bistro pilot invite to `TheEsmereldaCo@gmail.com`.
11. Test pilot client password setup and login.
12. Test Reports, Coaching, notes/messages, file flows, and CTA feedback.
13. Configure Gmail OAuth notifications or mark them Phase 2.

## Supabase

Supabase is used for live/authenticated data paths:

- real owner login
- real client login
- clients
- campaigns
- placements
- reports/report drafts
- client messages
- client files
- agent/review logs
- coaching phases/homework/resources/opportunities

Before assuming a live feature is broken, confirm:

1. the correct Supabase project is selected
2. migrations have been applied
3. env vars point to the same project
4. the logged-in user has the expected profile/role
5. the API server is running

Do not print or expose Supabase service-role keys.

## Credentials Handoff Chart

Do not commit real passwords or service-role keys into the repo. Share them in a private channel or password manager.

| Credential / URL | Purpose | Where It Lives | Handoff Status |
| --- | --- | --- | --- |
| Supabase login | Database/auth ownership | Supabase dashboard | Tenyse has login; document privately |
| Supabase URL | Browser + APIs | `src/supabaseConfig.js`, API env vars | Public project URL, safe to document |
| Supabase anon key | Browser auth | `src/supabaseConfig.js` | Public anon key, protected by RLS |
| Supabase service-role key | Server database access | API host env vars only | Private; never expose in frontend |
| GitHub repo | Source/version control | GitHub | `https://github.com/CurlyCr8tive/VC-Portal.git` |
| PR Platform frontend URL | Browser frontend | Render `vc-portal-frontend` | Fill after deploy |
| Owner API URL | Owner backend | Render `vc-portal-owner-api` | Fill after deploy |
| Client API URL | Client backend | Render `vc-portal-client-api` | Fill after deploy |
| Demo password | Demo/testing only | Private handoff note | Current meeting note says `Testing123`; replace with official accounts post-deploy |
| LLM API keys | AI drafting/discovery helpers | API host env vars | Use Tenyse-owned keys when possible |

## Environment Variables

Owner API likely needs:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
APP_BASE_URL
ALLOW_LOCAL_DEMO_AUTH
ANTHROPIC_API_KEY
OPENAI_API_KEY
PERPLEXITY_API_KEY
CURRENTS_API_KEY
NEWSDATA_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

Client API likely needs:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
APP_BASE_URL
ANTHROPIC_API_KEY
OPENAI_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
```

For demo day, Google/Gmail/Calendar can remain deferred. Do not block the PR/report demo on Google auth.

## Agent And Automation Status

Demo-ready or partially demo-ready:

- report writing helper
- executive summary drafting
- report narrative drafting
- discovery scan route/review queue flow
- AVE calculation and AVE rate research helper
- Canva CSV/report export
- coaching request message flow

Production depends on:

- valid LLM/API keys
- live owner login
- correct Supabase schema
- API services running
- optional search provider keys for discovery
- optional Perplexity key for AVE research
- optional Google credentials for email/calendar features

## Known Demo/Post-Demo Boundaries

Demo-ready:

- PR report workflow
- owner dashboard demo data
- client portal preview
- Greyz Bistro coaching page
- PR-only coaching request path
- CSV/report export path

Post-demo:

- Gmail/Calendar-based lead-time tracking
- production Google email notifications
- deployed Render browser frontend/API hosting
- CORS locked to deployed origin
- final file storage policies
- production user onboarding and password reset flow
- final Raise Local production integration

## Recommended Production Handoff Checklist

1. Confirm deployed frontend URL.
2. Deploy owner API.
3. Deploy client API.
4. Move all secrets into host environment variables.
5. Apply latest Supabase migrations.
6. Verify owner profile for Tenyse.
7. Verify client profiles and demo accounts.
8. Test owner login.
9. Test client login.
10. Test Reports workflow.
11. Test Save Draft and Approve.
12. Test Canva CSV export.
13. Test client message submission.
14. Test coaching request submission.
15. Test owner message review.
16. Test file upload/storage if enabled.
17. Replace demo/mock values with confirmed production data as available.

## Development Rules

- Read the repo before changing code.
- Preserve local demo fallback patterns.
- Use existing vanilla JS/component patterns.
- Run `npm run check` after changes.
- Commit clean checkpoints.
- Ask before destructive git operations or force-pushes.
