// src/aveDataQuality.js
//
// Data-quality guardrails for AVE figures — the counterpart to
// aveCalculation.js. That file's job is "never invent a number." This
// file's job is the other half of the same principle: never present a
// number as settled when there's a known reason to doubt it.
//
// The concrete failure this exists to prevent already happened once. The
// $492,198 / 14.2M figure appears under two different clients (VeganHood's
// CPG launch and Candlelit Care's national press push) with entirely
// different outlet lists — almost certainly one reused Canva template stat
// block, not two independently-calculated results. The caveat was recorded
// in outletReference.js's CAMPAIGN_BENCHMARKS (`verified: false`) and in
// source comments, but the *seeded placements* carried no flag at all, so
// the owner dashboard totalled both copies into its headline number and
// showed it with full confidence. A caveat only a developer reads is not a
// caveat.
//
// Nothing here deletes or silently adjusts a figure. Tenyse's numbers are
// hers; the app's job is to show what's uncertain, not to overrule her.

/**
 * Totals the AVE carried by placements that have a known data-quality
 * problem recorded in `aveDataQuality` (see schema.js — null means "no
 * known problem," never "verified").
 *
 * Returned alongside, not subtracted from, the headline total: the figure
 * may well be real for one of the two clients, and picking which one to
 * drop would be a guess — exactly the thing this codebase doesn't do.
 */
export function summarizeFlaggedAVE(placements = []) {
  const flagged = placements.filter((p) => p.aveDataQuality && p.aveValue);
  return {
    flaggedCount: flagged.length,
    flaggedTotal: flagged.reduce((sum, p) => sum + (p.aveValue || 0), 0),
    flagged,
  };
}

/**
 * Finds placements from DIFFERENT clients reporting the identical AVE
 * figure — the same detection that caught the VeganHood/Candlelit Care
 * pair, run against live placement data instead of the static benchmark
 * array in outletReference.js.
 *
 * This is the part that matters going forward. The template-reuse problem
 * is systemic to how these Canva decks are built, so the next batch of
 * case-study screenshots can carry the same defect. Rather than relying on
 * someone noticing by eye a second time, the check runs on the data.
 *
 * Matches on aveValue alone (not aveValue + audienceReach) deliberately —
 * a reused stat block might have had its reach field updated but not its
 * dollar figure, and that's still a duplicate worth surfacing. Placements
 * without an AVE are skipped: absent isn't duplicated.
 */
export function findDuplicateAVEAcrossClients(placements = []) {
  const byValue = new Map();
  for (const p of placements) {
    if (!p.aveValue) continue;
    const key = String(p.aveValue);
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key).push(p);
  }

  const duplicates = [];
  for (const [key, group] of byValue) {
    const distinctClients = new Set(group.map((p) => p.client));
    if (group.length > 1 && distinctClients.size > 1) {
      duplicates.push({
        aveValue: Number(key),
        clients: [...distinctClients],
        placements: group,
      });
    }
  }
  return duplicates;
}
