# Render Deployment Checklist

Recommended deployment option for this repo: **Render for all three services**.

Why:

- The PR platform has one browser frontend and two Express APIs.
- Render can host all three from the same GitHub repo.
- Environment variables and secrets stay in one dashboard.
- This avoids splitting the frontend on Vercel and the APIs somewhere else.

## Services

The repo includes `render.yaml` with:

1. `vc-portal-frontend`
   - Browser frontend.
   - Build command: `npm ci && npm run build:frontend`
   - Publish path: `dist`

2. `vc-portal-owner-api`
   - Express owner API.
   - Root directory: `server/owner-api`
   - Start command: `npm start`

3. `vc-portal-client-api`
   - Express client API.
   - Root directory: `server/client-api`
   - Start command: `npm start`

## Step 1: Confirm Local Deploy-Safe Build

```bash
npm run check
npm run test:api-security
npm run build:frontend
```

Optional local runtime check:

```bash
npm run start:local
```

In another terminal:

```bash
npm run handoff:check-real
npm run test:local-user-flow
```

Expected before deployment:

- Localhost URL warnings are okay.
- Gmail warning is okay only if notifications are not launch-blocking.
- Any failed build/API/Supabase check is not okay.

## Step 2: Create Render Blueprint

In Render:

1. Create a new Blueprint.
2. Connect GitHub repo: `CurlyCr8tive/VC-Portal`.
3. Render should detect `render.yaml`.
4. Create all three services.

Record the actual URLs shown in Render; service names do not guarantee their
public hostnames. The services share one Blueprint but remain three services.
Render frontend builds now require all five public variables. A first build
may fail until the actual URLs are assigned; set the values and rebuild.
Do not use localhost or blank URLs for a deployable frontend artifact.

Before sending live invitations, apply the additive migration
`db/migrations/2026-11-09-trusted-profile-provisioning.sql` through the
Supabase owner's SQL Editor. Existing profiles remain intact. Deploy the
updated owner API so invitations explicitly provision client profiles.

## Step 3: Set Frontend Public Env Vars

Set these on `vc-portal-frontend`:

```env
PUBLIC_SUPABASE_URL=https://bjdzbyfxelshyxoswykk.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<Supabase anon/public key>
PUBLIC_APP_BASE_URL=<deployed frontend URL>
PUBLIC_OWNER_API_BASE_URL=<deployed owner API URL>
PUBLIC_CLIENT_API_BASE_URL=<deployed client API URL>
```

These are browser-visible. Do **not** put service-role keys or OAuth secrets here.

## Step 4: Set Owner API Env Vars

Set these on `vc-portal-owner-api`:

```env
NODE_ENV=production
ALLOW_LOCAL_DEMO_AUTH=false
SUPABASE_URL=https://bjdzbyfxelshyxoswykk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only service role key>
APP_BASE_URL=<deployed frontend URL>
CORS_ALLOWED_ORIGINS=<deployed frontend URL>
```

Optional/live-agent keys:

```env
OPENAI_API_KEY=<optional>
ANTHROPIC_API_KEY=<optional>
NEWSDATA_API_KEY=<optional>
CURRENTS_API_KEY=<optional>
PERPLEXITY_API_KEY=<optional>
GOOGLE_CLIENT_ID=<optional>
GOOGLE_CLIENT_SECRET=<optional>
GOOGLE_REFRESH_TOKEN=<optional>
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIME_ZONE=America/New_York
```

## Step 5: Set Client API Env Vars

Set these on `vc-portal-client-api`:

```env
NODE_ENV=production
SUPABASE_URL=https://bjdzbyfxelshyxoswykk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only service role key>
APP_BASE_URL=<deployed frontend URL>
CORS_ALLOWED_ORIGINS=<deployed frontend URL>
CLIENT_FILE_BUCKET=client-files
CLIENT_FILE_MAX_BYTES=8388608
CLIENT_FILE_ALLOWED_TYPES=application/pdf,image/png,image/jpeg,text/plain,text/csv
GOOGLE_NOTIFY_TO=tenyse@verifiedconsulting.com
```

For live Gmail notifications:

```env
GOOGLE_CLIENT_ID=<Google OAuth client id>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
GOOGLE_REFRESH_TOKEN=<Google OAuth refresh token>
```

Without those three Google values, notes/messages still save, but Gmail notification sending remains disabled.

## Step 6: Redeploy In This Order

1. Owner API.
2. Client API.
3. Frontend.

The frontend build needs the deployed API URLs, so redeploy it after API URLs are known.

## Step 7: Production Readiness Test

On the deployed frontend:

1. Log in as `tenyse@verifiedconsulting.com`.
2. Log in as `jessicadorismond@gmail.com`.
3. Send Greyz Bistro invite to `TheEsmereldaCo@gmail.com`.
4. Open the invite email.
5. Set the pilot client password.
6. Log in as `TheEsmereldaCo@gmail.com`.
7. Confirm the client sees only Greyz Bistro data.
8. Test reports, coaching, notes/messages, files, and any notification behavior.

## Pass Criteria

- Deployed frontend loads.
- Both API `/health` endpoints respond.
- Owner health identifies `service=owner-api`; client health identifies `service=client-api`.
- `supabaseConnected=true` currently means credentials are present, not that a database query or real login succeeded. Verify authenticated reads separately.
- Owner API health shows `localDemoAuthEnabled=false`.
- Login works for owner/admin.
- Pilot invite email points to the deployed frontend, not localhost.
- Pilot client can set password and log in.
- Pilot client cannot see other clients.
- Visible CTAs give real results or useful feedback.

Google account owner actions: enable Gmail/Calendar APIs, authorize a refresh
token with Gmail read/send and Calendar event scopes, and install secrets only
in backend settings. Credential presence alone does not prove scopes, token
validity, email receipt, or Calendar access. Verify scheduling in the intended
time zone; current scheduling parses local dates using the Node runtime time
zone, so configure the owner service `TZ=America/New_York` to match the Calendar
setting for this installation before testing actual meeting times.
