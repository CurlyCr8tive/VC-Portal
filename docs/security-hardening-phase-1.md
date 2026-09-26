# Security Hardening Phase 1

This document captures the first security improvements implemented before final handoff.

## What Was Improved

### 1. API CORS Is Now Allowlisted

Before:

- Owner API and Client API returned `Access-Control-Allow-Origin: *`.
- That was acceptable only for local demo development, not production.

Now:

- Both APIs read allowed origins from environment variables.
- Production should set `CORS_ALLOWED_ORIGINS` to the deployed frontend origin.
- Local development still supports `http://localhost:8420`, `http://127.0.0.1:8420`, and `file:`.
- Requests from unknown browser origins receive `403 origin_not_allowed`.

Relevant files:

- `server/owner-api/index.js`
- `server/client-api/index.js`
- `server/owner-api/.env.example`
- `server/client-api/.env.example`

### 2. Demo Owner Bypass Fails Closed In Production

Before:

- `ALLOW_LOCAL_DEMO_AUTH=true` was documented as local-only.
- The code warned when enabled, but it did not hard-stop a production boot.

Now:

- If `NODE_ENV=production` and `ALLOW_LOCAL_DEMO_AUTH=true`, `owner-api` refuses to start.
- This prevents the local demo owner header flow from becoming a production auth bypass.

### 3. Baseline API Security Headers

Both APIs now set:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Cross-Origin-Resource-Policy: same-site`

### 4. Owner API Request Body Limit

The owner API now limits JSON request bodies to `2mb`.

This reduces accidental or malicious oversized request payloads against owner-only routes.

### 5. Client Upload MIME Allowlist

Client file uploads now require an allowed MIME type.

Default allowed types:

- `application/pdf`
- `image/png`
- `image/jpeg`
- `text/plain`
- `text/csv`

Config:

- `CLIENT_FILE_ALLOWED_TYPES`
- `CLIENT_FILE_MAX_BYTES`

### 6. Security Regression Checks

`npm run check` now verifies:

- Owner API does not use wildcard CORS.
- Client API does not use wildcard CORS.
- Both APIs include security headers.
- Both APIs use origin allowlist logic.
- Owner API refuses demo auth in production.
- Client API enforces an upload MIME allowlist.

## Existing Security Already In Place

- Supabase JWT verification for live routes.
- Owner and client APIs are separate services.
- Owner routes require `profiles.role = owner`.
- Client routes require `profiles.role = pr_client` and assigned `client_id`.
- Client API filters every query by the authenticated client’s own `client_id`.
- Supabase Row Level Security is enabled on app tables.
- Client-facing reports require approved or published status.
- Review Queue requires owner approval before discovered mentions become placements.
- Private file downloads use signed URLs.
- Service-role keys stay server-side only.
- Agent runs and learning events are owner-only operational records.

## Remaining Security Phases

### Phase 2: Deployment Guardrails

- Add a deployment checklist that blocks production deploys unless:
  - `NODE_ENV=production`
  - `CORS_ALLOWED_ORIGINS` is set to the real frontend origin
  - `ALLOW_LOCAL_DEMO_AUTH=false`
  - Supabase URL and service role key are present only in backend environments
  - Frontend uses anon key only

### Phase 3: RLS Smoke Tests

- Add an automated script that signs in as:
  - owner
  - client A
  - client B
- Verify:
  - owner can read all owner records
  - client A cannot read client B
  - client cannot read `review_queue`, `outlet_rates`, `agent_runs`, `agent_learning_events`, or `errors`

### Phase 4: Audit Logging

Expand audit trails for:

- Report approval
- PDF download
- Canva CSV export
- Client invite sent
- Client file upload
- AI generation accepted/rejected

### Phase 5: Data Export And Client-Facing Preview Gate

Before anything becomes client-facing:

- Confirm private notes are excluded.
- Confirm report status is approved/published.
- Confirm demo-only data is not mixed into live export.
- Confirm AVE uncertainty flags are visible where needed.

## Meeting-Ready Summary

Use this summary for the handoff check-in:

> I started the first security hardening pass. The app already had role-based access, separate owner/client APIs, Supabase auth checks, client scoping, RLS, approved-report gates, review-queue approval, signed file URLs, and server-only service keys.  
>
> This weekend I tightened the first production-facing layer: API origin allowlists replaced wildcard CORS, baseline security headers were added, the local demo-owner bypass now fails closed in production, owner API payload size is capped, and client uploads now enforce an allowed file-type list. I also added regression checks so these protections are tested during the build check.  
>
> The next security phases are deployment guardrails, RLS smoke tests, expanded audit logging, and a final client-facing export/privacy review before handoff.

## Handoff Checklist For Tenyse

- Confirm the final production frontend URL.
- Add that URL to `CORS_ALLOWED_ORIGINS`.
- Confirm `ALLOW_LOCAL_DEMO_AUTH=false` in production.
- Confirm Supabase service-role key exists only in backend environment variables.
- Confirm client upload types and max file size.
- Confirm owner login and at least one client login.
- Confirm approved reports are visible to the matching client only.
- Confirm Review Queue, outlet rates, agent runs, learning events, and errors are owner-only.
