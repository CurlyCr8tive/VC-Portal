# Coaching Module Plan

This plan keeps the Verified Consulting coaching work grounded in Tenyse's
Visibility to Revenue program. Research sources are useful as architecture
references only: route structure, context/state patterns, migrations,
progress visualization, and testing discipline. They should not bring over
student, cohort, attendance, Salesforce, or education-LMS product logic.

## Source Inputs

- Tenyse's Visibility to Revenue coaching brief.
- VC meeting notes: coaching toggle/page for the active coaching client,
  Chef Garth / Greyz Bistro.
- Existing VC implementation in `src/coachingPhaseSchema.js`,
  `src/owner/components/CoachingAdminView.js`, and
  `src/client/components/CoachingProgramView.js`.
- Research-source architecture patterns, especially route-scoped pages,
  shared current-scope context, Supabase migrations, progress charts, and
  focused tests.

## Research Sources

A reference research repo was reviewed as an architecture source for this
build. The useful parts applied to this plan are structural patterns only:

- Route-scoped pages for major work areas.
- A shared context for the current active scope.
- Timestamped Supabase migrations and rollbacks.
- Progress chart utilities separated from page rendering.
- Tests for business rules, labels, state, and routing behavior.

The research source's product domain should not be copied into VC. Student records,
cohorts, attendance, Salesforce integration, rubrics, and education-LMS
workflows are out of scope for the Verified Consulting coaching module.

## Product Truth

Every coaching engagement runs on VAAM:

- Visibility: what the client is known for, current gaps, proof points to
  elevate.
- Authority: positioning the client as an expert and trusted voice.
- Alignment: choosing the right partners, not chasing random opportunities.
- Monetization: connecting visibility to revenue, partnerships, products,
  consulting, and events.

Standing rule: if it does not support credibility, audience, partnerships,
or revenue goals, it does not get chased.

Chef Garth / Greyz Bistro is the first real active coaching client and
should remain the anchor test case.

## Current State

Already represented in the app:

- Client engagement type: `pr`, `coaching`, `pr_and_coaching`.
- Client-side PR/Coaching toggle for `pr_and_coaching` clients.
- Coaching-only client routing into the Coaching Program page.
- Owner-side Coaching Program section.
- Phase Tracker with the six-phase VAAM structure.
- Phase status, goal, deliverables, notes, and homework.
- Client-side homework completion and reflection response.
- Resource Library and Missing Assets Checklist.
- Opportunity Evaluator with five criteria:
  Audience Fit, Brand Values, Credibility, Revenue Potential, Visibility
  Value.
- Opportunity decision statuses: pursuing, pressure testing, declined.

Current constraint:

- Most coaching data is still localStorage-backed. Production behavior
  depends on Tenyse's Supabase project, real auth users, profile rows, and
  API-backed reads/writes.

## Research Patterns To Adapt

### Program Context

A shared current-scope context helps pages consistently know which program
or group is active. VC should adapt this as a coaching scope pattern:

- Owner side: selected coaching client/program.
- Client side: logged-in client's current coaching program.
- Shared behavior: restore the last selected coaching client for owner
  convenience without letting clients switch accounts.

Suggested implementation later:

- `src/coachingProgramContext.js` or a small framework-free equivalent
  matching the current VC plain-JS architecture.
- Avoid introducing React just for this pattern.

### Route-Scoped Pages

The research source separates major work areas into focused pages. VC can
keep the current single-page shell, but should organize coaching code as if
these are distinct surfaces:

- Phase Tracker
- Homework / Reflections
- Resources & Checklist
- Opportunity Evaluator
- Progress / Weekly Check-In

This can happen through existing tabbed views first. Full URL routes can
wait until the project adopts a router or a deployment setup that benefits
from deep links.

### Progress Visualization

The progress chart pattern maps well to coaching, but the metric should be
coaching progress rather than student scores.

Useful VC metrics:

- Phase completion: complete phases out of total phases.
- Homework completion: complete action/reflection items out of assigned
  items.
- Missing assets completion: complete checklist items out of total checklist
  items.
- Opportunity pipeline: pursuing, pressure testing, declined.

Do not overbuild this into gamification. The client needs calm visibility,
not a scoreboard.

### Weekly Summary

The weekly summary pattern can become a VC coaching check-in generator.

Potential coaching check-in content:

- Current phase and status.
- Homework completed since last check-in.
- Open homework or reflection prompts.
- Missing high-priority assets.
- New opportunities awaiting Tenyse's review.
- Recommended next action before the next strategy call.

This should start as an owner-visible draft/check-in panel. Email automation
can come later.

### Migration Discipline

The research source uses timestamped Supabase migrations and rollbacks. VC
should move new database changes into timestamped migration files instead of
repeatedly editing only the baseline schema.

For coaching, future migrations should cover:

- Coaching phases.
- Coaching homework, if it becomes separate from phase JSON.
- Coaching resources/checklist items.
- Opportunities and evaluation scores.
- Policies for owner access and client-scoped access.

### Tests

The research source's tests around labels, routing, state, and business
logic should inspire VC tests around coaching behavior.

High-value VC test targets:

- Engagement type controls page access:
  PR-only, coaching-only, PR + Coaching.
- Phase template creation.
- Homework completion and reflection response.
- Opportunity score averaging.
- Checklist completion.
- Client scoping rules once Supabase-backed APIs are in place.

## Data Model Direction

Keep the product model aligned to Tenyse's brief:

- Program
- Phase
- Goal / Deliverable
- Homework item
- Resource or checklist item
- Opportunity
- Evaluation criteria
- Decision status

Recommended near-term approach:

- Keep homework nested inside a phase if speed matters and the use case stays
  phase-specific.
- Split homework into its own table only when reminders, uploads, comments,
  cross-client reporting, or item-level audit history become real
  requirements.
- Keep opportunities standalone and linked to a client/program, not nested
  inside Phase 4. Opportunities can arrive at any time during the engagement.

## Implementation Phases

### Phase 1: Production Readiness

- Connect owner/client coaching reads to Tenyse's Supabase project.
- Verify real `clients.engagement_type` drives the PR/Coaching toggle.
- Confirm Chef Garth / Greyz Bistro appears as an active coaching client.
- Confirm owner can load/edit phases and the client can view them.
- Confirm client cannot access another client's coaching data.

### Phase 2: Coaching UX Tightening

- Add a coaching progress overview at the top of the client coaching page.
- Make phase status and homework status easier to scan.
- Add clear saved/sent confirmation states for homework, reflections,
  resources, and opportunity submission.
- Improve empty states for no phases, no homework, no resources, and no
  opportunities.

### Phase 3: Structured Check-In

- Add a weekly or near-real-time coaching check-in draft.
- Keep it owner-approved and client-safe.
- Use only real phase/homework/resource/opportunity data.
- Avoid inventing progress when there has been no activity.

### Phase 4: Stronger Persistence

- Add API endpoints for coaching data once Supabase credentials and schema
  are stable.
- Add migration files for any schema changes.
- Add tests around coaching state transitions and access rules.

### Phase 5: Optional Agent Layer

- Add an opportunity-evaluator agent only after the scoring card itself works.
- Agent should ask the five evaluation questions one at a time, produce a
  draft score/write-up, and route the summary to Tenyse before the client
  responds.
- Tenyse remains the final decision-maker.

## Open Questions

- Does Tenyse want homework due dates as exact dates, due windows, or both?
- Should each homework item carry its own VAAM tag, or is the phase-level
  VAAM tag enough for now?
- What is the real missing-assets checklist for Chef Garth?
- Which Greyz Bistro opportunities have confirmed statuses versus placeholder
  scores?
- Does the six-week program need real content before September cohort review,
  or is it still out of scope for this build?

## Near-Term Build Checklist

- Verify current coaching tables and policies against Tenyse's Supabase
  project.
- Add or confirm sample Chef Garth rows in the real project.
- Wire client engagement type from real Supabase data through the client
  sidebar toggle.
- Add a compact coaching progress summary component.
- Add saved/sent confirmation states to coaching interactions.
- Add a first pass of coaching behavior tests to `npm run check` or a
  dedicated test command.
