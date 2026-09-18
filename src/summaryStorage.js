// Executive summary — draft-only shell. Per the PRD's shared AI-writing
// pattern ("AI drafts, owner approves"), but there's no AI call wired up
// yet (Phase 7, planned — needs an API key + a Claude/GPT decision, neither
// of which exist). This is the "owner approves" half without the "AI
// drafts" half: Tenyse writes the summary herself for now, in the exact
// spot a Generate button will eventually fill in. Swapping in a real
// generate call later doesn't change where this data lives or how it's
// displayed.

import { logError } from "./errorLog.js";
import { toReportProse, hasMarkdownArtifacts } from "./reportProse.js";

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

/**
 * Rewrites any stored summary still carrying Markdown into plain prose.
 *
 * The seeded summaries were hand-written with "# Title" and "**Problem**",
 * and nothing in this app renders Markdown — the text goes into a plain
 * textarea, into the client's own dashboard, and into a Canva export, so a
 * client reads the literal asterisks. Fixing the seed only helps a browser
 * seeding for the first time; every browser that already ran it, including
 * ones where Tenyse has APPROVED the text, keeps the old copy until this
 * runs.
 *
 * Safe to call on every load: text with no Markdown is left untouched, and
 * the conversion changes symbols only, never words (see reportProse.js).
 * Approval state is preserved — this is a formatting pass, not a new draft,
 * so it must not quietly un-approve something Tenyse already signed off.
 */
export function normalizeStoredSummaryFormatting() {
  const all = loadAll();
  let changed = 0;
  for (const [clientName, entry] of Object.entries(all)) {
    const text = typeof entry === "string" ? entry : entry?.text;
    if (!text || !hasMarkdownArtifacts(text)) continue;
    const cleaned = toReportProse(text);
    if (cleaned === text) continue;
    all[clientName] = typeof entry === "string" ? cleaned : { ...entry, text: cleaned };
    changed += 1;
  }
  if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return changed;
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
