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
//
// CROSS-REFERENCE PASS (Aug 25) — checked this field list against every
// piece of real case-study source material in the repo (docs/agent-notes.md,
// docs/ave-agent-details.md, src/outletReference.js's CAMPAIGN_BENCHMARKS/
// OUTLET_REFERENCE) before finalizing the CSV export (canvaExport.js) for
// the build. Findings:
//   - Every HIGH_CONFIDENCE field (publication/headline/date/AVE/articleUrl)
//     and the MEDIUM "campaign"/"sentiment" fields match a real column on
//     the actual Placement record (src/schema.js, PlacementForm.js) —
//     nothing new to add there.
//   - GAP FOUND: "audienceReach" (MEDIUM) has no real place to be entered —
//     reach numbers in her case studies (VeganHood, Candlelit Care, Vegan
//     Dining Month) are campaign-level rollups, not a field on any
//     individual placement (see agent-notes.md "What this is not"). This
//     column will correctly never appear in a real export (canvaExport.js's
//     activeOptionalColumns already excludes anything with no real data),
//     but it can't be *populated* until/unless a per-placement reach field
//     is added to the Placement schema — flagging, not building, since
//     that's a schema change beyond this mapping file.
//   - The four LOW_CONFIDENCE social metrics (likes/saves/shares/views) and
//     clipsCount have ZERO supporting evidence anywhere in the cross-
//     referenced material — no case study, benchmark, or PRD pass mentions
//     them. Left in as speculative/harmless (same reason as audienceReach,
//     they never populate a real column), not removed, since her real
//     template may still use them — but don't treat them as confirmed.
// Net result: no fields were missing from what's already here. This
// mapping is still a placeholder pending her real template, not upgraded
// to "confirmed" by this pass — it just survived a real check.

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
