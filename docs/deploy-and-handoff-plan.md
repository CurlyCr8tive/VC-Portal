# PR Platform Deploy, Test, And Final Handoff Plan

Target final handoff deadline: **Wednesday, September 30, 2026**

Goal: deploy the PR platform with real-account testing access today, give Jessica and Tenyse login details for the ideal user flow, collect issues immediately after deployment, finalize fixes by end of day Tuesday, and complete final handoff by September 30 with documentation, account ownership, and known limitations clear.

Scope note: this document covers the **PR platform / VC Portal only**. Raise Local, Grove Park, Google Places, nonprofit/business matching, and the YES Academy/Sofia & Grace demo flow belong to the separate Raise Local platform and are intentionally excluded here.

## Current State

Built and ready for real-account validation:

- Owner portal UI
- Client portal UI
- Real Supabase Auth login path
- Owner/client role checks
- Client-scoped API access
- Client invite route
- Password setup page
- Report approval/publishing model
- Review Queue approval flow
- Canva CSV export workflow
- Client notes/messages
- Client file upload/download
- Gmail notification integration path
- Security Phase 1 hardening
- Real handoff readiness command: `npm run handoff:check-real`

Still needs live setup before Jessica and Tenyse can test properly:

- Deployed frontend URL
- Deployed owner API URL
- Deployed client API URL
- Production/staging environment variables
- `ALLOW_LOCAL_DEMO_AUTH=false`
- `CORS_ALLOWED_ORIGINS=<deployed frontend URL>`
- `APP_BASE_URL=<deployed frontend URL>`
- Gmail/Google OAuth notification credentials
- Real owner/admin accounts for Tenyse and any handoff tester who needs owner access
- At least one real client invite/password setup test

Repo handoff note: Jessica should use GitHub access for the VC Portal repo. ZIP/email attachment sharing is not reliable because Google/Gmail blocked ZIP delivery during the handoff meeting. Until the live cleanup/deploy is complete, the deployed live-candidate URL should be treated as the testing source of truth because the repository may still contain older demo fixtures.

## Tonight / Today: PR Platform Live-Account Prep

### 1. Remove Or Quarantine PR Mock Data

For the PR platform, remove mock/demo data from the live testing path and replace it with real accounts and vetted real records.

Keep any mock fixtures only where they are clearly isolated as developer/demo fallback data. They should not appear in Jessica/Tenyse's live-account test flow.

Rules:

- Do not treat demo data as production truth.
- Do not invite real users into mock accounts.
- Do not copy fake/demo clients into final production unless explicitly approved.
- Do not allow demo-only data to appear in real reports, client portals, exports, or notifications.
- Use demo only to compare expected UI behavior during development.

### 2. Deploy A Testable Staging/Production Candidate

Deploy these pieces:

- Static frontend
- Owner API
- Client API

Recommended environment stance:

- If this is the version Tenyse will test, treat it as **staging/live-candidate**.
- Use real Supabase Auth.
- Use real owner/client accounts.
- Keep the demo bypass disabled.

Required deployed env vars:

```env
NODE_ENV=production
ALLOW_LOCAL_DEMO_AUTH=false
APP_BASE_URL=<deployed frontend URL>
CORS_ALLOWED_ORIGINS=<deployed frontend URL>
SUPABASE_URL=<Tenyse/live Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<backend only>
CLIENT_FILE_MAX_BYTES=8388608
CLIENT_FILE_ALLOWED_TYPES=application/pdf,image/png,image/jpeg,text/plain,text/csv
```

Frontend config must point at deployed services:

```js
// config.js
window.VC_PORTAL_CONFIG = {
  SUPABASE_URL: "<Supabase project URL>",
  SUPABASE_ANON_KEY: "<Supabase anon/public key>",
  APP_BASE_URL: "<deployed frontend URL>",
  OWNER_API_BASE_URL: "<deployed owner API URL>",
  CLIENT_API_BASE_URL: "<deployed client API URL>",
};
```

### 3. Run Readiness Checks

Before sending access to Tenyse:

```bash
npm run check
npm run handoff:check-real
```

Expected:

- `npm run check` passes.
- `npm run handoff:check-real` has no failures.
- Warnings are acceptable only if documented as known limitations.

### 4. Create Real Test Accounts

Minimum before sending testing access:

- 1 real owner/admin account for Tenyse
- 1 real owner/admin or reviewer account for Jessica, if she will test owner flows
- 1 internal test client account
- 1 real or pilot client invite, if Tenyse/Jessica are ready to test the client flow

Owner account requirements:

- `profiles.role = owner`
- correct email
- no `client_id`

Client account requirements:

- `profiles.role = pr_client`
- correct `client_id`
- password set by client through invite/password setup page

### 5. Test The Real Account Chain

Before sending to Jessica and Tenyse, verify:

- Owner can log in.
- Owner dashboard loads.
- Owner can view clients.
- Owner can send invite.
- Invite email arrives.
- Client can open invite link.
- Client can set password.
- Client can log in with email/password.
- Client sees only their own portal/data.
- Client can post a note/message.
- Owner notification email sends if Gmail is configured.
- Send notification test emails to both Jessica and Tenyse if both should receive handoff/testing alerts.

Expected email-test behavior:

- Tenyse and Jessica may receive test invite, password setup, confirmation, or notification messages while the real-account flow is being validated.
- If either person does not receive an expected email, treat that as a handoff blocker until the missing delivery path is explained or fixed.
- If notifications fail but in-app actions still save, document the saved-action behavior and keep notification delivery on the blocker list.

### 6. Meeting Talking Points

Use this in the meeting:

> The demo/mock layer proved the workflows and UI. The work now is validating the real handoff layer: real Supabase accounts, real owner login, real client invites, password setup, real notifications, and client-specific access controls.  
>
> Today I’m deploying a testable live-candidate version of the PR platform so Jessica and Tenyse can start testing the ideal flow with real accounts. I’ll use their feedback to close issues, finalize changes by end of day Tuesday, and complete the full handoff by September 30 with documentation, access, known limitations, and next-step instructions.

## Post-Deployment Testing Plan

### Immediately After Deployment

Focus: real auth and access.

- Owner login
- Jessica/Tenyse tester login
- Client invite
- Client password setup
- Client login
- Wrong-client access test
- Client-only report visibility
- Owner-only page protection

### Next Testing Pass

Focus: client workflows.

- Client messages/notes
- Gmail notification delivery
- Notification delivery to Tenyse
- Notification delivery to Jessica, if she is part of the alert loop
- Client file upload/download
- Approved report visibility
- Canva CSV export
- PDF/report preview behavior
- Review Queue approval/rejection

### End Of Day Tuesday

Focus: all PR platform changes finalized.

- Fix issues flagged by Jessica and Tenyse.
- Remove or quarantine any remaining mock/demo PR data from live flows.
- Replace any remaining empty states in real mode.
- Confirm no demo labels appear in real mode.
- Confirm hover/detail panels still render.
- Confirm data totals and AVE values are explainable.
- Run full checks.
- Finalize docs.
- Confirm Tenyse owner access.
- Confirm Jessica's access path, if applicable.
- Confirm at least one client access path.
- Prepare known limitations list.
- Prepare maintenance/admin notes.

### September 30 Final Handoff

Focus: final handoff.

- Walk through owner login.
- Walk through adding/inviting a client.
- Walk through client login/password setup.
- Walk through report approval/publishing.
- Walk through notifications.
- Walk through Canva export.
- Review environment variables and ownership.
- Review known limitations and next steps.

## Handoff Documentation Requirements

Must be ready by September 30:

### Access And Accounts

- Owner login instructions
- Client invite instructions
- Password setup instructions
- How to resend an invite
- How to revoke or deactivate a client

### Environment / Deployment

- Frontend URL
- Owner API URL
- Client API URL
- Supabase project URL
- Required backend env vars
- Required frontend config values
- Which keys are public vs secret

### Data Management

- How clients are created
- How campaigns are created
- How placements are added
- How Review Queue works
- How AVE is calculated
- Where outlet rates are saved
- How report approval works

### Notifications

- What triggers owner notifications
- Which email receives notifications
- How Gmail OAuth is configured
- What happens if notification sending fails

### Security

- Owner/client role model
- Client data scoping
- RLS overview
- Demo auth disabled in production
- CORS allowlist
- File upload limits
- Known security limitations / next hardening phases

### Known Limitations

This section should be honest and specific:

- Any workflows still using preview/demo data
- Any external API not connected yet
- Any notification path not fully tested
- Any client that does not yet have real data
- Any report export that requires manual Canva upload

## Test Acceptance Criteria

The build is ready for Tuesday handoff when:

- `npm run check` passes.
- `npm run handoff:check-real` has no failures.
- Owner real login works.
- Client real invite/password setup works.
- At least one client portal is verified.
- Client A cannot access Client B data.
- Gmail notification sends from a real client action.
- Approved report is visible to the assigned client.
- Draft report is not visible to the client.
- Canva CSV export works or clearly explains what is missing.
- Upload/download works for allowed file types.
- Demo auth is disabled in production.
- Known limitations are documented.

## Immediate Blockers To Resolve

Based on the latest PR platform handoff check:

- `ALLOW_LOCAL_DEMO_AUTH=true` must be turned off for deployed/live testing.
- `NODE_ENV=production` must be set in deployed APIs.
- `CORS_ALLOWED_ORIGINS` must be set to the deployed frontend URL.
- `APP_BASE_URL` must be set to the deployed frontend URL so invite links do not point to localhost.
- Frontend API base URLs must point to deployed APIs, not localhost.
- Gmail/Google OAuth notification env vars must be completed for real email notifications.
- Test notifications must be sent to Tenyse and Jessica if both need handoff visibility.

## What To Send Jessica And Tenyse After Deploying Today

Send:

- Owner portal URL
- Owner/admin login email(s)
- Temporary/password setup instructions, depending on auth setup
- One test client portal flow
- Known testing focus list
- What feedback you need from her

Suggested message:

> Hi Tenyse and Jessica, I’m sending over the PR platform live-candidate version for testing. The demo version proved the workflow; this version is for validating real accounts, real client access, invite/password setup, notifications, and report visibility.
>
> Please focus on logging in, checking the owner dashboard, reviewing client data, and confirming anything you would need before the September 30 handoff. I’ll be using your feedback to close out fixes and finalize documentation before end of day Tuesday.
