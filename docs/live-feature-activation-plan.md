# Live Feature Activation Plan

This build has two different states that must stay separate:

- **Built / demoable:** the UI, local data flow, guardrails, and preview workflow exist.
- **Live-ready:** the feature is connected to Tenyse's real accounts, real auth session, and required provider keys.

The live-only requirements below should be treated as part of the build plan, not as an afterthought. A feature is not fully complete until its activation dependency is either connected, intentionally deferred, or documented as a Demo Day limitation.

## Foundation Required For All Live Owner Features

These must be true before invites, Discovery scans, AI helpers, AVE research, Google Workspace, or live saves can work from the owner portal:

1. Tenyse's Supabase project is the active project.
2. `src/supabaseConfig.js` has the real project URL and anon/public key.
3. `server/owner-api/.env` has:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL`
4. `server/client-api/.env` has:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. The database schema and migrations have been run:
   - `db/schema.sql`
   - `db/migrations/2026-08-25-coaching-and-client-fields.sql`
   - `db/migrations/2026-08-31-auth-profile-trigger.sql`
6. Tenyse has a real Supabase Auth user.
7. Tenyse has a matching `profiles` row:
   - `role = owner`
   - `email = tenyse@verifiedconsulting.com`
   - `client_id = null`
8. Tenyse logs in through the real owner account, not the demo owner link.
9. Both APIs are running:
   - `npm run start:owner-api`
   - `npm run start:client-api`

### Live Verification Status - Sep 17, 2026

- Owner API health: verified live against Supabase.
- Temporary owner test account: created, confirmed, and mapped to an owner `profiles` row for same-day testing.
- Tenyse owner profile: present with `role = owner`.
- Test client keyword config: updated and verified.
- Discovery Agent: verified through the authenticated owner API.
- AI writing helpers: verified through the authenticated owner API — **but via the GPT fallback, not Claude.** `ANTHROPIC_API_KEY` returns `401 API key is invalid` (re-confirmed live Sep 17). All five prompt types return real content, so the feature works; it is simply not running on the intended provider. `generateText()` now returns `fellBackFrom` and the route logs a warning when this happens, so the downgrade is visible instead of silent. Replace the key in **both** `server/owner-api/.env` and `server/client-api/.env` (it is missing entirely from the latter).
- AVE rate research: verified through the authenticated owner API.
- Campaign/placement live saves: verified through authenticated create/read/delete API smoke test.
- Google Workspace: intentionally deferred until after Demo Day. The portal uses sample lead-time values and demo-safe meeting confirmations during the presentation.
- `APP_BASE_URL`: unset in both API `.env` files, so it silently falls back to `localhost:8420`. Client invite emails will point at localhost until this is set to the deployed domain.
- Live data gap (Sep 17): the `placements` table held 4 rows while the browser held 15 — the case-study coverage lived in localStorage only. `scripts/seed-supabase-from-case-studies.mjs` migrates it, and also seeds `outlet_rates`, which was empty. Requires `db/migrations/2026-09-17-placement-ave-data-quality.sql` to be run first.
- Supabase project ownership: **confirmed Sep 17, 2026.** Project `bjdzbyfxelshyxoswykk` is in Tenyse's own account, and all three config points (`src/supabaseConfig.js` anon key, both API `.env` service-role keys) already point at it and match. Foundation requirement #1 is satisfied. Earlier notes describing this as a temp/builder-owned project were wrong.
- Demo vs live divergence: reduced. Discovery scans, AVE rate research, report generation, campaign activity summaries, and pitch/language helpers now use the local-demo owner API path when `ALLOW_LOCAL_DEMO_AUTH=true`. Remaining intentional differences are live-account features that write to or depend on real external accounts: client invites, Google Calendar scheduling, Gmail/Calendar lookup, and Supabase-backed live saves. Keep checking this list during QA so preview mode does not hide a feature that could safely run there.

## Client Invites

### Current Build State

The owner UI, invite button flow, backend route, invite metadata, and Auth-to-profile trigger path are built.

### Required To Work Live

- Real owner login with a valid Supabase Auth session.
- A real `clients` row for the client being invited.
- Auth-to-profile trigger migration installed.
- Supabase Auth email delivery working.
- `APP_BASE_URL` pointing to the real deployed portal URL before production handoff.

### Demo Day Workaround

Use direct demo client links for walkthroughs. Do not claim the invite email was sent unless testing from the live owner account.

## Discovery Agent

### Current Build State

The owner UI, client search-term fields, backend scan route, structured news search path, AI web-search fallback path, scoring, and Review Queue insertion flow are built.

### Required To Work Live

- Real owner login.
- Client has keyword config/search terms saved.
- At least one structured-news key:
  - `CURRENTS_API_KEY`, or
  - `NEWSDATA_API_KEY`
- Optional AI web-search layer:
  - `ANTHROPIC_API_KEY`, and/or
  - `OPENAI_API_KEY`

### Demo Day Workaround

Use the verified live scan path when logged in as a real owner. If the app is shown without real login, use the Review Queue preview and say live scanning requires owner auth plus the connected search keys.

## AI Writing Helpers

### Current Build State

The backend prompt route exists for executive summaries, campaign activity summaries, report narrative, sentiment analysis, and language suggestions. The UI keeps AI output as a draft; it never auto-finalizes client-facing content.

### Required To Work Live

- Real owner login.
- `ANTHROPIC_API_KEY`, and/or
- `OPENAI_API_KEY`
- Enough placement/campaign context in the request body to generate from.

### Demo Day Workaround

Use the verified live generation path when logged in as a real owner. Still frame AI output as a draft that Tenyse reviews before saving or presenting to a client.

## AVE Calculation And AVE Rate Research

### Current Build State

The AVE calculator works locally with saved outlet rates and sourced estimate ranges. It does not auto-save questionable estimates as final values.

### Required To Work Live

For regular calculation:

- Outlet rate exists in the portal's outlet-rate list, or
- The sourced estimate range is available for the outlet.

For live rate research:

- Real owner login.
- `PERPLEXITY_API_KEY`.

### Demo Day Workaround

Use the local estimate path for standard calculations and the verified live research helper when Tenyse needs a manual outlet-rate lookup. Show that the platform names the source and asks Tenyse to choose the final value instead of inventing one.

## Canva Bulk Create Export

### Current Build State

The export can generate a CSV for confirmed placements and download it for Canva Bulk Create. Date and Article URL export when available, but no longer block the export when a real case-study placement does not include them.

### Required To Work Live

- Confirmed placement rows with at least:
  - Publication
  - Headline
  - Publicity Value
  - Landed Date
- Tenyse's actual Canva template column names should be checked against the generated CSV headers.

### Demo Day Workaround

Generate/download the CSV and explain that the final step is uploading it into Canva Bulk Create and visually reviewing the generated report.

## Google Workspace / Gmail / Calendar

### Current Build State

The build has backend scaffolding and owner settings/status UI for Gmail pitch-date lookup, client note notifications, and Calendar scheduling.

### Required To Work Live

In `server/owner-api/.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_NOTIFY_TO`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIME_ZONE`

In `server/client-api/.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_NOTIFY_TO`

The refresh token must be authorized by Tenyse's Google account with:

- Gmail read-only
- Gmail send
- Calendar events

### Demo Day Workaround

For Demo Day, show sample lead-time values and demo-safe scheduling confirmations. Do not claim Gmail/Calendar automation is live until the OAuth credentials are connected after the presentation.

## Live Saves

### Current Build State

Owner and client API routes exist for live saves, and demo/local storage remains available for walkthrough safety.

### Required To Work Live

- Real owner or client login.
- Matching `profiles` row.
- Tables and policies installed.
- Owner/client API running.
- Valid Supabase access token in the browser session.

### Demo Day Workaround

Use verified live saves when logged in through a real Supabase account. Use demo/local data only when protecting the walkthrough from network/auth instability.

## Why This Belongs In The Build Plan

The missing distinction was not technical complexity; it was planning language. The earlier plan tracked whether features existed in the repo, but did not consistently track whether each feature was connected to the outside account, API key, OAuth token, and real-auth condition it needs to run live.

Going forward, every feature should be tracked with:

- **Built:** code/UI exists.
- **Verified locally:** works with local/demo data.
- **Activated:** required account credentials and real auth are connected.
- **Demo claim:** what can honestly be said during the presentation.
