# Tenyse Use Guide

_Verified Consulting PR Platform + Raise Local demo handoff_

_Last updated: September 20, 2026._

## What This Build Is For

The PR Platform helps Verified Consulting organize PR activity into client-ready proof:

- client and campaign visibility
- press placements and publicity value
- report drafting
- Canva-ready export
- client portal views
- coaching progress and homework
- client messages and coaching requests

Raise Local is the next evolution: a relationship-building platform for matching nonprofits and small businesses while keeping Tenyse as the human reviewer and decision-maker.

## Demo Links

Use these local links when the static server is running. Replace them with the deployed URLs after the PR Platform is live on Vercel:

- Owner PR Platform: `http://127.0.0.1:8420/owner.html?demo=owner&recording=pr-platform`
- Greyz Bistro coaching client: `http://127.0.0.1:8420/client.html?demo=greyz-bistro&view=coaching&recording=pr-platform`
- PR-only client preview: use VeganHood, SNAP Co., or another PR-only client preview from the login page.
- Raise Local: use the current Raise Local demo workspace link.

Do not show real login credentials during a recording or live presentation. Share production credentials separately and privately.

## Access And Credentials Chart

Use this chart as the handoff tracker. Fill the final live credentials in after deployment and official account creation.

| Item | What It Is | Current / Demo Access | Final Handoff Note |
| --- | --- | --- | --- |
| PR Platform owner demo | Tenyse owner preview | `owner.html?demo=owner`; demo password currently `Testing123` if using the login form | Replace with Tenyse's official live account after deployment |
| PR Platform client demos | Client preview accounts | Demo previews from the login page; demo password currently `Testing123` if using the login form | Clients should create official logins after live deployment |
| Supabase | Database/auth backend | Tenyse has the Supabase login; credentials should be shared privately | Keep service-role keys private; do not put them in frontend files |
| GitHub repo | Full source code and version history | `https://github.com/CurlyCr8tive/VC-Portal.git` | Future CTO/developer can download, clone, or continue from this repo |
| PR Platform deployed URL | Live website | To be added after Vercel deployment | Use this for handoff once deployment is complete |
| Owner API URL | Live owner backend | To be added after API deployment | Needed for real owner login, reports, agents, invites, messages |
| Client API URL | Live client backend | To be added after API deployment | Needed for real client portal saves/messages/files |

## Best 8-Minute Demo Flow

### 0:00-0:45: Introduction

Cherice introduces herself and Tenyse.

Tenyse briefly explains Verified Consulting:

- PR
- coaching
- relationship-building
- helping clients flourish

### 0:45-1:45: Pain Points

Tenyse names the pain points:

- PR work lives across notes, spreadsheets, emails, Canva, and memory.
- Clients do not always see the behind-the-scenes work.
- Coaching needs visible progress, homework, and follow-up.
- Raise Local came from a real gap in local partnership-building.

Cherice transitions:

> “So I built around one idea: make Tenyse’s work visible, organized, and easier to act on without removing her judgment.”

### 1:45-2:30: Solution Overview Slides

Show the two-part build:

- Verified Consulting PR Platform
- Raise Local

Say:

> “The PR Platform solves the immediate reporting and client visibility need. Raise Local extends that same infrastructure into Tenyse’s broader relationship-building work.”

### 2:30-4:15: PR Platform Report Flow

Open the owner demo.

Click:

1. Reports
2. Choose a strong client/report
3. Show the workflow cards:
   - Choose client
   - Draft with AI
   - Review + approve
   - Export
4. Show the Executive Summary and Report Narrative.
5. Show Save Draft and Approve.
6. Show Canva CSV / report export.

Say:

> “This is the highest-priority PR workflow: turning placements into report-ready language and structured export files. AI gives Tenyse a faster starting point, but she still edits, approves, and controls what becomes client-facing.”

Avoid spending time on lead time. If asked:

> “Lead time is represented with demo data for now. Full Gmail and Calendar-based tracking is intentionally post-demo.”

### 4:15-5:10: Client Portal + Coaching

Open the Greyz Bistro coaching client view.

Show:

- coaching roadmap
- current phase
- homework
- resources
- reflection prompt
- opportunities

Say:

> “PR does not end when a placement lands. For clients enrolled in coaching, the portal shows where they are in the program, what is due, what resources they have, and how Tenyse keeps the relationship moving.”

Mention:

> “For PR-only clients, the portal now includes a request path to ask about coaching, so PR momentum can turn into deeper client support.”

### 5:10-7:20: Raise Local Walkthrough

Open Raise Local.

Show:

1. landing page
2. find-a-match quiz
3. match results
4. dashboard
5. admin/persona switch if ready

Say:

> “Raise Local came from the same pattern: Tenyse sees opportunities between people and organizations, but the process needs structure. This platform helps nonprofits and small businesses describe what they need or can offer, then surfaces possible matches.”

Important line:

> “AI can suggest a match. Tenyse approves the relationship.”

### 7:20-8:00: Closing

Cherice:

> “Together, these builds show an operating system for relationship-driven work. The PR Platform turns results into client-facing proof. The coaching flow keeps clients moving after visibility lands. Raise Local extends that same infrastructure into local partnerships. The value is not automation for its own sake. It helps Tenyse move faster while keeping her relationships, judgment, and voice at the center.”

Tenyse:

> “What I appreciate is that this reflects how Verified Consulting actually works. It supports the PR, coaching, and connection-building that help clients flourish.”

## How To Use The PR Platform

### Owner Dashboard

Use the owner dashboard for a high-level view of:

- clients
- press placements
- publicity value
- campaigns
- coaching programs
- recent activity

### Reports

Use Reports for the main demo workflow. This is the priority PR Platform demo flow from the September 20 meeting.

Steps:

1. Open Reports.
2. Select the client/report package.
3. Confirm the report date window.
4. Generate or review the Executive Summary.
5. Edit the text.
6. Click Save Draft.
7. Click Approve when ready.
8. Generate/review the longer narrative.
9. Export CSV or Canva-ready CSV.

The report workflow is designed so Tenyse controls what becomes client-facing.

### Lead Time

Lead time should not be the main demo feature.

Current demo:

- lead-time values can use mock/demo data
- reports and dashboard can still tell the story without live Gmail/Calendar

Post-demo:

- connect Gmail and Google Calendar
- calculate lead time from real pitch/send/landed dates where available
- keep manual override fields for cases that cannot be inferred automatically

### Client Messages

Owner side:

1. Go to Clients.
2. Pick a client.
3. Click View Messages.
4. Review notes, questions, and coaching requests.

Client side:

1. Go to Messages.
2. Add a subject and message.
3. Click Send Message.

PR-only clients also have a coaching request CTA from their dashboard. That request is saved as a message to Tenyse.

### Coaching Program

Owner side:

1. Go to Coaching Program.
2. Use the client selector to switch between enrolled coaching clients.
3. Review:
   - current phase
   - homework
   - resources
   - opportunities
   - communication flow

Client side:

1. Open Greyz Bistro coaching view.
2. Show the roadmap, current phase, homework, resources, opportunities, and reflection prompt.

Clients enrolled in coaching see the full coaching experience. PR-only clients should see a request path instead of the full coaching workspace.

## How To Use Raise Local In The Demo

Use Raise Local to show the future-facing relationship system:

- new visitors take the quiz
- existing contacts can log in directly
- nonprofit and business users have different paths
- the match result explains why a fit is recommended
- Tenyse/admin reviews before a relationship moves forward

Use the seeded Fresh Start Pantry and Yamaas match if available, because it is the strongest walkthrough example.

## What Is Demo-Ready

- PR report workflow
- AI-assisted report drafting
- Canva/report CSV export path
- client portal preview
- Greyz Bistro coaching program
- PR-only coaching request CTA
- Raise Local walkthrough, if the current workspace is running

## What Is Post-Demo

- live Gmail/Google Calendar lead-time tracking
- Google notification/email automation
- final production deployment
- final file storage policies
- real client onboarding at scale
- full production hardening
