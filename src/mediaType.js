// src/mediaType.js
//
// Classifies a placement's publication into a media type (Online, Print,
// TV, Podcast, Radio, Other) — a dimension the schema has never tracked,
// needed for the "Placements by Media Type" breakdown.
//
// This is a name-based heuristic, not a sourced fact: nobody has
// confirmed per-placement media type. But it is a real classification —
// "PIX11 is a TV station" is true, not invented — rather than an
// arbitrary percentage split. Every known real outlet in this codebase
// (outletReference.js, outletTrafficReference.js) is classified
// explicitly below; anything unrecognized falls through to a handful of
// keyword checks, and failing those, "Other" rather than a guess.
//
// Flagged the same way estimated AVE figures are: mediaTypeConfidence
// distinguishes an explicit classification from a keyword guess, so this
// can be tightened later without re-deriving from scratch.

const KNOWN_OUTLETS = {
  // --- Online / digital news & lifestyle ---
  "Blavity News": "Online", "NewsOne": "Online", "LGBTQ Nation": "Online",
  "Forbes": "Online", "Essence": "Online", "Black Enterprise": "Online",
  "VegOut": "Online", "Patch": "Online", "Yahoo Finance": "Online",
  "Yahoo News": "Online", "21Ninety": "Online", "Bisnow": "Online",
  "PRWeb": "Online", "Daily Advent Nigeria": "Online", "Business Insider": "Online",
  "New York Post": "Online", "Eat This, Not That!": "Online", "POPSUGAR Wellness": "Online",
  "The Shade Room": "Online", "Rolling Out": "Online", "Bauce": "Online",
  "Today": "Online", "Time": "Online", "NowThisHer": "Online",
  "Houston Business Journal": "Online", "The Birmingham Times": "Online",
  // --- Print magazines ---
  "VegWorld Magazine": "Print", "QSR Magazine": "Print", "QSR": "Print",
  "SELF Magazine": "Print", "SELF": "Print", "Parents": "Print",
  "Condé Nast Traveler": "Print", "FSR": "Print",
  // --- TV / broadcast ---
  "PIX11": "TV", "NBC": "TV", "KOIN 6": "TV", "BET": "TV",
  "Las Vegas Morning Blend": "TV",
  // --- Radio ---
  "102.7 KIIS FM (iHeart)": "Radio", "102.7 KIIS FM": "Radio",
};

const KEYWORD_RULES = [
  [/\bFM\b|\bAM\b|radio/i, "Radio"],
  [/\bTV\b|television|\bnews\s?\d/i, "TV"],
  [/magazine/i, "Print"],
  [/podcast/i, "Podcast"],
];

/**
 * Returns { type, confidence } — confidence is "classified" for a name in
 * KNOWN_OUTLETS, "keyword" for a pattern match, "unknown" (type "Other")
 * for anything else. Never a sourced fact either way — see module header.
 */
export function classifyMediaType(publication) {
  const name = String(publication || "").trim();
  if (!name) return { type: "Other", confidence: "unknown" };
  if (KNOWN_OUTLETS[name]) return { type: KNOWN_OUTLETS[name], confidence: "classified" };
  // Bundled campaign-total rows list several outlets in one field
  // ("8 outlets incl. VegOut, QSR, ...") — classify by the first outlet
  // named, since that's the best available signal for one field that
  // actually covers several.
  for (const [known, type] of Object.entries(KNOWN_OUTLETS)) {
    if (name.includes(known)) return { type, confidence: "classified" };
  }
  for (const [pattern, type] of KEYWORD_RULES) {
    if (pattern.test(name)) return { type, confidence: "keyword" };
  }
  return { type: "Other", confidence: "unknown" };
}

export const MEDIA_TYPES = ["Online", "Print", "TV", "Podcast", "Radio", "Other"];
