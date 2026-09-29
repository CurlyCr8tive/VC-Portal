# Local PR Platform User Test

Use this before deployment to confirm the build is usable with real Supabase Auth while the frontend and APIs still run on localhost.

## Start The Local Stack

Recommended: run the whole local stack in one terminal:

```bash
npm run start:local
```

Leave that terminal open while testing. It starts:

- owner API on `http://localhost:4001`
- client API on `http://localhost:4002`
- static frontend on `http://localhost:8420`

Alternative: run these in three separate terminals:

```bash
npm run start:owner-api
npm run start:client-api
npm run serve:static
```

Open:

```text
http://localhost:8420/login.html
```

For local testing only, `APP_BASE_URL=http://localhost:8420` is correct because invite links need to return to the local setup page. Before deployment, replace it with the deployed frontend URL.

## Automated Local Check

Run:

```bash
npm run test:local-user-flow
```

This checks:

- static login page responds
- owner API health
- client API health
- Supabase connection
- demo auth disabled
- Gmail notification configuration status

To test real logins too, pass credentials as environment variables. Do not commit these values:

```bash
OWNER_TEST_EMAIL="tenyse@verifiedconsulting.com" \
OWNER_TEST_PASSWORD="<owner password>" \
CLIENT_TEST_EMAIL="<test client email>" \
CLIENT_TEST_PASSWORD="<client password>" \
npm run test:local-user-flow
```

To send one real pilot invite from localhost:

```bash
OWNER_TEST_EMAIL="tenyse@verifiedconsulting.com" \
OWNER_TEST_PASSWORD="<owner password>" \
SEND_PILOT_INVITE=true \
PILOT_CLIENT_NAME="Greyz Bistro" \
PILOT_CLIENT_EMAIL="TheEsmereldaCo@gmail.com" \
npm run test:local-user-flow
```

Only send a pilot invite to an unused email address. The pilot email for this handoff test is `TheEsmereldaCo@gmail.com`, scoped to `Greyz Bistro`. Do not reuse an email already attached to a Supabase user/profile.

## Manual User Test

1. Log in as Tenyse or Jessica.
2. Confirm Dashboard, Clients, Campaigns, Coaching, Review Queue, Reports, and Analytics load.
3. Open a client detail drawer/page with `View`.
4. Send a pilot invite to an unused email.
5. Open the invite email.
6. Set the client password on `set-up-account.html`.
7. Log in as the client.
8. Confirm the client sees only their own campaigns, placements, coaching, reports, notes/messages, and files.
9. Add a client note/message and confirm the owner-side activity/notification path updates.

## Expected Local Warnings

These are acceptable before deployment:

- API URLs use `localhost`.
- Invite redirect uses `localhost`.
- Gmail notifications show unconfigured until Google OAuth env vars are added.

These are not acceptable:

- owner API cannot reach Supabase
- client API cannot reach Supabase
- demo auth is enabled while `NODE_ENV=production`
- owner login cannot load owner pages
- client login can see another client's data
- a visible button does nothing or gives no feedback
