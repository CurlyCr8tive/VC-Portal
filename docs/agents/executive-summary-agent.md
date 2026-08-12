# Executive Summary Agent — prompt spec + manual test

Status: prompt designed and manually validated below. Not wired to any API
— no key exists yet (still an open decision, see `docs/agent-notes.md`).
This doc is the "buildable without Supabase or a key" prep work: get the
prompt right now, wire it to a real API call in one step later.

## Where it plugs in

Same slot Tenyse already fills by hand today: `summaryStorage.js`'s
`saveSummary(clientName, text)`, surfaced in `owner/app.js`'s
`renderSummaryForm`. This agent's only job is to produce a first draft for
that textarea — the owner still reviews, edits, and saves it. Nothing
about the storage layer or the "owner approves" UI changes when this goes
live; only where the initial text comes from does.

## Input contract

- `clientName`
- `period` (e.g. "All confirmed placements to date", or a date range)
- `placements`: array of `{ publication, headline, aveValue, pitchSentDate, landedDate, campaign }` for that client/period — same shape `schema.js`'s `createPlacement()` already produces
- A few of Tenyse's own real case-study excerpts as style examples (see below) — included in the system prompt, not per-request, since the voice doesn't change per client

## System prompt (draft)

```
You are drafting a client executive summary for Verified Consulting, a PR
agency. Match this voice exactly — it comes from the agency's own past
case studies, not generic PR-agency language:

- Structure: Problem, then Solution, then Results. Each in 1-2 sentences.
- State specific numbers plainly (dollar AVE, reach, placement count, lead
  time) — never round vaguely ("several placements") when an exact count
  is available.
- No filler adjectives ("exciting," "incredible," "game-changing"). Let
  the numbers carry the weight.
- Name actual outlets and dates when they strengthen the result.
- Keep it to one paragraph, 3-5 sentences total — this fills a card on
  the client's dashboard, not a full report.

Example of the target voice (from a real past case study):
"VeganHood, a fresh soul-food vegan restaurant situated on Harlem's
renowned restaurant row, aimed to boost its brand recognition and
visibility with the help of public relations and social media
collaborations... These successful placements resulted in over $18
million in publicity value, with 50+ media coverage pieces, 217.4 million
impressions, and 3.5 million online views."

Given the client name, period, and a list of this period's placements
(publication, headline, AVE, pitch date, landed date, campaign), write the
summary now.
```

## Manual test — run against real seeded data, no API key needed

Using the actual sample placements from `src/owner/seedSampleData.js`
(VeganHood's "Fall Press Push" campaign, 3 real-shaped placements), I ran
this prompt myself to validate the voice and structure before any code
exists to automate it:

**Input placements:**
| Publication | AVE | Pitch sent | Landed |
|---|---|---|---|
| VegNews | $7,500 | 2026-06-28 | 2026-07-15 |
| PIX11 News | $6,500 | 2026-07-10 | 2026-07-28 |
| Forbes | $18,000 | 2026-07-10 | 2026-08-01 |

**Generated draft:**

> VeganHood needed press momentum beyond its Harlem customer base heading
> into the "Fall Press Push" campaign. We pitched their plant-based soul
> food story to national food trade press and NYC local outlets targeting
> a five-week window. The campaign landed three placements — VegNews
> (July 15), PIX11 News (July 28), and Forbes (August 1) — totaling
> $32,000 in AVE, with an average 19-day lead time from pitch to landed
> coverage and Forbes closing out the highest-value placement of the
> three.

Lead times checked by hand against `computeLeadTimeDays()`'s logic
(`landedDate - pitchSentDate`): VegNews 17 days, PIX11 18 days, Forbes 22
days → average 19 days. Matches the draft's claim exactly — worth keeping
this kind of arithmetic check as part of whatever validates real agent
output later, since a plausible-sounding but wrong number is worse than
an obviously-missing one.

## Open question carried over from `docs/agent-notes.md`

Her real case studies mix campaign-level AVE totals with, in SNAP Co.'s
case, per-outlet reach + sentiment instead. This draft assumes one AVE
total per period is always the right shape — worth confirming with Tenyse
whether the real agent needs to support both.
