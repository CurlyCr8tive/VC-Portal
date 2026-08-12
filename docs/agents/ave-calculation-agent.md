# AVE Calculation Agent — spec + what's honestly buildable right now

Status: methodology designed, guardrail tooling built and tested. The
agent itself — the part that outputs a dollar figure for a real placement
— is NOT built, and shouldn't be yet. Reasoning below.

## Why there's no estimator function in this doc

I considered building a draft `estimateAve(outlet, reach)` calculator here,
the way `docs/agents/executive-summary-agent.md` has a working prompt +
sample output. The difference: that agent only needs to match a *voice*,
which real case studies fully demonstrate. This agent needs a real
per-outlet *ad rate*, and `db/schema.sql`'s `outlet_rates` table is empty
on purpose — the PRD flags "per-outlet rate examples" as "Not yet raised"
with Tenyse. `src/outletReference.js`'s `CAMPAIGN_BENCHMARKS` are
explicitly marked `verified: false` on every single entry.

Building a calculator now would mean deriving a $/reach ratio from data
that isn't confirmed real — producing a number that *looks* calibrated
but isn't, which is a worse failure mode than having no number at all
(same principle `schema.js` already applies to sentiment: default to
null, don't guess a value with no real analysis behind it). So this spec
stops at "ready to calculate the moment verified rates exist," not a
number Tenyse could mistake for real.

## Input contract (once outlet_rates has real, verified data)

- A confirmed placement: `{ publication, format?, reach? }`
- Lookup against `outlet_rates` (`outlet_name`, `rate_estimate`,
  `multiplier`)
- Output: `placements.ave_value` + `ave_auto_calculated = true`, always
  editable/overridable by the owner — never silently final, matching the
  `sentiment_confirmed_by_owner` pattern already in the schema

## Open design question

Her real case studies use two different reporting shapes: a single
bundled AVE dollar figure (VeganHood, Candlelit Care, Vegan Dining Month),
or per-outlet reach + sentiment tag with no dollar figure at all (SNAP
Co.'s "Deeper Than Visibility"). The agent likely needs to support both
modes, selected per client or per campaign — not assume AVE-first is
universal. Flagged for the Tenyse discovery list in `docs/agent-notes.md`.

## What IS built and tested right now: the duplicate-data guardrail

`src/outletReference.js`'s `findSuspiciousDuplicates()` — flags any two
benchmark entries that share the exact same `aveValue` AND
`audienceReach` across different clients. AVE sums per-outlet ad-rate
equivalents, so two independently-calculated campaigns with different
outlet lists landing on the identical dollar figure isn't a plausible
coincidence — it's how the VeganHood-CPG/Candlelit-Care duplicate got
caught in the first place. This is meant to run again, automatically,
once real `outlet_rates` data starts coming in from Tenyse — a cheap
guardrail against the exact same mistake recurring with real money
figures instead of case-study marketing copy.

**Ran it for real against the current benchmark data:**

```
Benchmarks checked: 4
Suspicious duplicates found: 1
→ VeganHood "CPG product line launch (30 days)" and Candlelit Care
  "National press push" both show $492,198 / 14.2M reach.
```

Correctly flagged the one known issue and nothing else — no false
positives against Vegan Dining Month or VeganHood's lifetime total, which
have genuinely different figures. This is the honest version of "testing
the agent" available right now: proving the guardrail catches a known-bad
case, rather than demoing a calculator whose output can't be trusted yet.
