// Executive summary — draft-only shell. Per the PRD's shared AI-writing
// pattern ("AI drafts, owner approves"), but there's no AI call wired up
// yet (Phase 7, planned — needs an API key + a Claude/GPT decision, neither
// of which exist). This is the "owner approves" half without the "AI
// drafts" half: Tenyse writes the summary herself for now, in the exact
// spot a Generate button will eventually fill in. Swapping in a real
// generate call later doesn't change where this data lives or how it's
// displayed.

const STORAGE_KEY = "vc_exec_summaries_v1";

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.warn("Corrupt summary data in localStorage — starting fresh.");
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
    all[clientName] = { text: trimmed, savedAt: new Date().toISOString() };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
