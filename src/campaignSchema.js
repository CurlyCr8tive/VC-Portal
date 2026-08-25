// Campaign schema — a first-class record, not just a text label placements
// happen to share. Per the Final PRD (confirmed 7/31): "Campaign... core to
// her actual mental model — she tracks AVE, progress, and notes per campaign
// directly." Placements still carry a free-text `campaign` field (unchanged,
// to avoid a bigger migration); a real Campaign record is matched to those
// placements by (name, client) in realDataSource.js. See CAMPAIGN_STATUSES
// for the same status vocabulary used in db/schema.sql.

export const CAMPAIGN_STATUSES = ["active", "completed", "paused"];

const REQUIRED_FIELDS = ["name", "client"];

function normalizeFields(raw) {
  const missing = REQUIRED_FIELDS.filter((f) => !raw[f] || !String(raw[f]).trim());
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }
  return {
    name: raw.name.trim(),
    client: raw.client.trim(),
    startDate: raw.startDate || "",
    // Free text ("6 weeks", "Q4", "ongoing") rather than a computed end
    // date — Tenyse describes campaign length loosely, not always as a
    // fixed date range.
    duration: raw.duration?.trim() || "",
    // Advertising/media spend tied to the campaign, distinct from AVE
    // (which values placements earned, not spent). Stored as a number or
    // null — never a fabricated 0 for "not entered yet."
    budget: raw.budget !== undefined && raw.budget !== null && String(raw.budget).trim() !== "" && Number.isFinite(Number(raw.budget))
      ? Number(raw.budget)
      : null,
    status: CAMPAIGN_STATUSES.includes(raw.status) ? raw.status : "active",
  };
}

export function createCampaign(raw) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    milestones: [],
    ...normalizeFields(raw),
  };
}

/** Keeps id/createdAt/milestones — only name/client/startDate/status are editable via the form. */
export function applyCampaignEdit(existing, raw) {
  return {
    id: existing.id,
    createdAt: existing.createdAt,
    milestones: existing.milestones || [],
    ...normalizeFields(raw),
  };
}

export function addMilestone(campaign, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("A milestone needs some text.");
  const milestone = { id: crypto.randomUUID(), text: trimmed, done: false, createdAt: new Date().toISOString() };
  return { ...campaign, milestones: [...(campaign.milestones || []), milestone] };
}

export function toggleMilestone(campaign, milestoneId) {
  return {
    ...campaign,
    milestones: (campaign.milestones || []).map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)),
  };
}

export function removeMilestone(campaign, milestoneId) {
  return { ...campaign, milestones: (campaign.milestones || []).filter((m) => m.id !== milestoneId) };
}
