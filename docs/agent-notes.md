# Agent design notes — sourced from Tenyse's real case study materials

This captures what her website case studies, Canva capabilities deck, and
Friday Session Agenda actually tell us, and how each piece should (and
should not) shape the two AI-writing agents the PRD has planned but not yet
built: the AVE estimator and the executive-summary drafter (Phase 7/8).

Reference data extracted from these materials lives in
[`src/outletReference.js`](../src/outletReference.js).

## What's confirmed usable now

- **Outlet names + real reach figures** (SNAP Co.'s per-outlet breakdown,
  plus a list of ~28 other outlets she's placed clients in without an
  individual rate yet). This is a legitimate seed for an AVE agent's
  knowledge base — something to check its estimate against, not a rate
  card to bill from.
- **Her own case-study voice**: Problem → Solution → Results, specific
  numbers stated plainly, no filler. The executive-summary agent's prompt
  should be built around this structure and tone, not a generic "AI PR
  writer" voice. The manual summary field in the owner dashboard
  ([`src/owner/app.js`](../src/owner/app.js), `renderSummaryForm`) now
  hints at this structure so Tenyse's own manual drafts stay consistent
  with it until the AI half exists.

## Open question for Friday, raised by the material itself

The SNAP Co. "Deeper Than Visibility" case study reports results as
**per-outlet reach + sentiment tag**, not a single bundled AVE dollar
figure — unlike the VeganHood/Candlelit Care/Vegan Dining Month studies,
which lead with one AVE number. That's a real methodology difference in
her own past reporting, not just a style choice for the deck.

This bears directly on the Friday Session Agenda's Priority question about
"her AVE-via-AI process" — the honest answer may be "it depends on the
client/campaign type," which changes what the AVE agent needs to do: pick
a reporting mode per client/campaign, not just calculate one number
universally. Worth asking directly rather than assuming AVE-first is the
default.

## Data quality flag — do not build calibration on this until resolved

VeganHood's CPG campaign and Candlelit Care report the **identical** AVE
($492,198) and audience reach (14.2M) figures despite having entirely
different outlet lists (VeganHood: VegOut/QSR/VegWorld/Patch/PIX11/NBC;
Candlelit Care: Essence/21Ninety/Yahoo/Parents/SELF). AVE is a sum of
per-outlet ad-rate equivalents — two independently-calculated campaigns
landing on the exact same dollar and exact same reach isn't a plausible
coincidence. This is either a reused template slide or a copy-paste error
in one of the two decks.

**Neither number should be used as an AVE agent test case until Tenyse
confirms which (if either) reflects that campaign's real Meltwater/Cision
export.** Flagged in `src/outletReference.js`'s `CAMPAIGN_BENCHMARKS` with
`verified: false` on both entries.

## What this is *not*

- **Not a current client roster.** VeganHood, Candlelit Care, YAMAAS, Rexy
  Rolle, SNAP Co., etc. are portfolio/marketing case studies spanning her
  whole history — the PRD's Required Access section already flags that
  they aren't necessarily active accounts. None of this should be seeded
  into the dashboard as if it were live client data.
- **Not placement-level data**, with the partial exception of SNAP Co. and
  the two Samsung social posts. Everything else is a campaign or lifetime
  rollup — it maps to a future Campaign-summary record, not to individual
  Placement rows (which need outlet + specific date + article per PRD's
  `src/schema.js`).
