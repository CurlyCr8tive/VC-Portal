// server/owner-api/lib/newsSearch.js
//
// Structured news search — layer 1 of the Discovery Agent's two-layer
// search stack (see webSearchDiscovery.js for layer 2, the broader
// AI-web-search sweep that runs after this one). Queries Currents API and
// NewsData.io IN PARALLEL for the same query, merges both result sets, and
// dedupes by URL — a mention both providers surface should appear once in
// the review queue, not twice.
//
// Replaces an earlier NewsAPI.org/GNews version of this file — Currents
// and NewsData.io were chosen instead because both offer real free tiers
// with no card required (see .env.example for signup links). If you're
// reading this after a NEWS_API_KEY/GNEWS_API_KEY still exists in .env
// from that earlier version: it's orphaned now, this file no longer reads
// either one.
//
// Either key is optional independently — isNewsSearchConfigured is true as
// long as AT LEAST ONE provider is set, and a missing/failing provider
// just contributes nothing to the merged result rather than failing the
// whole search. Matches the "honest partial config, never a fake success"
// pattern used everywhere else in this build (aiClient.js's provider
// fallback, isSupabaseConfigured, etc.) — just applied to "run both and
// merge" instead of "try one, then the next."

const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

export const isNewsSearchConfigured = Boolean(CURRENTS_API_KEY || NEWSDATA_API_KEY);

async function searchCurrents({ query, pageSize }) {
  const url = new URL("https://api.currentsapi.services/v1/search");
  url.searchParams.set("keywords", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("apiKey", CURRENTS_API_KEY);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.status !== "ok") {
    throw new Error(`Currents API error (${res.status}): ${body.message || body.status || "unknown error"}`);
  }

  // Currents' article schema has no separate "source name" field — `author`
  // is the closest thing it gives per-article, so that's what stands in
  // for `publication` here. Not perfect, but not guessed either.
  return (body.news || []).map((a) => ({
    headline: a.title,
    publication: a.author || "Unknown publication",
    articleUrl: a.url,
    publishedAt: a.published || null,
    description: a.description || "",
  }));
}

async function searchNewsData({ query }) {
  const url = new URL("https://newsdata.io/api/1/news");
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("apikey", NEWSDATA_API_KEY);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.status !== "success") {
    throw new Error(`NewsData.io error (${res.status}): ${body.results?.message || body.status || "unknown error"}`);
  }

  return (body.results || []).map((a) => ({
    headline: a.title,
    publication: a.source_id || "Unknown publication",
    articleUrl: a.link,
    publishedAt: a.pubDate || null,
    description: a.description || "",
  }));
}

/** Dedupes a list of { articleUrl, ... } objects by URL, case/whitespace-insensitive, first-seen wins. */
export function dedupeByUrl(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    if (!a.articleUrl) continue;
    const key = a.articleUrl.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

/**
 * Queries every configured provider in parallel (Promise.allSettled, not
 * Promise.all — one provider failing doesn't take the other's results down
 * with it) and returns a single deduped array plus a list of per-provider
 * error strings for anything that failed, so callers/logs know when a
 * result set is partial rather than assuming a short list means nothing
 * was out there.
 */
export async function searchNews({ query, pageSize = 20 }) {
  if (!isNewsSearchConfigured) {
    throw new Error("Neither CURRENTS_API_KEY nor NEWSDATA_API_KEY is set.");
  }
  if (!query || !query.trim()) {
    throw new Error("searchNews requires a non-empty query.");
  }

  const [currentsResult, newsDataResult] = await Promise.allSettled([
    CURRENTS_API_KEY ? searchCurrents({ query, pageSize }) : Promise.resolve([]),
    NEWSDATA_API_KEY ? searchNewsData({ query }) : Promise.resolve([]),
  ]);

  const errors = [];
  const articles = [];

  if (currentsResult.status === "fulfilled") articles.push(...currentsResult.value);
  else if (CURRENTS_API_KEY) errors.push(`Currents API: ${currentsResult.reason.message}`);

  if (newsDataResult.status === "fulfilled") articles.push(...newsDataResult.value);
  else if (NEWSDATA_API_KEY) errors.push(`NewsData.io: ${newsDataResult.reason.message}`);

  return { articles: dedupeByUrl(articles), errors };
}
