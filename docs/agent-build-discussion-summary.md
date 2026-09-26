# Verified Consulting Agent Build Discussion Summary

This document captures the Q&A portion requested after the user said **DONE**. It summarizes how the project agents were built, what supports the AVE calculations, how the agents were tested, what memory protocols exist, what learning layers were missing, and what security controls are already in the build.

## Agents Built

### Discovery Agent

The Discovery Agent was built as a candidate-finding workflow, not an auto-publishing workflow. It uses client keywords, aliases, campaign context, and source metadata to surface likely media mentions into the owner Review Queue.

Confirmed behavior:

- Candidate mentions land in `review_queue`.
- The owner must confirm or reject each item.
- Confirmed items can become real placements.
- Rejected items stay as memory so similar false positives can be suppressed later.
- Demo mode can preview candidate review without pretending to create client-facing records.

### AVE Calculation Agent

The AVE Agent calculates and audits publicity value from placement records. It uses saved outlet rates first, then source-based estimates, then marks uncertain values rather than guessing silently.

Confirmed behavior:

- Placement AVE values roll up into campaign, client, dashboard, report, and chart totals.
- Average value per win is calculated as total AVE divided by placement count.
- Known duplicate or questionable values are flagged with `aveDataQuality`.
- Saved outlet rates become preferred values over estimated audience formulas.

### Writing Agent

The Writing Agent drafts client-facing summaries, report narratives, pitch language, campaign updates, and sentiment suggestions. It follows a human-in-the-loop rule: AI drafts only become client-facing after owner review and approval.

Confirmed behavior:

- Drafts can be saved.
- Approved summaries are used for client report output and Canva CSV export.
- Report copy is expected to follow the client-facing Problem -> Solution -> Results pattern.
- Demo-safe AI generation can fall back to grounded local drafts when live AI is not configured.

### Sentiment Agent

The Sentiment Agent supports placement review by suggesting positive, neutral, or negative tone with reasoning. The owner can edit or override before saving.

### Coaching Agent

The Coaching Agent supports the Verified Consulting coaching program: phases, homework, resources, opportunities, client progress, milestones, and next actions.

Confirmed behavior:

- Coaching progress is calculated from phases, homework, checklists, and opportunities.
- Opportunity records include scoring criteria and decision states.
- The coaching UI uses mock/demo records when no live records are available.

### Canva Bulk Create Export Agent

The Canva export workflow packages approved client summaries and confirmed placements into a CSV designed for Canva Bulk Create.

Confirmed behavior:

- Export requires approved report copy when narrative is expected.
- Placement rows can still export, but the workflow tells the owner when approval is missing.
- Canva upload remains a manual Canva Bulk Create step because the build does not use Canva Enterprise Autofill API.

## AVE Calculations

AVE values are calculated and aggregated from placement-level `aveValue` records.

Core formulas:

- Total AVE: sum of confirmed placement `aveValue`s.
- Client AVE: sum of that client's placement AVE values.
- Campaign AVE: sum of placements attached to that campaign.
- Monthly/chart AVE: sum of placements grouped by publication or landed month.
- Average value per win: total AVE divided by placement count.

For estimated values, the build uses documented PR-industry approaches:

- Muck Rack method: `monthly unique visitors x 0.025 x $0.37`.
- Agility PR method: `$25 x (average daily visitors / 1,000)`.

The app prefers saved owner-confirmed outlet rates before formula estimates.

## AVE Sources

The AVE Agent references several source layers:

- Tenyse's case-study deck figures and outlet lists.
- Saved outlet rates in `outlet_rates` / `vc_outlet_rates_v1`.
- `src/outletTrafficReference.js` for traffic/audience reference values.
- SimilarWeb-style monthly unique visitor metrics where available.
- Semrush-style audience or traffic figures where available.
- Muck Rack AVE formula documentation.
- Agility PR AVE formula documentation.
- Placement-level notes and data-quality flags.

Known data caveat:

- The reused `$492,198` / `14.2M` figure across different client examples was treated as a potential template reuse issue and protected by AVE data-quality checks.

## How Agents Were Tested

Testing included code checks, behavior checks, UI-action review, and data-quality regressions.

Automated checks:

- `npm run check`
- JavaScript syntax parsing across app files.
- HTML asset reference checks.
- API package install checks.
- Coaching progress behavior checks.
- Opportunity scoring behavior checks.
- AVE data-quality checks.
- AVE formula checks against known-good outputs.
- Agent learning event checks.

Manual/UI checks performed across the build:

- Buttons and CTAs were audited page by page.
- KPI cards were required to show hover/click detail.
- View actions were required to open detail drawers, pages, or specific panels.
- Download actions were required to generate files or explain what is missing.
- Empty cards were replaced with demo data, explanations, or next steps.
- Reports, Clients, Dashboard, Coaching, Review Queue, and Canva export flows were reviewed against the prototypes.

## Memory Protocols

Existing memory layers before the new learning work:

- Placement memory: `placements` and local placement storage.
- Review Queue memory: `review_queue`.
- Outlet rate memory: `outlet_rates` and `vc_outlet_rates_v1`.
- AVE data-quality memory: `ave_data_quality`.
- Report draft memory: `client_reports` and `vc_exec_summaries_v1`.
- Agent run memory: `agent_runs`.
- Error memory: `errors` and `vc_error_log_v1`.
- Campaign memory: campaign records, notes, and milestones.
- Coaching memory: phases, homework, resources, and opportunities.
- Client profile memory: client records, statuses, industries, engagement types, and contact fields.

## Learning Gap Identified

Before this update, the agents had memory but did not truly learn from prior loops. They could remember outputs and statuses, but future runs did not consistently adapt from owner approvals, edits, rejections, or overrides.

The needed change was an explicit learning layer:

- Capture what the owner approved.
- Capture what the owner rejected.
- Capture what the owner edited.
- Capture AVE overrides and saved rates.
- Capture confirmed discovery patterns.
- Capture rejected discovery patterns.
- Feed those lessons into future agent prompts, scoring, and UI recommendations.

## Learning Layer Added

This update adds the foundation:

- `src/agentLearningMemory.js` for local/demo learning events.
- `agent_learning_events` table in `db/schema.sql`.
- Migration: `db/migrations/2026-09-22-agent-learning-events.sql`.
- Owner API logging helper for production learning events.
- Discovery review confirmations/rejections logged as learning events.
- Report summary save/approve actions logged as writing-agent learning events.
- Saved outlet rates logged as AVE-agent learning events.
- Build checks for learning event creation and summaries.

This is the first layer. The next layer is to actively retrieve those lessons when each agent drafts, scores, estimates, or recommends.

## Security Measures Implemented

Current security and protection measures include:

- Role-based access through `profiles.role`.
- Separate owner and client API surfaces.
- Supabase JWT verification for live owner/client routes.
- Client scoping through `client_id`.
- Row Level Security on the main tables.
- Owner-only operational tables for review queue, outlet rates, agent runs, errors, invites, and learning events.
- Client-facing placement view that hides private notes unless shareable.
- Approved/published gate for client reports.
- Review Queue approval before discovered mentions become placements.
- Human-in-the-loop approval before AI summaries become client-facing.
- Private file access through signed URLs.
- Upload size limits.
- Server-side service-role key use only.
- `is_owner()` security-definer helper for RLS.
- Agent run audit logs.
- Data-quality guardrails for questionable AVE figures.
- Local demo auth is explicitly gated by `ALLOW_LOCAL_DEMO_AUTH` and documented as local-only.

Remaining security hardening:

- Ensure `ALLOW_LOCAL_DEMO_AUTH` is never enabled in deployed production.
- Replace broad development CORS with production domain allowlists.
- Add more granular client write policies where needed.
- Expand audit logs from agent runs to all owner-sensitive report/export actions.
- Add automated security regression checks for RLS and client data isolation.
