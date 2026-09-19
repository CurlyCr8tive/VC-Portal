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
  "leadTimeOverrideDays",
  "leadTimeSource",
  "leadTimeNotes",
  "notes",
  "campaign",
  "sentiment",
  "audienceReach",
  "aveDataQuality",
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
    leadTimeOverrideDays:
      raw.leadTimeOverrideDays !== "" && raw.leadTimeOverrideDays != null && Number.isFinite(Number(raw.leadTimeOverrideDays))
        ? Number(raw.leadTimeOverrideDays)
        : null,
    leadTimeSource: ["dates", "manual", "sample", "gmail", "unknown"].includes(raw.leadTimeSource) ? raw.leadTimeSource : "dates",
    leadTimeNotes: raw.leadTimeNotes?.trim() || "",
    notes: raw.notes?.trim() || "",
    campaign: raw.campaign?.trim() || null,
    // No sentiment agent exists yet (PRD Phase 7, planned) — this is always
    // a manual, owner-set value for now, defaulting to "not set" rather than
    // guessing a tone with no analysis behind it.
    sentiment: SENTIMENT_OPTIONS.includes(raw.sentiment) ? raw.sentiment : null,
    // Per-placement audience reach — real in her case studies (VeganHood,
    // Candlelit Care, Vegan Dining Month all report a reach figure), but
    // those are campaign-level rollups, not per-article numbers; this field
    // just gives a real place to enter one when Tenyse has it for a
    // specific placement. Null (not 0) when not entered — an unknown reach
    // is not the same claim as zero reach.
    audienceReach: raw.audienceReach !== "" && raw.audienceReach != null && Number.isFinite(Number(raw.audienceReach))
      ? Number(raw.audienceReach)
      : null,
    // Why this figure should not be treated as settled, when that applies —
    // null (the normal case) means "no known problem," NOT "verified." The
    // app has no verification step to assert the positive claim, so this
    // deliberately only records doubt, never confidence.
    //
    // Exists because a known-suspect number was being seeded and displayed
    // as ordinary real data: the $492,198/14.2M pair that appears under both
    // VeganHood-CPG and Candlelit Care (see outletReference.js's
    // CAMPAIGN_BENCHMARKS notes — almost certainly a reused Canva template
    // stat block, not two independently-calculated figures). The benchmark
    // rows carried `verified: false`, but the seeded placements carried
    // nothing, so the dashboard presented the figure with full confidence.
    // A caveat that lives only in a source comment isn't a caveat the owner
    // ever sees.
    aveDataQuality: raw.aveDataQuality?.trim() || null,
  };
}

/**
 * Builds a normalized Placement record from raw form input.
 * Generates id/createdAt, coerces aveValue to a number, and trims strings.
 */
export function createPlacement(raw) {
  return {
    id: raw.id || crypto.randomUUID(),
    createdAt: raw.createdAt || new Date().toISOString(),
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
  const normalized = normalizeFields(raw);
  return {
    id: existing.id,
    createdAt: existing.createdAt,
    ...normalized,
    // The placement form has no input for aveDataQuality, so a plain edit
    // would otherwise wipe an existing flag just by saving the row — the
    // warning would vanish with no one having decided anything about it.
    // Carried forward instead, EXCEPT when the AVE figure itself changed:
    // typing a new number is the owner resolving the doubt, and leaving a
    // "this figure is unconfirmed" warning attached to a figure she just
    // corrected would be worse than dropping it.
    aveDataQuality:
      normalized.aveDataQuality ?? (normalized.aveValue === existing.aveValue ? existing.aveDataQuality ?? null : null),
  };
}
