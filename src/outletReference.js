// Real outlet reference data — pulled from Tenyse's own case study decks
// (Canva "Capabilities Deck" + verifiedconsulting.com case studies), not
// fabricated. This is NOT wired into any calculation yet: no AVE agent
// exists (PRD Phase 7, planned), and nothing here should be treated as a
// current rate card. Its purpose is to give that future agent a seed
// knowledge base of outlet names + real reach figures to check its own
// output against, instead of starting from zero.
//
// Two different kinds of numbers are mixed across her decks and are NOT
// interchangeable:
//   - "monthly reach" (SNAP Co. case study): the outlet's own steady-state
//     monthly readers/viewers, independent of any specific placement.
//   - "audience reach" / "AVE" (VeganHood, Candlelit Care, Vegan Dining
//     Month): a per-CAMPAIGN total across multiple outlets combined, tied
//     to one specific placement or window of time.
// Reference entries below are tagged with `metricType` so a future agent
// (or a human) doesn't average across the two kinds by mistake.

export const OUTLET_REFERENCE = [
  {
    name: "Blavity News",
    metricType: "monthly_reach",
    value: 4098693,
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
  },
  {
    name: "NewsOne",
    metricType: "monthly_reach",
    value: 1168000,
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
  },
  {
    name: "LGBTQ Nation",
    metricType: "monthly_reach",
    value: 995689,
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
  },
  {
    name: "102.7 KIIS FM (iHeart)",
    metricType: "monthly_reach",
    value: 108477,
    // The deck literally reads "108,477 K Monthly readers & Viewers" — if "K"
    // means x1,000 this outlet would reach ~108M/month, wildly out of line
    // with a single-market radio site next to outlets in the 1-4M range.
    // Treating "K" as a typo/label artifact and using the raw number as-is.
    // Confirm with Tenyse before using this one for anything real.
    notes: "Unit is ambiguous in the source deck ('108,477 K') — confirm before relying on this figure.",
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
  },
];

// Outlets she's placed clients in, seen across multiple case studies, but
// only ever reported as part of a bundled campaign total — no individual
// reach/rate figure exists for these yet. Useful today as a known-outlet
// list (e.g. autocomplete on the Placement form's publication field);
// useful later as a checklist of outlets an AVE agent still needs real
// per-outlet rates for before it can price a placement with confidence.
export const KNOWN_OUTLETS_NO_RATE_YET = [
  "Forbes",
  "Today",
  "Business Insider",
  "Black Enterprise",
  "Essence",
  "FSR",
  "Time",
  "NBC",
  "New York Post",
  "Eat This, Not That!",
  "PIX11",
  "VegOut",
  "QSR",
  "VegWorld Magazine",
  "Patch",
  "POPSUGAR Wellness",
  "21Ninety",
  "Yahoo News",
  "Parents",
  "SELF",
  "BET",
  "NowThisHer",
  "Condé Nast Traveler",
  "Bauce",
  "The Shade Room",
  "Rolling Out",
  "KOIN 6",
  "Las Vegas Morning Blend",
];

// Campaign-level totals as reported in her decks. These are NOT placements
// (no per-outlet date/article breakdown exists for most of them) and are
// NOT a current client roster — the PRD's own Required Access notes flag
// that these case studies span her whole portfolio history, not
// necessarily active accounts. Kept here strictly as calibration/benchmark
// reference for a future AVE agent: "does the agent's estimate land in the
// right neighborhood for a campaign of this shape?" — not as ground truth
// to seed real client data with.
//
// KNOWN DATA QUALITY ISSUE: VeganHood's CPG campaign and Candlelit Care
// report the identical figure ($492,198 AVE / 14.2M reach) despite having
// entirely different outlet lists. That's not a plausible coincidence for
// independently-calculated AVE — treat BOTH as unverified until Tenyse
// confirms which (if either) is correct.
export const CAMPAIGN_BENCHMARKS = [
  {
    client: "VeganHood",
    campaign: "CPG product line launch (30 days)",
    aveValue: 492198,
    audienceReach: 14200000,
    outletCount: 8,
    verified: false,
    note: "Same figures as Candlelit Care below — needs confirmation.",
  },
  {
    client: "Candlelit Care",
    campaign: "National press push",
    aveValue: 492198,
    audienceReach: 14200000,
    outletCount: 6,
    verified: false,
    note: "Same figures as VeganHood CPG above — needs confirmation.",
  },
  {
    client: "Vegan Dining Month (VegansBaby)",
    campaign: "Multi-city (NYC, Las Vegas, Portland, Seattle, Eugene)",
    aveValue: 400000,
    audienceReach: 18000000,
    outletCount: null,
    verified: false,
    note: "8 news clips + Samsung Times Square billboard bundled into the total.",
  },
  {
    client: "VeganHood",
    campaign: "Lifetime / cumulative (as of case study publish date)",
    aveValue: 18000000,
    audienceReach: 217400000,
    outletCount: 50,
    verified: false,
    note: "Cumulative total, not a single campaign — don't compare directly to the per-campaign rows above.",
  },
];
