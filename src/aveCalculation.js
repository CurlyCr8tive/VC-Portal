// src/aveCalculation.js
//
// Pure calculation logic for the AVE Calculation Agent (Agent 2 in the
// PRD's Agent Architecture section) — the client-side, localStorage-backed
// version. Mirrors that spec's process exactly: "Looks up the outlet in
// outlet_rates; if found, calculates AVE = rate × multiplier... If not
// found, does not guess."
//
// Deliberately zero UI/DOM code here — this is a pure function, testable
// on its own, that PlacementForm.js calls when the owner clicks
// "Calculate." The caller is responsible for the manual-entry fallback +
// benchmark suggestion when this returns found: false; this file's only
// job is the lookup and the multiplication, nothing else.

import { getRate } from "./outletRatesStorage.js";

/**
 * Looks up outletName in the rate table and multiplies rate × multiplier
 * if a match exists. Never invents a number — a missing outlet returns
 * { found: false }, not a zero, not a guess, not some fallback rate
 * applied silently. Matching is case-insensitive (inherited from
 * getRate()), so "pix11" and "PIX11" resolve to the same saved rate.
 */
export function calculateAVE(outletName) {
  const rate = getRate(outletName);
  if (!rate) {
    return { found: false };
  }
  return { found: true, value: rate.rateEstimate * rate.multiplier };
}
