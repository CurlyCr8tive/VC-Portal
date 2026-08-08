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
  "sentiment",
];

export const SENTIMENT_OPTIONS = ["positive", "neutral", "negative"];

// Minimum fields required for a placement to be worth saving.
// (Everything else — dates, AVE, notes, campaign — can be filled in later.)
const REQUIRED_FIELDS = ["publication", "headline", "client"];

function normalizeFields(raw) {
  const missing = REQUIRED_FIELDS.filter((f) => !raw[f] || !String(raw[f]).trim());
  if (missing.length) {
    throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  }

  return {
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
    // No sentiment agent exists yet (PRD Phase 7, planned) — this is always
    // a manual, owner-set value for now, defaulting to "not set" rather than
    // guessing a tone with no analysis behind it.
    sentiment: SENTIMENT_OPTIONS.includes(raw.sentiment) ? raw.sentiment : null,
  };
}

/**
 * Builds a normalized Placement record from raw form input.
 * Generates id/createdAt, coerces aveValue to a number, and trims strings.
 */
export function createPlacement(raw) {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...normalizeFields(raw),
  };
}

/**
 * Applies an edit to an existing placement — same validation and field
 * normalization as createPlacement, but keeps the original id/createdAt so
 * updatePlacement() (storage.js) can find and replace the right record
 * instead of creating a duplicate.
 */
export function applyPlacementEdit(existing, raw) {
  return {
    id: existing.id,
    createdAt: existing.createdAt,
    ...normalizeFields(raw),
  };
}
