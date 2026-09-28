# PR Platform Deployment Runtime Config

Use this checklist when moving the PR platform from local/demo testing to a deployed handoff build.

## Values Needed Before Sending Invites

1. Deployed frontend URL:
   - Example: `https://verified-consulting-pr-platform.vercel.app`
   - Set this as `APP_BASE_URL` in both API environments.
   - This is what client invite links use for `set-up-account.html`.

2. Deployed owner API URL:
   - Example: `https://vc-owner-api.example.com`
   - Set this in `config.js` as `OWNER_API_BASE_URL`.

3. Deployed client API URL:
   - Example: `https://vc-client-api.example.com`
   - Set this in `config.js` as `CLIENT_API_BASE_URL`.

4. Separate unused pilot client email:
   - Use an email that is not already attached to a Supabase user/profile.
   - Do not reuse `chericeheron@gmail.com`; it is already the internal Greyz Bistro test client.
   - A plus alias is acceptable only if the receiving inbox supports it, for example `chericeheron+pilot@gmail.com`.

## Frontend Config

Update `config.js` before production testing:

```js
window.VC_PORTAL_CONFIG = {
  SUPABASE_URL: "https://bjdzbyfxelshyxoswykk.supabase.co",
  SUPABASE_ANON_KEY: "<public anon key>",
  APP_BASE_URL: "https://<deployed-frontend>",
  OWNER_API_BASE_URL: "https://<deployed-owner-api>",
  CLIENT_API_BASE_URL: "https://<deployed-client-api>",
};
```

`SUPABASE_ANON_KEY` is public and browser-safe. Never put `SUPABASE_SERVICE_ROLE_KEY`, Gmail OAuth secrets, refresh tokens, or API provider secrets in `config.js`.

## Owner API Environment

Set these on the deployed owner API host:

```env
NODE_ENV=production
ALLOW_LOCAL_DEMO_AUTH=false
APP_BASE_URL=https://<deployed-frontend>
CORS_ALLOWED_ORIGINS=https://<deployed-frontend>
SUPABASE_URL=https://bjdzbyfxelshyxoswykk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only service role key>
```

## Client API Environment

Set these on the deployed client API host:

```env
NODE_ENV=production
APP_BASE_URL=https://<deployed-frontend>
CORS_ALLOWED_ORIGINS=https://<deployed-frontend>
SUPABASE_URL=https://bjdzbyfxelshyxoswykk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<backend-only service role key>
GOOGLE_NOTIFY_TO=tenyse@verifiedconsulting.com
```

Add Gmail OAuth values only through the backend host's secret manager. Do not email or commit them.

## Verification

Run after the URLs are set:

```bash
npm run check
npm run handoff:check-real
```

Passing criteria for this portion:

- Owner API frontend URL is not localhost.
- Client API frontend URL is not localhost.
- Invite redirect base URL is not localhost.
- Owner API demo auth is disabled.
- Real owner/client login works.
- A pilot invite creates a set-up link to the deployed frontend, not localhost.
