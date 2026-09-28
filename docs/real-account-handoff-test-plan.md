# Real Account And Notification Handoff Test Plan

Use this plan to move the PR platform from mock/demo proof to real accounts, real invites, real passwords, and real notifications before the September 30 handoff.

Scope note: this plan applies to the PR platform / VC Portal only. Raise Local account setup, nonprofit/business matching, Grove Park demo prep, and Google Places work are separate.

## Core Rule

Do not convert mock accounts into production accounts.

Use mock data for rehearsal only. For handoff, create real Supabase Auth users and attach them to real `profiles` rows through the app metadata/trigger path.

## Account Setup Order

### 1. Confirm Production Environment

Required backend env vars:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production`
- `CORS_ALLOWED_ORIGINS=<final frontend URL>`
- `APP_BASE_URL=<final frontend URL>`
- `ALLOW_LOCAL_DEMO_AUTH=false`

Required frontend config:

- `config.js` -> `SUPABASE_URL`
- `config.js` -> `SUPABASE_ANON_KEY`
- `config.js` -> `OWNER_API_BASE_URL=<deployed owner API URL>`
- `config.js` -> `CLIENT_API_BASE_URL=<deployed client API URL>`
- `config.js` -> `APP_BASE_URL=<deployed frontend URL>`

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend files.

### 1A. Provision The Real Handoff Accounts

Use the provisioning script in dry-run mode first. It reads `server/owner-api/.env`, checks the real Supabase project, and prepares:

- Tenyse owner/admin
- Jessica tester/admin, when her email is supplied
- one internal `pr_client` test account tied to an existing client row
- one pilot invite target to send through the live owner portal

Dry run:

```bash
npm run auth:provision-test-accounts -- \
  --jessica-email "jessica@example.com" \
  --jessica-name "Jessica" \
  --internal-client-name "Greyz Bistro" \
  --internal-client-email "internal-client-test@example.com" \
  --pilot-client-name "Candlelit Care" \
  --pilot-client-email "pilot-client@example.com"
```

Apply only after confirming the emails:

```bash
npm run auth:provision-test-accounts -- \
  --jessica-email "jessica@example.com" \
  --jessica-name "Jessica" \
  --internal-client-name "Greyz Bistro" \
  --internal-client-email "internal-client-test@example.com" \
  --pilot-client-name "Candlelit Care" \
  --pilot-client-email "pilot-client@example.com" \
  --write
```

The pilot client invite should still be sent from the owner portal using `Invite Client`. That tests the real invite email, password setup page, Supabase Auth metadata trigger, and `profiles.role = pr_client` / `profiles.client_id` wiring end to end.

### 2. Create Or Confirm Tenyse's Owner Account

The owner account must have:

- Supabase Auth user
- `profiles.role = owner`
- correct email
- no `client_id`

Test:

- Log in as owner.
- Confirm owner dashboard loads.
- Confirm owner can see all clients.
- Confirm owner-only pages load: Review Queue, Reports, Analytics, Settings.

If Jessica needs to test owner/admin flows, create or confirm a separate real owner/admin testing account for her too. Do not share passwords between testers.

### 3. Create One Internal Test Client

Before inviting a real client, create one test client record and one test client login.

Test:

- Client can log in.
- Client sees only assigned client data.
- Client cannot see Review Queue, outlet rates, agent runs, learning events, or other clients.
- Client can post a note/message.
- Owner receives notification if Gmail/Google notification env vars are configured.

### 4. Send One Real Invite

From the owner portal:

1. Open Clients.
2. Choose a real client.
3. Click Invite Client.
4. Enter the client's real email.
5. Confirm Supabase sends the invite.
6. Client opens the email.
7. Client lands on `/set-up-account.html`.
8. Client sets password.
9. Client signs in with email/password.

Expected:

- Owner never sees or handles the client password.
- Password goes directly from `set-up-account.html` to Supabase Auth.
- Client profile role is `pr_client`.
- Client profile has the correct `client_id`.

### 5. Real Notification Test

Trigger a real notification:

1. Log in as a client.
2. Post a campaign note or general message.
3. Confirm note saves.
4. Confirm owner notification email is sent to `GOOGLE_NOTIFY_TO` / `GMAIL_NOTIFY_TO`.
5. Send/confirm test notifications to Tenyse and Jessica if both are part of the testing or handoff notification path.

Expected:

- Tenyse and Jessica may receive test emails during this process.
- Every expected email has a named purpose: invite, password setup, confirmation, or owner notification.
- Any missing email is logged as a blocker or known limitation with the exact recipient, action, and timestamp.

If notification does not send:

- The note should still save.
- Check `server/client-api/.env`.
- Confirm Gmail API enabled.
- Confirm refresh token is valid.
- Confirm notify-to address is set.

## Command Line Readiness Check

Run:

```bash
npm run handoff:check-real
```

This checks:

- frontend Supabase config
- frontend API URLs
- backend `.env` presence
- production `NODE_ENV`
- CORS allowlists
- demo auth disabled
- Supabase service-role env vars
- invite redirect URL
- Gmail notification env vars
- owner/client API health endpoints when reachable

Warnings are acceptable for local testing. Failures must be fixed before production handoff.

## Minimum Real Test Matrix

| Area | Test | Expected result |
| --- | --- | --- |
| Owner auth | Tenyse signs in | Owner portal opens |
| Owner role | Owner opens all clients | All client data visible |
| Client auth | Client signs in | Client portal opens |
| Client scoping | Client A tries Client B data | Blocked or empty |
| Invite email | Owner sends invite | Supabase email arrives |
| Password setup | Client sets password | Password saved in Supabase |
| Report visibility | Draft report | Not client-visible |
| Report visibility | Approved/published report | Assigned client can see it |
| Review Queue | Confirm mention | Placement created |
| Review Queue | Reject mention | No placement created |
| Notification | Client posts note | Owner email notification sent |
| Upload | Client uploads PDF/image | Upload succeeds |
| Upload | Client uploads unsupported file type | Upload rejected |
| Production guard | `ALLOW_LOCAL_DEMO_AUTH=true` in production | Owner API refuses to start |
| CORS | Unknown origin calls API | API returns blocked origin |

## Before September 30 Handoff

Complete these before declaring real accounts ready:

- Tenyse owner login confirmed.
- Jessica tester/admin access confirmed, if applicable.
- At least one real client invite/password flow confirmed.
- At least one client notification email confirmed.
- At least one approved client report visible to assigned client only.
- At least one file upload/download confirmed.
- `npm run check` passes.
- `npm run handoff:check-real` has no failures.
- Any warnings are written into known limitations.

## What To Tell Tenyse

> We proved the portal with mock/demo data first. Now I’m validating the real handoff layer: real Supabase Auth accounts, invite emails, client password setup, notification emails, and client-specific data access. The goal is that you can manage accounts without handling client passwords, clients only see their own portal, and production is locked away from demo-only bypasses.
