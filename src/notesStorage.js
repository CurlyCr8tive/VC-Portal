// Campaign notes thread — per the Final PRD's "Notes & Client Communication"
// section: scoped to a campaign, not the client as a whole, visible on both
// the owner side and that client's own view. Real localStorage data, same
// pattern as storage.js/campaignStorage.js.
//
// NOT built here: the Gmail notification to the owner when a client posts.
// That needs real Gmail OAuth (Required Access table: "Not yet raised").
// The thread itself works without it — the owner just has to open the
// dashboard to see a new note instead of getting pinged.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_campaign_notes_v1";

function loadAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const message = "Corrupt notes data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Notes storage", message });
    return [];
  }
}

function saveAll(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function loadNotesForCampaign(campaignId) {
  return loadAll()
    .filter((n) => n.campaignId === campaignId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function addNote({ campaignId, authorRole, authorName, body }) {
  const trimmed = String(body || "").trim();
  if (!trimmed) throw new Error("A note can't be empty.");
  const note = {
    id: crypto.randomUUID(),
    campaignId,
    authorRole,
    authorName,
    body: trimmed,
    createdAt: new Date().toISOString(),
  };
  const all = loadAll();
  all.push(note);
  saveAll(all);
  return note;
}
