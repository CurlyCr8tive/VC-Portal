// src/aveEstimation.js
//
// Derives a per-outlet AVE estimate from audience size using the two
// published industry formulas, and returns BOTH as a range rather than
// picking a winner.
//
// Why a range and not a number: the two major PR platforms publish
// formulas that disagree by 11.1x on every single outlet. That's not a
// rounding difference — it's a genuine disagreement about what an earned
// placement is worth, and collapsing it to one number would hide the most
// important thing about the figure. Tenyse chose to carry the range.
//
// WHERE THE FORMULAS COME FROM (both publicly documented, not invented
// here — this whole module exists so the app never has to guess a rate):
//
//   Muck Rack:  MUV × 0.025 × $0.37
//     "Media outlet's SimilarWeb Unique Visitors per Month multiplied by
//     0.025 and then by $0.37"
//     https://muckrack.com/learn/pr-measurement-ave-dashboard
//
//   Agility PR: $25 × (average daily visitors ÷ 1,000)
//     Fixed $25 CPM, "audience reach derived from Monthly Unique Visitors
//     via Similarweb traffic estimates"
//     https://help.agilitypr.com/en/articles/5071100
//
// WHY THIS MATCHES TENYSE'S OWN NUMBERS: her Vegan Dining Month campaign
// reports $400,000 total, of which the deck attributes $100,000 to the
// Times Square billboard — leaving $300,000 across 8 news clips, or
// $37,500 per clip. The Muck Rack formula returns $37,913 for an outlet
// the size of Blavity News (4.1M). A ~1% gap across an independently
// calculated campaign is strong evidence her real figures came from a
// Muck Rack-style model (most likely Meltwater's equivalent). That's the
// justification for reproducing these formulas rather than inventing a
// house method: it keeps new placements consistent with the case studies
// she already shows clients.
//
// HONEST CAVEAT, do not paper over it: both formulas take monthly UNIQUE
// VISITORS. SimilarWeb's public pages publish TOTAL VISITS instead, which
// is a larger number (the same person visiting four times counts once in
// uniques, four times in visits). Muck Rack and Agility read uniques
// through a paid API. So an estimate built on a visits figure overstates,
// and `audienceMetric` below exists to keep that visible instead of
// silently mixing the two.

/** Muck Rack's published constants — see module header for the source. */
const MUCKRACK_PLACEMENT_SHARE = 0.025; // share of monthly audience assumed to see one placement
const MUCKRACK_VALUE_PER_IMPRESSION = 0.37; // dollars

/** Agility PR's published constants — see module header for the source. */
const AGILITY_CPM = 25; // dollars per 1,000
// Agility states daily visitors are "derived from Monthly Unique
// Visitors" but doesn't publish the divisor. 30 is this app's inference,
// flagged as such rather than quoted as their rule — it's the obvious
// reading of monthly→daily, but it is our assumption, and it moves the
// Agility figure proportionally if wrong.
const DAYS_PER_MONTH = 30;

export const AUDIENCE_METRICS = ["monthly_unique_visitors", "monthly_visits"];

/**
 * Both published formulas applied to one audience figure.
 *
 * Returns null — never a zero, never a guess — when there's no usable
 * audience number, matching aveCalculation.js's rule that a missing input
 * produces no answer rather than a fabricated one.
 *
 * `audienceMetric` doesn't change the arithmetic; it travels with the
 * result so callers can say what the number actually rests on. Passing
 * "monthly_visits" sets `overstated: true`, because the formulas want
 * uniques and visits are the bigger number.
 */
export function estimateAVE(audienceValue, audienceMetric = "monthly_unique_visitors") {
  const audience = Number(audienceValue);
  if (!Number.isFinite(audience) || audience <= 0) return null;

  const muckRack = audience * MUCKRACK_PLACEMENT_SHARE * MUCKRACK_VALUE_PER_IMPRESSION;
  const agility = AGILITY_CPM * (audience / DAYS_PER_MONTH / 1000);

  return {
    low: Math.min(muckRack, agility),
    high: Math.max(muckRack, agility),
    muckRack,
    agility,
    audience,
    audienceMetric,
    // True when the input isn't the metric the formulas actually call for,
    // so every figure downstream can carry the caveat instead of the UI
    // having to remember it.
    overstated: audienceMetric === "monthly_visits",
  };
}

/**
 * Formats an estimate for display — "$3,416 – $37,913".
 *
 * Deliberately always shows both ends, even though the spread looks
 * uncomfortable. The spread IS the finding: an earned placement's
 * "advertising value" is a modelled number, not a measured one, and a
 * single tidy figure would imply a precision that doesn't exist.
 */
export function formatEstimateRange(estimate) {
  if (!estimate) return "—";
  const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
  return `${money(estimate.low)} – ${money(estimate.high)}`;
}
