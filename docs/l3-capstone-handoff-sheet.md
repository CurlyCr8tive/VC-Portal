# Google SMB Handoff Sheet

_Project: Verified Consulting PR Platform_

_Last updated: October 1, 2026_

This is the supporting detail behind the final handoff email. It is written so Tenyse, Jessica, a future developer, or a new staff member can understand what was built, what is ready, what still needs deployment verification, and how to continue from here.

## 1. Project Overview

### What Was Built

The Verified Consulting PR Platform is a two-sided owner and client portal for organizing PR campaigns, press placements, publicity value, client updates, reporting, and coaching progress. It was built to reduce the amount of Verified Consulting work living across spreadsheets, documents, emails, Canva files, and memory, and to make Tenyse's client-facing proof easier to review and share.

The build includes an owner/admin dashboard for Tenyse and her team, plus client-facing views for PR clients and coaching clients. It also includes demo workflows for walkthroughs and a real Supabase Auth path for production-style account testing.

### Scope Boundaries

Included in this capstone scope:

- owner/admin portal
- client portal
- PR campaign and placement tracking
- report drafting and export workflows
- AVE/publicity value calculation support
- coaching program visibility
- client notes/messages and file workflows
- Supabase Auth path for real accounts
- Render deployment blueprint
- handoff documentation and testing plans

Not fully included in this capstone scope:

- final production deployment QA after Render URLs are created
- fully validated Gmail notification delivery until Google OAuth env vars are configured
- long-term maintenance
- full Google Places integration
- broader Raise Local Phase 2 discovery/matching features
- ongoing hosting/API costs after handoff

### Completed Features

- Login page with real Supabase account choices for Tenyse, Jessica, and Cherice.
- Owner/Admin Demo, PR Client Demo, and Coaching Client Demo workflows.
- Reset demo data button for clearing browser-local walkthrough edits.
- Owner dashboard with KPIs, filters, recent placements, coaching overview, campaign progress, performance insights, and activity.
- Clients page with filters, quick actions, client rows, client detail behavior, CSV export, and insights.
- Campaign and placement workflows.
- Reports and Results page with report builder, executive summary drafting, report narrative drafting, Canva CSV workflow, PDF fallback messaging, and client-facing report previews.
- Coaching Program views for overview, clients, programs, resources, opportunities, templates, and settings.
- Client portal views for PR and coaching clients.
- CTA/link/button protocol and QA documentation.
- Render deployment files and deployment checklist.
- Real account and invite test plan.
- Security hardening Phase 1 documentation.

## 2. Demo

### Demo Link

[Insert deployed Render frontend URL or Demo Day recording link]

### Local Demo Links

Use these only when the local frontend is running:

- Login page: `http://localhost:8420/login.html`
- Owner preview: `http://localhost:8420/owner.html?demo=owner&preview=1`
- PR client preview: available from the login page as **PR Client Demo**
- Coaching client preview: available from the login page as **Coaching Client Demo**

### Demo Notes

Use the login page as the start point. The demo workflow buttons are separate from real live accounts. Use **Reset demo data** before a rehearsal if the browser has old preview notes, uploads, reports, or seeded state.

## 3. Repository And Project Files

### Repository Link

`https://github.com/CurlyCr8tive/VC-Portal`

### Live App URL

[Insert deployed Render frontend URL]

### What Is In The Repository

The repository contains:

- browser frontend files
- owner portal source
- client portal source
- owner API
- client API
- Supabase-related scripts and handoff utilities
- Render deployment blueprint
- local stack runner
- build and QA scripts
- handoff documentation
- agent and AVE documentation

### README Coverage

The README and linked handoff docs cover:

- what the app does
- local setup
- local testing
- deployment checklist
- environment variables
- Supabase/Auth notes
- real account testing
- handoff documentation index

### Transfer Instructions

If Verified Consulting would like full ownership of the codebase, the GitHub repository can be transferred directly to a Verified Consulting GitHub account or organization. Tenyse or Jessica should share the target GitHub username or organization name, and the current repository owner can initiate the transfer.

After transfer, Verified Consulting should confirm:

- repository admin access
- Render access
- Supabase ownership/access
- environment variable ownership
- API key ownership
- billing ownership for any paid services

## 4. Documentation And User Guide

### Documentation Link

[Insert Google Doc handoff link]

Primary repo documentation starts here:

- `HANDOFF.md`
- `docs/handoff-index-2026-10-01.md`
- `docs/tenyse-use-guide.md`
- `docs/technical-handoff.md`
- `docs/render-deployment-checklist.md`
- `docs/real-account-handoff-test-plan.md`
- `docs/cta-link-qa-protocol.md`

### Loom Walkthrough Link

[Insert Loom walkthrough link]

### Flows Documented

- owner/admin login
- demo workflows
- reset demo data
- dashboard walkthrough
- clients page and client detail behavior
- campaign tracking
- press placement tracking
- report builder
- AI-generated executive summary and narrative workflow
- Canva CSV export workflow
- client invite/password setup plan
- client portal flow
- coaching client flow
- local testing flow
- Render deployment flow
- real account handoff testing
- CTA/link QA protocol

## 5. Final Presentation And Lookbook

### Slide Deck Link

[Insert final Demo Day presentation link]

### Lookbook Link

[Insert Pursuit Lookbook link]

### Context

The presentation and lookbook should describe the problem Verified Consulting brought to the project: making PR, coaching, reporting, and partnership work more visible and easier to act on. The PR Platform is the immediate workflow solution, while Raise Local is a related but separate platform direction.

## 6. Credentials, Access, And Cost Safety

### Services Running Or Prepared

| Service | Purpose | Status |
| --- | --- | --- |
| GitHub | Source code and version history | Repo exists at `CurlyCr8tive/VC-Portal` |
| Supabase | Auth and live data backend | Configured for real auth path |
| Render | Frontend/API deployment target | Blueprint exists; deployment still needs final URL/env setup |
| Owner API | Owner/admin backend routes | Prepared as separate Render service |
| Client API | Client portal backend routes | Prepared as separate Render service |
| Google/Gmail OAuth | Notification delivery | Requires final OAuth env vars before production validation |
| OpenAI/Anthropic/search providers | AI/reporting/discovery helpers | Requires owner-controlled API keys in backend env vars |

### Credentials Handed Off

Do not store passwords or secrets in this shared document.

Credentials/secrets should be shared through a secure channel or entered directly into the relevant service dashboard:

- Supabase dashboard access
- Supabase service-role key
- Supabase anon key
- Render account/project access
- Render environment variables
- Google OAuth credentials
- API keys for AI/search providers
- temporary user passwords

### Planned Real Accounts

| Person | Email | Intended Role |
| --- | --- | --- |
| Tenyse Williams | `tenyse@verifiedconsulting.com` | Owner/Admin |
| Jessica Dorismond | `jessicadorismond@gmail.com` | Admin/Developer tester |
| Cherice Heron | `cjerice.heron@pursuit.org` | Admin/Developer tester |

### Cost Safety

Before final handoff, confirm:

- who owns the Supabase project
- who owns the Render deployment
- whether paid tiers are enabled
- whether AI/search provider keys are active
- whether Google OAuth/API services are active
- how to pause or shut down each service

### How To Shut It Down

If Verified Consulting wants to pause or stop the project:

1. In Render, suspend or delete the frontend, owner API, and client API services.
2. In Supabase, pause the project if available on the selected plan, or export data before deleting.
3. Rotate or revoke any exposed API keys.
4. Disable Google OAuth credentials if Gmail notification delivery is no longer needed.
5. Archive the GitHub repo if the code should remain accessible but inactive.

## 7. Known Limitations And Recommended Next Steps

### Known Limitations / Bugs

**Limitation: Deployment still needs deployed QA.**  
Impact: The build is deploy-prepared, but final production readiness requires deployed URL testing after Render services exist.  
Workaround: Follow `docs/render-deployment-checklist.md` and `docs/real-account-handoff-test-plan.md`.

**Limitation: Gmail notifications need final OAuth configuration.**  
Impact: Notification UI and planned flows exist, but live Gmail delivery cannot be fully confirmed until Google OAuth env vars are configured.  
Workaround: Treat notifications as launch-ready only after OAuth credentials are added and test emails are received.

**Limitation: Provider-backed AI/search depends on API keys.**  
Impact: Some live AI/search functionality may use fallback behavior if provider keys are missing.  
Workaround: Add owner-controlled API keys to backend environment variables and test report generation/discovery flows.

**Limitation: Demo workflows are not production accounts.**  
Impact: Demo workflows are useful for walkthroughs but should not be treated as real client access.  
Workaround: Use Supabase Auth accounts and the real invite/password setup flow for production testing.

**Limitation: Google Places integration is Phase 2.**  
Impact: Public business discovery for Raise Local / Grove Park demo is not part of this PR Platform handoff.  
Workaround: Use manually curated potential businesses for the Grove Park presentation and scope Google Places as a future build.

### Recommended Next Steps

1. Deploy the frontend, owner API, and client API through Render.
2. Add production environment variables.
3. Update frontend/API URLs after Render service URLs are known.
4. Test Tenyse owner login.
5. Test Jessica admin login if she is part of owner-flow testing.
6. Send one pilot invite and test password setup.
7. Confirm client scoping.
8. Configure Gmail OAuth and test notification delivery.
9. Run the CTA/link QA protocol after any future redesign.
10. Transfer repository/service ownership to Verified Consulting or Jessica’s developer account if requested.

### User Data Notes

Data may exist in two places:

- **Supabase live data:** real records, real auth users, profiles, client records, placements, reports, notes, and related backend-managed data.
- **Browser-local demo data:** preview-only data stored under `vc_...` keys in localStorage/sessionStorage for walkthroughs.

Use the login page **Reset demo data** button to clear browser-local demo state. Do not rely on that button to delete real Supabase data.

For live data export/deletion:

- use Supabase table exports
- use app-level CSV exports where available
- have a developer run scoped deletion scripts only after confirming the target records
