# PR Platform Readiness Review - November 9, 2026

Scope: Verified Consulting PR Platform and coaching only. No deployment,
commit, push, live account mutation, email, or database migration was performed.

## Repository And Dependency Review

- Working tree was clean before work. Fetched GitHub refs successfully.
- Local main and origin/main match at `9a18c40`; no open pull requests found.
- GitHub returned no deployments, commit statuses, or check runs identifying
  the current Render service URLs. Render dashboard verification is required.
- Both API lockfiles were updated without `--force` or major upgrades:
  Express 4.22.2 -> 4.22.3; body-parser 1.20.6 -> 1.20.9;
  proxy-addr 2.0.7 -> 2.0.8; qs 6.15.3 -> 6.16.2.
- Compatible path-to-regexp patch resolution also changed with Express.
- Both APIs pass clean `npm ci --ignore-scripts` installs and npm audits
  with zero reported vulnerabilities at review time.
- Added the missing root package-lock.json required by Render's `npm ci`.

## Local Fixes Prepared For Review

- Render frontend builds reject missing, localhost, or non-HTTPS origins.
  Local frontend builds continue to support local addresses.
- Production invitations refuse invalid/local redirects instead of silently
  emailing localhost links.
- Signup trigger no longer trusts user-editable role/client_id metadata.
  Authenticated owner invitations explicitly provision the client profile.
- Added an incremental SQL migration preserving existing profiles. It has
  NOT been applied to hosted Supabase. Updated fresh-install SQL as well.
- Added `npm run test:api-security`: mocked owner/client JWT and profile
  gates, SQL authorization-source regression, Render config rejection, and
  isolated HTTP health/CORS/parser/unauthenticated-route tests for both APIs.
- Handoff checker now states its local scope, checks API service identity,
  and explains that health configuration flags do not prove DB connectivity.

## Validation Results

- `npm run check`: passed (143 JavaScript files parsed; six HTML files checked).
- `npm run test:api-security`: all seven tests passed; test processes stopped.
- `npm run build:frontend`: passed for local configuration.
- Root `npm ci --ignore-scripts --no-audit --no-fund`: passed.
- Both API clean installs and final npm audits: passed, zero vulnerabilities.
- `git diff --check`: passed.
- SQL authorization-source checks are static regressions. The migration has
  not been executed against a test or production Postgres instance here.
- The HTTP tests passed with localhost socket access, using fake Supabase
  credentials and no live account writes.

## Local Configuration Observed

| Area | Observation | Meaning |
| --- | --- | --- |
| Frontend/API addresses | Localhost API targets | Local testing config, not proof of hosted settings |
| Invitations | Local APP_BASE_URL | Must use final hosted frontend origin in Render |
| APIs | NODE_ENV=production; owner demo auth disabled | Local files only |
| CORS | Localhost/127.0.0.1 allowlists | Hosted frontend origin still needs confirmation |
| Supabase | URL and backend credentials present | Credentials were not printed; no live login/query verified |
| Google OAuth | Client ID, secret, refresh token absent in both local API env files | Gmail/Calendar unavailable locally |
| Calendar | Owner calendar ID/time-zone settings present | Does not prove OAuth access or correct hosted time handling |
| Local handoff check | 0 failures, 6 warnings | Includes stopped local APIs; not production approval |

## Public Hosted Probes

The following are candidate addresses inferred from Blueprint/service names,
not verified Render dashboard URLs. Requests were unauthenticated and read-only.

| URL | Result |
| --- | --- |
| https://vc-portal-frontend.onrender.com/login.html | HTTP 404 |
| https://vc-portal-owner-api.onrender.com/health | HTTP 404 |
| https://vc-portal-client-api.onrender.com/health | HTTP 404 |
| https://vc-client-api.onrender.com/health | HTTP 404 |
| https://vc-owner-api.onrender.com/health | Initial timeout; retry HTTP 200 identifying service=client-api |

The last endpoint reports Supabase configuration presence, but lacks the newer
nodeEnv/demo-auth fields. Do not configure it as the owner API without fixing
and verifying the service identity. No hosted owner API or frontend is verified.

## Read-Only Hosted Supabase Check

A read-only REST query to the configured Supabase project succeeded using the
local backend credentials. It returned seven profiles: four owners and three
assigned pr_client profiles, with no unassigned pr_client profiles.

Tenyse and Jessica have matching owner profiles without client_id values.
The handoff-listed `cjerice.heron@pursuit.org` owner profile was not found;
confirm the intended developer email before provisioning anything. Review
all four owner assignments. No passwords, tokens, client records, or extra
owner identities were printed. No account/profile records were changed.

This confirms a database read from this machine, not Render's secret settings,
real user login, the installed trigger version, or deployed RLS isolation.

## Account Isolation Findings

Owner API checks a verified Supabase user and database profiles.role=owner.
Client API requires profiles.role=pr_client and a nonempty client_id. Routes
scope list queries to that client and check campaign/homework ownership before
access or writes. Report reads require approved/published status. Tests verify
role gates with stubs; they do not prove deployed RLS or cross-client isolation.

The previous signup trigger trusted raw_user_meta_data for role and client_id.
If deployed with public signup enabled, a signup could request unauthorized
owner/client access. The prepared migration switches to raw_app_meta_data.
Supabase guidance: https://supabase.com/docs/guides/auth/users

Apply the migration before allowing new live signups/invites, deploy the updated
owner invite handler, and review existing owner/profile assignments against
the intended account list. Do not automatically trust or backfill old user
metadata. Existing authorized profiles are deliberately preserved.

Both APIs use service-role clients, bypassing RLS. Route-level authorization is
mandatory; database RLS only independently protects direct browser requests.
Verify client A cannot access client B through BOTH the API and direct Supabase.

## Account-Owner Actions And Next Steps

1. Review this local diff before committing/pushing/deploying.
2. Supabase owner: apply the new migration; review existing roles/client links,
   enabled signup methods, and all required migrations/policies/storage rules.
3. Render owner: confirm the actual three service URLs, repository/branch/root
   directory/start commands and deployed commit. Resolve the owner/client
   identity mismatch. Install the reviewed dependency lockfiles by deployment.
4. Set frontend PUBLIC_* URLs and backend APP_BASE_URL/CORS_ALLOWED_ORIGINS
   to matching deployed origins. Rebuild the frontend. Keep demo bypass off.
5. Supabase owner: set Auth Site URL and allowed invitation/password redirects
   to the deployed frontend and set-up-account.html; verify email delivery.
6. Google owner: authorize Gmail read/send and Calendar event scopes, enable
   APIs, and enter OAuth secrets in both backend service settings. Configure
   notification recipient and calendar/time zone. For current scheduling code,
   ensure owner Node TZ matches GOOGLE_CALENDAR_TIME_ZONE before meeting tests.
7. With real test sessions, verify Tenyse/Jessica owner access, pilot invite and
   password setup, PR/coaching access, client A/B API and direct-RLS isolation,
   draft-report privacy, files, and notes/messages. Keep passwords private.
8. Confirm receipt of notification emails and correct Calendar event time;
   code currently sends client-note/message alerts, not a general durable
   notification queue for every discovery or lead-time change.

No credential presence flag, historical handoff note, or public health response
substitutes for those authenticated acceptance tests.

## Follow-Up: Render Services Confirmed

Render's **My project / Production** lists these two standalone services for
`CurlyCr8tive/VC-Portal` on `main`. The last successful deploy shown for both
was `c525e886585d5c8b268a5d3a0717fd1f01225cf5`.

| Render service | Public origin | Root directory |
| --- | --- | --- |
| [VC-Owner-API](https://dashboard.render.com/web/srv-d9vti5tg1s2s73bs3sk0) | `https://vc-owner-api-kkkd.onrender.com` | `server/owner-api` |
| [VC Client API](https://dashboard.render.com/web/srv-d9vtecu1egvs73fccth0) | `https://vc-owner-api.onrender.com` | `server/client-api` |

The client API's hostname is misleading; the Render service name and root
directory agree with the `client-api` health identity. Do not swap the API
origins. No VC frontend or applied VC Blueprint was visible in this workspace.
Both API environment pages showed Supabase settings but no explicit app origin,
CORS allowlist, or Google OAuth settings. Verify the final frontend origin and
configure it before testing invitations or changing the existing services.

The signed-in Supabase browser account and CLI could not access project
`bjdzbyfxelshyxoswykk` for SQL administration. Backend credentials used for the
earlier profile read are not database-admin access. Have a project admin apply
the specific trusted-profile migration, or provide project access through
Supabase, before releasing the coordinated update. Do not share database
passwords or provider tokens in chat.

## Follow-Up: Two-Client Isolation Gate

The placements view can bypass row-level security when browser roles have
direct SELECT access. The base table can also expose private notes on the
client's own rows. The placement-browser-access migration revokes direct
browser access to both relations and preserves service-role API access.
The updated client API still scopes its view query to the authenticated
profile's client ID and masks private notes.

Both migrations ran successfully on a disposable PostgreSQL 15 instance.
The fixture exercised two authenticated identities, owner-metadata forgery,
draft report privacy, placement grants, and API-side note masking. This is
not proof of live Supabase Auth, deployed API isolation, or email delivery.

Apply both migrations before the coordinated deploy. Keep real client
invitations on hold until the [two-client release gate](real-account-handoff-test-plan.md)
passes. Check Gmail and Calendar separately afterward.
