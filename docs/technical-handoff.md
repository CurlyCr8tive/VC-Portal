# Technical Handoff

_Verified Consulting PR Platform_

_Last updated: September 20, 2026._

## Repository

GitHub:

```text
https://github.com/CurlyCr8tive/VC-Portal.git
```

Local project path:

```text
/Users/chericeheron/Desktop/VC Dashboard
```

Current pushed checkpoint:

```text
06ae457 Polish demo flows and coaching request path
```

Current uncommitted documentation/deployment-prep changes after the Sep 20 meeting may include:

- refreshed handoff docs
- `vercel.json`
- API URL globals in `src/supabaseConfig.js`

## Project Shape

- Static frontend: root HTML files plus vanilla JavaScript modules in `src/`
- Owner portal: `owner.html`, `src/owner/app.js`, `src/owner/components/`
- Client portal: `client.html`, `src/client/app.js`, `src/client/components/`
- Owner API: `server/owner-api`, default local port `4001`
- Client API: `server/client-api`, default local port `4002`
- Static server: `npm run serve:static`, default local port `8420`
- Build/health check: `npm run check`

The app intentionally keeps local demo fallbacks. Do not remove localStorage/demo fallback paths while wiring production features.

## Local Commands

From the repo root:

```sh
cd "/Users/chericeheron/Desktop/VC Dashboard"
```

Run the static frontend:

```sh
npm run serve:static
```

Run the owner API:

```sh
npm run start:owner-api
```

Run the client API:

```sh
npm run start:client-api
```

Run checks:

```sh
npm run check
```

If a port is already in use, it usually means that service is already running:

- static frontend: `8420`
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

## Deployment Plan From Sep 20 Meeting

PR Platform target:

- Deploy static frontend to Vercel free tier.
- Keep demo logins for demo/testing only.
- Replace demo access with official owner/client account creation after deployment.
- Use Supabase for auth/data.

Important technical note:

- Vercel can host the static HTML/CSS/JS frontend as-is.
- The current owner/client APIs are Express servers, not Vercel serverless functions.
- For full live functionality, deploy `server/owner-api` and `server/client-api` to a backend host such as Render, Railway, Fly, or convert them to Vercel serverless functions.
- After the API deployment, update `src/supabaseConfig.js`:
  - `window.OWNER_API_BASE_URL`
  - `window.CLIENT_API_BASE_URL`
- Also update `APP_BASE_URL` in API environment variables to the deployed Vercel frontend URL.

Static-only Vercel deployment can still show demo-mode pages, but live owner/client saves, agents, invites, messages, and files need the APIs reachable.

## Deployment Readiness Checklist

1. Push latest repo changes to GitHub.
2. Create/import the project in Vercel from `CurlyCr8tive/VC-Portal`.
3. Framework preset: Other/static.
4. Build command: leave empty or use `echo static`.
5. Output directory: repo root.
6. Confirm `owner.html`, `client.html`, `login.html`, and `index.html` load.
7. Deploy owner API.
8. Deploy client API.
9. Update `src/supabaseConfig.js` API base URLs to deployed API origins.
10. Set owner/client API env vars.
11. Set API `APP_BASE_URL` to deployed Vercel frontend origin.
12. Test real owner login.
13. Test real client login.
14. Test Reports workflow.
15. Test message/coaching request flow.
16. Test Canva CSV export.
17. Keep Google/Gmail/Calendar deferred unless there is time after core demo is stable.

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
| PR Platform Vercel URL | Static frontend | Vercel | Fill after deploy |
| Owner API URL | Owner backend | API host | Fill after deploy |
| Client API URL | Client backend | API host | Fill after deploy |
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
- deployed static frontend/API hosting
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
