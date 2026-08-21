// src/errorLog.js
//
// Client-side error log — mirrors the localStorage storage pattern used
// throughout this build (outletRatesStorage.js, summaryStorage.js, etc.).
// This is the localStorage version of the `errors` table already defined
// in db/schema.sql; once Supabase is live, that table becomes the
// production version of exactly this — same relationship every other
// real/localStorage pair in this app already has.
//
// Not tied to any specific agent — logError() is a general-purpose sink for
// failures that currently just get caught and console.warn'd/console.error'd
// with nothing left behind for the owner to see later. See the Settings
// view's "Agent Error Log" card (src/owner/app.js) for where this renders.

const STORAGE_KEY = "vc_error_log_v1";

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Deliberately NOT calling logError here — a corrupt error log
    // recursively logging its own corruption is exactly the kind of loop
    // this file exists to avoid. console.warn is the honest floor.
    console.warn("Corrupt error log data in localStorage — starting fresh.");
    return [];
  }
}

function saveAll(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Records a failure. `source` should identify where it happened (e.g.
 * "placements storage", "Canva export") and `message` should be the
 * human-readable reason — both required, since an error log entry with
 * either missing isn't useful to anyone reviewing it later.
 */
export function logError({ source, message }) {
  const trimmedSource = String(source || "").trim();
  const trimmedMessage = String(message || "").trim();
  if (!trimmedSource || !trimmedMessage) {
    throw new Error("logError requires both a source and a message.");
  }

  const all = loadAll();
  all.unshift({
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source: trimmedSource,
    message: trimmedMessage,
    occurredAt: new Date().toISOString(),
  });
  saveAll(all);
}

/** Every logged error, most recent first. */
export function listErrors() {
  return loadAll();
}

/** Removes a single error entry by id. No-op if the id isn't found. */
export function clearError(id) {
  const all = loadAll().filter((e) => e.id !== id);
  saveAll(all);
}

/** Removes every logged error. */
export function clearAllErrors() {
  saveAll([]);
}
