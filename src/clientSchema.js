// Client schema — a first-class record, not just a name string placements
// happen to share. Before this, getRealClients() (realDataSource.js)
// derived the entire client list purely from placement.client text
// values — no status, no engagement type, no contact info existed
// anywhere. That's fine for "does this client have any placements" but
// can't answer "is this client still active" — which matters a lot once
// portfolio/past clients (VeganHood, closed per Tenyse) sit in the same
// real data path as current ones (Chef Garth/Greyz Bistro).
//
// Placements still carry a free-text `client` field (unchanged, no
// migration) — a Client record is matched to those placements by exact
// name, same pattern campaignSchema.js already uses for campaign/client
// matching.

export const CLIENT_STATUSES = ["active", "past", "unconfirmed"];
// "unconfirmed" is not a lesser third status hidden in a dropdown — it's
// the honest default for a portfolio/case-study client Tenyse hasn't
// explicitly told us is closed OR current. Never guess between the other
// two; leave it unconfirmed until she says.

export const ENGAGEMENT_TYPES = ["pr", "coaching", "pr_and_coaching"];

const REQUIRED_FIELDS = ["name"];

function normalizeKeywordConfig(raw) {
  const existing = raw.keywordConfig || raw.keyword_config || {};
  const clientName = String(raw.discoveryClientName || existing.clientName || raw.name || "").trim();
  const companyName = String(raw.discoveryCompanyName || existing.companyName || "").trim();
  const aliasesRaw = raw.discoveryAliases != null ? raw.discoveryAliases : Array.isArray(existing.aliases) ? existing.aliases.join("\n") : "";
  const aliases = String(aliasesRaw)
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    clientName,
    ...(companyName ? { companyName } : {}),
    ...(aliases.length ? { aliases } : {}),
  };
}

function normalizeFields(raw) {
  const missing = REQUIRED_FIELDS.filter((f) => !raw[f] || !String(raw[f]).trim());
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }
  return {
    name: raw.name.trim(),
    status: CLIENT_STATUSES.includes(raw.status) ? raw.status : "unconfirmed",
    engagementType: ENGAGEMENT_TYPES.includes(raw.engagementType) ? raw.engagementType : "pr",
    contactEmail: raw.contactEmail?.trim() || "",
    industry: raw.industry?.trim() || "",
    engagementStartDate: raw.engagementStartDate || "",
    notes: raw.notes?.trim() || "",
    keywordConfig: normalizeKeywordConfig(raw),
  };
}

export function createClient(raw) {
  return {
    id: raw.id || crypto.randomUUID(),
    createdAt: raw.createdAt || new Date().toISOString(),
    ...normalizeFields(raw),
  };
}

/** Keeps id/createdAt — every other field is editable via the client info form. */
export function applyClientEdit(existing, raw) {
  return {
    id: existing.id,
    createdAt: existing.createdAt,
    ...normalizeFields(raw),
  };
}
