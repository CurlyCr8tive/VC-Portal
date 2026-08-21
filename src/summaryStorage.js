// Executive summary — draft-only shell. Per the PRD's shared AI-writing
// pattern ("AI drafts, owner approves"), but there's no AI call wired up
// yet (Phase 7, planned — needs an API key + a Claude/GPT decision, neither
// of which exist). This is the "owner approves" half without the "AI
// drafts" half: Tenyse writes the summary herself for now, in the exact
// spot a Generate button will eventually fill in. Swapping in a real
// generate call later doesn't change where this data lives or how it's
// displayed.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_exec_summaries_v1";

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    const message = "Corrupt summary data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Executive summary storage", message });
    return {};
  }
}

export function loadSummary(clientName) {
  return loadAll()[clientName] || null;
}

export function saveSummary(clientName, text) {
  const trimmed = String(text || "").trim();
  const all = loadAll();
  if (!trimmed) {
    delete all[clientName];
  } else {
    // A save always represents new/changed text, so it never carries an
    // approvedAt forward — that's not an oversight, it's the point. If
    // Tenyse edits and re-saves an already-approved summary, the new text
    // is an unapproved draft again until she explicitly approves it a
    // second time. Silently keeping the old approval would mean edited
    // text could reach a client-facing export without ever being reviewed.
    all[clientName] = { text: trimmed, savedAt: new Date().toISOString() };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Marks the currently-saved summary as approved — a distinct action from
 * saving, per the AI Writing Functions rule ("owner reviews, edits,
 * regenerates, or approves before anything becomes client-facing... no
 * exceptions"). Operates on whatever's already in storage, not on unsaved
 * textarea contents, so there's never ambiguity about which exact text got
 * approved.
 */
export function approveSummary(clientName) {
  const all = loadAll();
  const existing = all[clientName];
  if (!existing) {
    throw new Error(`No saved summary exists for ${clientName} — save one before approving it.`);
  }
  all[clientName] = { ...existing, approvedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
