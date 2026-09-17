# VC-Portal IDE Transition Prompt

_Last regenerated: Sep 17, 2026._

Paste everything below as the first message to the next coding assistant, opened at the root of this repo:

`/Users/chericeheron/Desktop/VC Dashboard`

---

I am continuing work on the Verified Consulting PR portal.

Important: this project is only Verified Consulting. Do not use FEF context.

## Project Shape

- Static frontend: root HTML files plus vanilla JavaScript modules in `src/`.
- Owner portal: `owner.html`, `src/owner/app.js`, `src/owner/components/`.
- Client portal: `client.html`, `src/client/app.js`, `src/client/components/`.
- Owner API: `server/owner-api`, default local port `4001`.
- Client API: `server/client-api`, default local port `4002`.
- Static server: `npm run serve:static`, default local port `8420`.
- Build/health check: `npm run check`.

The app intentionally keeps a localStorage fallback for demo/local work. Do not remove that fallback while wiring Supabase features. Real API mode is gated by the existing `shouldUseOwnerApi()` / real Supabase session pattern.

## Current Git State At Handoff

Recent local commits:

- `958c3da Carry AVE data-quality flags into Supabase and seed live case-study data`
- `8d02671 Surface silent AI-provider fallback and raise long-form token budget`
- `d46870c Seed agent-ready client data`
- `2128db9 Update live feature verification status`
- `8f0dded Document live feature activation requirements`
- `c661989 Polish demo QA copy and Canva export`

Before making changes, run:

```sh
git status --short --branch
git log --oneline origin/main..HEAD
npm run check
```

Expected state immediately after this handoff is either clean and synced, or clean with only this handoff file if it has not been committed/pushed yet. Do not rely on older notes saying coaching is half-finished; that is stale.

## What Was Just Completed

Client coaching Supabase slice:

- Client portal loads coaching phases, homework, opportunities, resources, and checklist/files from `/api/coaching`.
- Client homework and reflection updates save through the client API.
- Client-submitted opportunities save to Supabase for Tenyse to review.

Owner coaching Supabase wiring:

- Owner API routes exist for coaching phases, homework, opportunities, and resources.
- Owner Coaching Program UI is wired to Supabase in real owner sessions:
  - Phase Tracker
  - Homework/action items
  - Opportunity Evaluator
  - Resources & Checklist
- Owner dashboard coaching overview can read real coaching data.

Dashboard visual QA fix:

- `portal-styles.css` now keeps compact owner dashboard tables visible at smaller widths.
- `owner.html` stylesheet cache-buster was bumped so the fix actually loads.
- This fixed the issue where Coaching Program Overview had real row data in the DOM but appeared blank/collapsed.

Verification already run:

```sh
npm run check
```

It passed.

## Known Notes

- `HANDOFF.md` was previously stale and said Opportunity Evaluator and Resource Library were not wired. That is no longer true after commit `6d04dbe`.
- Do not print or expose service-role keys.
- Supabase schema and env state should be verified before assuming the live project has every local table/policy.
- Google Workspace/Gmail/Calendar integration exists as backend scaffolding and status UI, but it still needs real credential/config validation before claiming it is production-ready.
- AVE calculation should not invent values. The standing rule is to surface missing rate data instead of guessing.

## Next Work

Ordered. Items 1-3 block the rest.

### Blocking setup

1. Run `db/migrations/2026-09-17-placement-ave-data-quality.sql` in the Supabase SQL editor. PostgREST cannot do DDL, so this is a manual paste.
2. Seed the live database: `node scripts/seed-supabase-from-case-studies.mjs` (dry run), then `--write`. The live `placements` table had 4 rows against 15 in the browser — without this a deployed portal looks almost empty. Must run AFTER step 1 or the flagged rows land without their warnings.
3. Replace `ANTHROPIC_API_KEY` in **both** `server/owner-api/.env` and `server/client-api/.env`. It returns 401 in the first and is absent from the second, so every AI writing helper is silently running on the GPT fallback.

### Real-owner QA pass (the main outstanding work)

4. Sign in as a **real Supabase owner**, not the demo link, and click every live path: dashboard filters, client list/detail/edit, invite, placements add/edit/delete, Calculate to research to save-rate, discovery scan, review queue, campaigns, reports, Canva export, coaching admin, schedule meeting.
5. Finish the client portal walkthrough (started against Greyz Bistro, never completed): dashboard, placements, all six coaching tabs, homework check-off, reflection save, opportunity submit, resources, notes, messages.
6. Fix whatever fails.

### Deployment

7. Netlify (static frontend) plus Render (both Express APIs). No deploy config exists yet.
8. Move secrets into host env vars; nothing from `.env` is committed.
9. Set `APP_BASE_URL` to the deployed domain — unset today, so invite emails point at `localhost:8420`.
10. Lock CORS down from `*` to the deployed origin.

### Known open questions

11. Google Workspace needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` from a one-time OAuth authorization against Tenyse's own Google account. Use Workspace "Internal" user type or refresh tokens expire every 7 days.
12. Supabase project ownership is unverified — a `profiles` row with her email is not proof the project sits in her account. Check the dashboard org and billing.
13. Demo vs live divergence: ~15 interactive features are hidden behind `shouldUseOwnerApi()` on the mock login, so demo mode shows a materially different product. This has already caused a working feature to be reported as broken.
14. Data questions only Tenyse can answer are tracked in `docs/tenyse-open-data-questions.md`.
15. Two test rows still sit in the live `clients` table: `VC Test Client` and `VC Portal API Test 1788193670371`.

## Working Rules

- Read the repo before changing code.
- Do not mix in FEF context.
- Preserve existing localStorage fallback patterns.
- Use existing vanilla JS/component patterns.
- Run `npm run check` after changes.
- Commit clean checkpoints.
- Ask before destructive git operations or force-pushes.
