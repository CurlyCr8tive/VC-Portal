// src/owner/canvaColumnMapping.js
//
// PLACEHOLDER MAPPING — every field name below is an educated guess,
// not confirmed data. Built from Tenyse's website case studies and every
// version of the PRD, since her real Canva template hasn't been shared yet.
//
// The moment her real template field names arrive, REPLACE this file
// entirely — don't patch around it. This exists so the CSV export has
// something reasonable to test against in the meantime, not so we can
// ship a guess as if it were real.

// -----------------------------------------------------------------------
// HIGH CONFIDENCE — appear in every version of the schema and every
// report format reviewed. Safe to treat as required columns.
// -----------------------------------------------------------------------
export const HIGH_CONFIDENCE_FIELDS = {
  outlet: {
    schemaField: "publication",
    guessedLabel: "Publication", // seen as "Publication," "Outlet," or just the outlet's own logo — no consistent single label
    required: true,
  },
  headline: {
    schemaField: "headline",
    guessedLabel: "Headline",
    required: true,
  },
  date: {
    schemaField: "publicationDate",
    guessedLabel: "Date", // specifically the publication date, not pitch/landed dates
    required: true,
  },
  ave: {
    schemaField: "aveValue",
    guessedLabel: "Publicity Value", // her own terminology guide uses this exact term, NOT "AVE" — use her word
    required: true,
  },
  articleUrl: {
    schemaField: "articleUrl",
    guessedLabel: "Article URL",
    required: true, // present in the data model; not always visibly labeled in her reports (often just a clickable logo)
  },
};

// -----------------------------------------------------------------------
// MEDIUM CONFIDENCE — appear in SOME but not all report formats reviewed.
// Treated as optional — export must not fail if these are missing.
// -----------------------------------------------------------------------
export const MEDIUM_CONFIDENCE_FIELDS = {
  audienceReach: {
    schemaField: "audienceReach",
    guessedLabel: "Audience Reach", // also seen as "Potential Reach" in one report — she may not use these two terms consistently herself
    required: false,
  },
  clientCampaign: {
    schemaField: "campaign",
    guessedLabel: "Campaign",
    required: false,
  },
  sentiment: {
    schemaField: "sentiment",
    guessedLabel: "Tone & Sentiment", // confirmed as her real terminology, but only seen on the SNAP Co. report specifically
    required: false,
  },
};

// -----------------------------------------------------------------------
// LOW CONFIDENCE — format-dependent, NOT safe to assume as universal.
// Only include in export if the source data actually has these populated;
// never generate a blank/placeholder value for these fields.
// -----------------------------------------------------------------------
export const LOW_CONFIDENCE_FIELDS = {
  socialLikes: { schemaField: "socialLikes", guessedLabel: "Likes", required: false },
  socialSaves: { schemaField: "socialSaves", guessedLabel: "Saves", required: false },
  socialShares: { schemaField: "socialShares", guessedLabel: "Shares", required: false },
  socialViews: { schemaField: "socialViews", guessedLabel: "Views", required: false },
  clipsCount: {
    schemaField: "clipsCount",
    guessedLabel: "News & Media Outlet Features",
    required: false, // may actually be a computed summary stat, not a real per-placement field at all
  },
};

// Combined export, in confidence order — used by canvaExport.js to build
// the CSV header row. High-confidence fields always appear; medium/low
// only appear if that specific placement has real data for them.
export const PLACEHOLDER_CANVA_MAPPING = {
  ...HIGH_CONFIDENCE_FIELDS,
  ...MEDIUM_CONFIDENCE_FIELDS,
  ...LOW_CONFIDENCE_FIELDS,
};
