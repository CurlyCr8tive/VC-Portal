<!-- docs/ave-agent-details.md -->

# AVE Calculation Agent — Reference Details

Living document. Sections marked 🔴 NEEDS REAL DATA should be edited in place
as Tenyse provides real numbers — don't create a second file, update this one.

Last updated: August 13, 2026

---

## 1. Calculation mechanism

**Core formula:** `AVE = rate_estimate × multiplier`

This mirrors the industry-standard approach, confirmed across multiple sources:
- **Print:** column-inches/cm × the outlet's per-inch ad rate
- **Broadcast:** seconds of airtime × the outlet's per-second rate
- **Digital:** based on unique monthly viewers, article-level traffic, and value-per-visitor (effectively CPM-based)

**The multiplier** is a separate, optional adjustment reflecting that earned
coverage is often considered more valuable than a paid ad. No industry-standard
number exists — ranges from 1.0 (equal to advertising) up to 2–3x for
high-trust coverage, occasionally higher. Default should stay `1` unless
Tenyse specifies otherwise.

---

## 2. Agent behavior spec

| Aspect | Detail |
|---|---|
| Trigger | Owner clicks "Calculate" on a placement's AVE field |
| Reads | `outletRatesStorage` (client-side) — outlet name lookup |
| Process | Found → `rate_estimate × multiplier`. Not found → **does not guess** |
| Writes | `aveValue` on the placement, flagged auto-calculated vs. manual |
| Human step | If not found: manual entry field + "save this rate for next time" checkbox |
| Failure handling | Never default to $0 or a guessed value |

**Locked design principle:** AVE is calculated and stored on the placement
at the moment it's confirmed — never recalculated live from the current
rate table. Updating a rate later must never change a report a client
already saw.

**Rate maintenance:** `outlet_rates` tracks `updated_at`/`updated_by`.
Rates unrevised in ~12 months should surface a soft "not reviewed since
[date]" nudge — not a block.

---

## 3. Industry benchmark ranges — for manual-fallback suggestions ONLY

⚠️ **These are general industry ranges, not Tenyse's real confirmed rates.**
Never hardcode these into `outlet_rates` as if verified. Use only as a
starting-point suggestion shown next to the manual entry field.

| Placement type | Range | Confidence |
|---|---|---|
| Print — national | $20–50/col-cm | Real industry benchmark |
| Print — local | $5–20/col-cm | Real industry benchmark |
| Print — magazine | $30–150/col-cm | Real industry benchmark |
| Digital/online news | $3–15 CPM | Real industry benchmark |
| Podcast — mid-roll, host-read | $25–40 CPM | Real industry benchmark |
| Podcast — pre-roll | $15–25 CPM | Real industry benchmark |
| Podcast — post-roll | $5–15 CPM | Real industry benchmark |
| Social/influencer — nano (1K–10K) | $200–1,000/post | Real industry benchmark |
| Social/influencer — micro (10K–100K) | $1,000–10,000/post | Real industry benchmark |
| Social/influencer — mid (100K–1M) | $10,000–50,000/post | Real industry benchmark |
| TV/broadcast | 🔴 NO RELIABLE BENCHMARK FOUND | Genuine gap — consistent with why paid rate-card tools exist |
| Radio (terrestrial) | 🔴 NO RELIABLE BENCHMARK FOUND | Genuine gap — do not conflate with podcast CPM, different medium |

---

## 4. Known real outlet names — from Tenyse's own case studies

Reference only — **names, not rates.** Confirmed placements, safe to use
for autocomplete/reference; do not attach a dollar figure to any of these
without a real source.

PIX11, NBC, Forbes, Essence, Black Enterprise, Blavity News, NewsOne,
KIIS FM (102.7), VegOut, VegWorld Magazine, Patch, QSR Magazine, 21Ninety,
Yahoo News, Parents, SELF Magazine, Condé Nast Traveler, rollingout

🔴 **NEEDS REAL DATA:** Tenyse's current active client roster (separate
from the above — these are portfolio/historical examples, not necessarily
who she's actively working with now).

---

## 5. Per-outlet rates — now derivable, no longer blocked

**Status changed Sept 15, 2026.** Still no *confirmed* per-outlet rate from
Tenyse. But the blocker turned out to be soluble without one: the two major
PR platforms publish their AVE formulas, so a rate can be derived from an
outlet's audience size rather than waiting on a rate card.

    Muck Rack:  MUV × 0.025 × $0.37
    Agility PR: $25 × (average daily visitors ÷ 1,000)

Implemented in `src/aveEstimation.js`, with sourced audience figures in
`src/outletTrafficReference.js`. Both are computed and shown as a RANGE —
Tenyse's explicit choice — because the two formulas disagree by 11.1x on
every outlet. That spread is the honest finding, not a defect to average away.

**Why these formulas and not a house method:** her Vegan Dining Month
campaign reports $400,000, less $100,000 the deck attributes to the Times
Square billboard, leaving $300,000 across 8 news clips = **$37,500 per
clip**. Muck Rack's formula returns **$37,913** for a Blavity-sized outlet
(4.1M). A ~1% gap on an independently calculated campaign is strong
evidence her real figures came from a Muck Rack-style model, most likely
Meltwater's. Reproducing it keeps new placements consistent with the case
studies she already shows clients. Asserted in `npm run check` so the
agreement can't silently drift.

### 🔴 Two open problems with the derived figures

**1. The input metric is wrong for most outlets.** Both formulas take
monthly UNIQUE VISITORS. SimilarWeb's public pages publish TOTAL VISITS,
a larger number — Muck Rack and Agility read uniques through a paid API.
Estimates built on visits are marked `overstated` and get no one-click
fill in the UI. Fixing this means sourcing uniques per outlet, usually
from the outlet's own media kit.

**2. The formula breaks down on very large outlets.** Muck Rack's formula
on Forbes' traffic returns ~$665,000 for a single placement. Forbes charges
about **$12,500** for a BrandVoice sponsored article covering the same
space — the estimate overshoots a real, published price by ~53x. Even
substituting the ~36M uniques figure leaves it ~26x high. Do not report a
derived Forbes-scale figure to a client without a sanity check against
what the outlet actually charges. Collecting real sponsored-content prices
per outlet is the obvious next step, and would give a genuine upper bound.

### Still true

No real per-outlet rate has been *confirmed by Tenyse* for any outlet. What exists instead: campaign-level AVE *totals*
($492,198 for one VeganHood campaign, $18M cumulative, $400K for Vegan
Dining Month) — these cannot be reverse-engineered into per-outlet rates
without knowing how the total was split.

**Flagged, do not use as reference:** VeganHood's CPG campaign and
Candlelit Care's case study show identical $492,198 AVE / 14.2M reach
figures despite being different clients — very likely a template artifact,
not two independently real numbers. Excluded from any calibration until
Tenyse confirms which (if either) is accurate.

**Her real methodology** (worth matching in the manual entry UI's tone):
a simple ChatGPT/Claude prompt — "estimate the AVE of this placement" —
with **no manual data fed in first**. She doesn't research a comparable ad
cost herself before asking; she asks the model directly and takes its
figure. (An earlier PRD pass described the reverse — her estimating first,
then feeding that into ChatGPT — but that was from the original July 8
session; this is the corrected version from the later meeting where her
real process was confirmed directly, so it supersedes the earlier
description.) Practical implication for the manual-fallback UI: it should
prompt for an outlet name and let the owner request an estimate, not
present itself as a place to enter her own pre-researched number.

---

## 6. Data source note

One of Tenyse's real reports cited **Meltwater, SimilarWeb, and NewsEdge**
as data sources, and another cited **Coverage Books** — confirmed directly
by her (Aug 10 session) as her own past subscription, not partner-provided.
This validates the core premise of this build rather than creating a gap:
these are the $30–50K/year tools this agent exists to make unnecessary,
not something to integrate with.

---

## Changelog

- **Aug 13, 2026** — Initial version. Formula, agent spec, and industry
  benchmarks established. Real per-outlet rates still entirely open.
- **Aug 25, 2026** — Tenyse confirmed the VeganHood-CPG/Candlelit-Care
  duplicate pair ($492,198/14.2M) stays excluded from AI calibration. The
  other two `CAMPAIGN_BENCHMARKS` rows (Vegan Dining Month, VeganHood
  Lifetime) are cleared for calibration use — see `src/outletReference.js`
  (`verified: true`) and `docs/agents/ave-calculation-agent.md`. This does
  not supply a per-outlet rate (section 5 below is still empty); it only
  changes which campaign-level totals a future agent may treat as real.
- **Sept 15, 2026** — Section 5 substantially rewritten: per-outlet rates
  are now derivable from published Muck Rack / Agility PR formulas rather
  than blocked on Tenyse. Both are computed and shown as a range. Two open
  problems documented: the visits-vs-uniques metric mismatch, and the
  formula overshooting real sponsored-content prices at Forbes scale.
