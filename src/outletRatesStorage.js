// src/outletRatesStorage.js
//
// Client-side mirror of the outlet_rates table already defined in
// db/schema.sql (outlet_name, rate_estimate, multiplier, updated_at,
// updated_by). This is the localStorage-only version, consistent with how
// the rest of the app currently operates before Supabase goes live —
// migrating this data over later is a straightforward copy, not a
// redesign, since the shape already matches.
//
// `updated_by` from the real schema is intentionally left out here — mock
// auth (src/auth.js) has no real per-user identity worth attributing a
// change to yet. Add it back when real auth exists.
//
// This file has ZERO seeded rates by design. See docs/ave-agent-details.md
// section 5 — no real per-outlet rate has been confirmed for any outlet
// yet. Seeding fake numbers here to make the table look populated would
// violate the same no-fabrication rule this whole build has held to
// everywhere else.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_outlet_rates_v1";

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    const message = "Corrupt outlet rate data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Outlet rates storage", message });
    return {};
  }
}

function saveAll(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Returns { rateEstimate, multiplier, updatedAt } for a known outlet,
 * or null if this outlet has no rate on file. Outlet names are matched
 * case-insensitively but stored under their original casing, so display
 * always shows the outlet's real name back.
 */
export function getRate(outletName) {
  const key = normalizeKey(outletName);
  const all = loadAll();
  return all[key] || null;
}

/**
 * Creates or overwrites a rate. `multiplier` defaults to 1 (equal to
 * advertising) per docs/ave-agent-details.md — no industry-standard
 * multiplier exists, so this app never silently applies one above 1x on
 * its own; a higher multiplier has to be an explicit owner choice.
 *
 * Always stamps updatedAt to now, whether this is a brand-new rate or an
 * edit to an existing one — that timestamp is what drives the 12-month
 * staleness nudge elsewhere in the agent.
 */
export function saveRate(outletName, rateEstimate, multiplier = 1) {
  const trimmedName = String(outletName || "").trim();
  if (!trimmedName) {
    throw new Error("saveRate requires a non-empty outlet name.");
  }
  const numericRate = Number(rateEstimate);
  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    throw new Error("saveRate requires a positive rate estimate — never save a zero or guessed placeholder.");
  }

  const key = normalizeKey(trimmedName);
  const all = loadAll();
  all[key] = {
    outletName: trimmedName, // preserves real casing for display
    rateEstimate: numericRate,
    multiplier: Number(multiplier) || 1,
    updatedAt: new Date().toISOString(),
  };
  saveAll(all);
  return all[key];
}

/**
 * Every rate on file, sorted alphabetically by outlet name — used by the
 * rate list/edit view (step 5). Returns an array, not the raw keyed
 * object, since callers just need to render a list.
 */
export function listAllRates() {
  const all = loadAll();
  return Object.values(all).sort((a, b) => a.outletName.localeCompare(b.outletName));
}

/**
 * How long ago a rate was last touched, in whole days. Used to drive the
 * ~12-month staleness nudge — a display concern, so this returns a raw
 * number rather than pre-formatted text, letting the UI decide how to
 * phrase it.
 */
export function daysSinceUpdated(rate) {
  if (!rate?.updatedAt) return null;
  const updated = new Date(rate.updatedAt);
  if (Number.isNaN(updated.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((Date.now() - updated.getTime()) / msPerDay);
}

function normalizeKey(outletName) {
  return String(outletName || "").trim().toLowerCase();
}
