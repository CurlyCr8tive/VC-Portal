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
    //
    // Aug 25 update: LGBTQ Nation's slide in the same deck carries the
    // identical "XXX,XXX K" formatting on its own reach figure (995,689 K)
    // — and 995,689 is already a plausible number on its own (in line with
    // Blavity/NewsOne), while ×1,000 would put it above Blavity's national
    // digital reach for a single article. Same reasoning applied
    // consistently to both entries now — see seedRealCaseStudyData.js's
    // SNAP Co. placements for the full comparison. Still unconfirmed.
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
//
// Aug 25 update: re-confirmed independently from each client's own deck
// slide (not just this earlier cross-comparison note), AND found the
// likely mechanism — a "Terminology Guide" slide appearing under Vegan
// Dining Month's section of the same overall deck defines "Clips" as
// "the number of news clips mentioning Candlelit Therapy," a different
// client's name left in from a reused template. Strong evidence Tenyse's
// Canva report template reuses a stat block across clients without every
// field being updated — this is a systemic risk for future case studies
// too, not just these two. See seedRealCaseStudyData.js for full detail.
//
// Aug 25 decision: confirmed — the VeganHood-CPG/Candlelit-Care pair stays
// excluded from calibration (verified: false, unresolved). The other two
// rows below (Vegan Dining Month, VeganHood Lifetime) have genuinely
// distinct figures from each other and from the duplicate pair, so they're
// cleared for AI-calibration use (verified: true). This is a decision
// about which numbers a future AVE agent may treat as real, not a claim
// that every remaining caveat on those rows (e.g. Vegan Dining Month's
// reach-figure conflict, noted below) has been resolved.
export const CAMPAIGN_BENCHMARKS = [
  {
    client: "VeganHood",
    campaign: "CPG product line launch (30 days)",
    aveValue: 492198,
    audienceReach: 14200000,
    outletCount: 8,
    verified: false,
    note: "Same figures as Candlelit Care below — needs confirmation. Re-confirmed directly from VeganHood's own deck slide Aug 25.",
  },
  {
    client: "Candlelit Care",
    campaign: "National press push",
    aveValue: 492198,
    audienceReach: 14200000,
    outletCount: 6,
    verified: false,
    note: "Same figures as VeganHood CPG above — needs confirmation. Re-confirmed directly from Candlelit Care's own deck slide Aug 25.",
  },
  {
    client: "Vegan Dining Month (VegansBaby)",
    campaign: "Multi-city (NYC, Las Vegas, Portland, Seattle, Eugene)",
    aveValue: 400000,
    audienceReach: 18000000,
    outletCount: null,
    verified: true,
    note:
      "8 news clips + Samsung Times Square billboard bundled into the total. Aug 25: this 18M reach figure is now suspect — a differently-worded slide in the same deck (this one covering only 3 of the 5 cities) is the one carrying the leftover \"Candlelit Therapy\" terminology label described above. The deck's own 5-city Executive Summary slide states 5.63M instead, and is used as the better-supported figure in seedRealCaseStudyData.js — this benchmark row is kept as-is (not overwritten) since it predates that finding and the conflict itself is the useful signal here, not either individual number. Aug 25: cleared for calibration use (not part of the duplicate-figure issue) — but the reach-figure conflict above is a separate, still-open caveat worth weighting accordingly, not evidence against using the $400K AVE figure itself.",
  },
  {
    client: "VeganHood",
    campaign: "Lifetime / cumulative (as of case study publish date)",
    aveValue: 18000000,
    audienceReach: 217400000,
    outletCount: 50,
    verified: true,
    note: "Cumulative total, not a single campaign — don't compare directly to the per-campaign rows above. Aug 25: cleared for calibration use — distinct figures from the duplicate pair above, no known data-quality issue on this row.",
  },
];

/**
 * Flags benchmark entries that share the exact same aveValue AND
 * audienceReach across different clients — this is how the VeganHood
 * CPG / Candlelit Care duplicate above was actually caught. AVE is a sum
 * of per-outlet ad-rate equivalents, so two independently-calculated
 * campaigns with different outlet lists landing on the identical dollar
 * figure isn't a plausible coincidence; it means at least one is a
 * template artifact or copy/paste error, not real data for that campaign.
 *
 * Intended use: run this against CAMPAIGN_BENCHMARKS now (see the test in
 * docs/agents/ave-calculation-agent.md), and again later against real
 * outlet_rates/placements data before the AVE agent ever treats a number
 * as ground truth — a cheap, honest guardrail against repeating this
 * exact mistake once real rate data starts flowing in.
 */
export function findSuspiciousDuplicates(benchmarks = CAMPAIGN_BENCHMARKS) {
  const byValue = new Map();
  for (const entry of benchmarks) {
    if (entry.aveValue == null || entry.audienceReach == null) continue;
    const key = `${entry.aveValue}|${entry.audienceReach}`;
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key).push(entry);
  }

  const suspicious = [];
  for (const [key, entries] of byValue) {
    const distinctClients = new Set(entries.map((e) => e.client));
    if (entries.length > 1 && distinctClients.size > 1) {
      const [aveValue, audienceReach] = key.split("|").map(Number);
      suspicious.push({ aveValue, audienceReach, entries });
    }
  }
  return suspicious;
}
