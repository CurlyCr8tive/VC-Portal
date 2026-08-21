// server/owner-api/lib/discoveryScoring.js
//
// IMPORTANT CONTEXT: despite earlier notes describing Discovery Agent
// "scoring logic" as already built, no such code actually existed anywhere
// in this repo before this file — only a hand-authored mock review-queue
// array in src/owner/app.js (three fake rows, one deliberately written as
// a false-positive example). This is a genuinely new, intentionally simple
// first pass, not a rebuild of something more sophisticated. Revisit once
// real scan results show what this actually needs to catch.
//
// Matches clients.keyword_config (db/schema.sql) against a searched
// article's title/description. Shape assumed for keyword_config, since the
// PRD left it unfinalized pending real keyword tuning:
//   { clientName: string, companyName?: string, aliases?: string[] }

function normalize(text) {
  return String(text || "").toLowerCase();
}

/**
 * Builds a plain search-engine query string from a client's keyword_config
 * — every configured term OR'd together, so the search casts a wide net;
 * scoreArticleMatch below is what narrows results down afterward.
 */
export function buildSearchQuery(keywordConfig) {
  const terms = collectTerms(keywordConfig);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"`).join(" OR ");
}

function collectTerms(keywordConfig) {
  const { clientName, companyName, aliases } = keywordConfig || {};
  return [clientName, companyName, ...(Array.isArray(aliases) ? aliases : [])].filter(Boolean).map((t) => String(t).trim()).filter(Boolean);
}

/**
 * Scores one article against a client's keyword_config. Returns null if
 * nothing matches at all (not a candidate). Otherwise returns
 * { matchedOn, confidence }, confidence one of 'high' | 'medium' | 'low'.
 *
 * Deliberately simple: count how many distinct configured terms appear in
 * the title+description, and whether the client's bare name matched
 * without any supporting company/alias context — the exact false-positive
 * shape the original mock data called out ("VeganHood name-only match, no
 * company context — likely false positive").
 */
export function scoreArticleMatch(article, keywordConfig) {
  const { clientName, companyName, aliases } = keywordConfig || {};
  const haystack = normalize(`${article.headline || ""} ${article.description || ""}`);

  const supportingTerms = [companyName, ...(Array.isArray(aliases) ? aliases : [])].filter(Boolean);
  const matchedSupporting = supportingTerms.filter((t) => haystack.includes(normalize(t)));
  const clientNameMatched = clientName ? haystack.includes(normalize(clientName)) : false;

  if (!clientNameMatched && matchedSupporting.length === 0) {
    return null;
  }

  const matchedTerms = [...(clientNameMatched ? [clientName] : []), ...matchedSupporting];

  if (matchedSupporting.length > 0 && clientNameMatched) {
    return { matchedOn: matchedTerms.join(" + "), confidence: "high" };
  }
  if (matchedSupporting.length > 0) {
    return { matchedOn: matchedTerms.join(" + "), confidence: "medium" };
  }
  return {
    matchedOn: `"${clientName}" name-only match, no company context — likely false positive`,
    confidence: "low",
  };
}
