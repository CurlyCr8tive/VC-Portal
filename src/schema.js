// Press Placement schema — the single source of truth for what a "placement" is.
// A future discovery agent should produce objects shaped like this too, so it can
// write into the same storage layer without any table/schema changes.

export const PLACEMENT_FIELDS = [
  "publication",
  "headline",
  "articleUrl",
  "publicationDate",
  "client",
  "aveValue",
  "pitchSentDate",
  "landedDate",
  "notes",
  "campaign",
];

// Minimum fields required for a placement to be worth saving.
// (Everything else — dates, AVE, notes, campaign — can be filled in later.)
const REQUIRED_FIELDS = ["publication", "headline", "client"];

/**
 * Builds a normalized Placement record from raw form input.
 * Generates id/createdAt, coerces aveValue to a number, and trims strings.
 */
export function createPlacement(raw) {
  const missing = REQUIRED_FIELDS.filter((f) => !raw[f] || !String(raw[f]).trim());
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    publication: raw.publication.trim(),
    headline: raw.headline.trim(),
    articleUrl: raw.articleUrl?.trim() || "",
    publicationDate: raw.publicationDate || "",
    client: raw.client.trim(),
    aveValue: raw.aveValue !== "" && raw.aveValue != null ? Number(raw.aveValue) : null,
    pitchSentDate: raw.pitchSentDate || "",
    landedDate: raw.landedDate || "",
    notes: raw.notes?.trim() || "",
    campaign: raw.campaign?.trim() || null,
  };
}
