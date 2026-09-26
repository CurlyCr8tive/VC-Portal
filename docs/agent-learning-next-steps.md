# Agent Learning Layers And Next Steps

This document organizes the next work discussed after identifying that the agents remember data but do not yet fully learn from previous loops.

## Principle

Every agent should treat owner actions as product memory.

Owner actions that should shape future runs:

- Confirmed discovery candidate.
- Rejected discovery candidate.
- Saved AVE outlet rate.
- Overridden AVE value.
- Approved report summary.
- Edited AI draft.
- Accepted outreach angle.
- Rejected outreach angle.
- Pursued coaching opportunity.
- Declined coaching opportunity.
- Successful Canva export mapping.
- Failed or corrected Canva export mapping.

This is not model training. It is structured memory that the product can retrieve and apply.

## Layer 1: Feedback Capture

Status: started.

Implemented now:

- Local browser learning events in `src/agentLearningMemory.js`.
- Production `agent_learning_events` table.
- Owner-only RLS policy for learning events.
- Learning logs for Review Queue confirmations and rejections.
- Learning logs for report summary save/approval.
- Learning logs for saved AVE outlet rates.
- Regression checks in `scripts/check-build.mjs`.

Remaining capture work:

- Log edited AI drafts distinctly from first-time saves.
- Log copied report narratives.
- Log accepted/rejected outreach drafts.
- Log coaching opportunity pursue/decline decisions.
- Log Canva export field mapping choices and failures.
- Add an owner-visible learning/audit panel.

## Layer 2: Retrieval Before Agent Runs

Status: next.

Each agent should retrieve relevant learning events before generating output.

Discovery Agent should retrieve:

- Rejected patterns for the same client.
- Confirmed source/outlet/name patterns.
- Past false-positive terms.
- Client aliases that led to good matches.

AVE Agent should retrieve:

- Saved outlet rates.
- Owner overrides.
- Stale rate warnings.
- Prior uncertainty notes.
- Preferred formula/source choices.

Writing Agent should retrieve:

- Approved summaries for the same client.
- Owner-edited drafts.
- Preferred tone and structure.
- Phrases to avoid.
- Evidence patterns the owner approved.

Campaign Outreach Agent should retrieve:

- Accepted angles by campaign/client/outlet.
- Rejected angles.
- Successful subject-line or opening-line patterns.
- Outlet fit notes.

Coaching Agent should retrieve:

- Pursued vs declined opportunity criteria.
- Client phase history.
- Homework/reflection patterns.
- Owner notes about readiness, capacity, or fit.

Canva Export Agent should retrieve:

- Field mappings that worked.
- Export errors.
- Template-specific column requirements.
- Report sections required before export.

## Layer 3: Prompt And Scoring Integration

Status: not implemented yet.

Needed changes:

- Add `getRelevantLearning({ agentType, clientName, campaignId, entityType })`.
- Add learning summaries into AI prompt context.
- Add rejected-discovery penalties in discovery scoring.
- Add confirmed-discovery boosts in discovery scoring.
- Add owner-saved outlet-rate priority to all AVE estimates.
- Add approved summary examples to report-generation prompts.
- Add owner-edited phrase/style notes to writing prompts.

## Layer 4: UI Feedback Controls

Status: partially covered by existing owner actions.

Needed UI:

- “Use this as pattern” on approved report drafts.
- “Do not use this again” on rejected AI drafts or outreach angles.
- “Save as preferred outlet rate” on AVE calculations.
- “Why this estimate?” panel on AVE cards.
- “Learning applied” chips when an agent uses prior memory.
- Learning history drawer per client.

## Layer 5: Governance

Status: next.

Rules:

- Never silently apply learning that affects client-facing output without showing the owner.
- Do not use rejected examples as positive examples.
- Do not treat a demo-only action as production truth unless explicitly confirmed.
- Keep client-scoped lessons scoped to that client unless marked reusable.
- Keep security and auth bypass lessons out of client-facing prompts.
- Keep raw private notes out of client-facing reports unless marked shareable.

## Security Next Steps

- Add an RLS smoke-test script for owner/client isolation.
- Add production CORS allowlist.
- Add `ALLOW_LOCAL_DEMO_AUTH` deployment guard.
- Add audit logging for report approval, PDF download, CSV export, and client invites.
- Add signed-file URL expiry checks to QA.
- Add a “client-facing data preview” check before publishing reports.

## CTA / Link / Button Protocol

Continue applying the build protocol already established:

- No inert visible controls.
- No static disabled buttons.
- Every visible CTA must work, explain what is missing, or open a useful preview workflow.
- Every View action must open meaningful detail.
- Every Download action must download or explain why no file exists.
- Every Import action must accept a file or be labeled as a workflow preview.
- Empty states need useful content, demo data, or next steps.
- Redesigns must preserve previous functionality unless explicitly removed.

## Acceptance Criteria For The Next Agent-Learning Pass

- Each agent can retrieve relevant learning memory.
- Each AI prompt receives learning context when available.
- Discovery suppresses known bad patterns.
- AVE prioritizes owner-saved rates.
- Writing uses approved examples and avoids rejected patterns.
- The UI shows when learning was applied.
- The owner can inspect and clear learning events.
- `npm run check` passes.
