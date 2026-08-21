// server/owner-api/lib/webSearchDiscovery.js
//
// Layer 2 of the Discovery Agent's search stack — a broader sweep beyond
// the structured news APIs in newsSearch.js. Claude web search tried
// first, GPT web search (via OpenAI's Responses API) only on failure —
// same PROVIDERS-loop fallback shape as aiClient.js's generateText(). This
// is deliberately a SEPARATE file from aiClient.js rather than a mode on
// it: it needs each provider's native server-side web-search TOOL (Claude's
// `web_search` tool on the Messages API, GPT's `web_search` tool on the
// Responses API — a different endpoint from aiClient's chat completions
// call), not plain text generation.
//
// Runs strictly AFTER newsSearch.js and is told what that layer already
// found (`alreadyFoundUrls`), so this only ever ADDS genuinely new
// mentions to the merged result — the point of this (more expensive)
// layer is catching what the structured APIs missed, not re-finding the
// same articles a second time.
//
// COST SAFEGUARD (non-negotiable): every call to either provider — success
// or failure — is logged via searchUsageLog.js before this function
// returns or throws. Both providers have documented real-world reports of
// these tools costing more than expected; see searchUsageLog.js for why
// every call gets logged, not just the ones assumed to be billable.
//
// Known limitation of this layer specifically: unlike newsSearch.js's
// structured results, web-search results here carry no `description`
// field (search-result citations only give url/title), so
// discoveryScoring.js's matching runs on headline text alone for anything
// found this way — a weaker signal, not a broken one.

import { logSearchUsage } from "./searchUsageLog.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function buildSearchPrompt(query) {
  return `Search the web for recent news articles, blog posts, or press mentions matching: ${query}

List every distinct article or page you find — do not summarize or merge them into one answer. I need the raw set of sources, not a synthesized summary.`;
}

async function searchViaClaude({ query, maxUses }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 1536,
      messages: [{ role: "user", content: buildSearchPrompt(query) }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxUses }],
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `Claude web search error (${res.status})`);
  }

  const results = [];
  for (const block of body.content || []) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const item of block.content) {
      if (item.type === "web_search_result") {
        results.push({ headline: item.title, articleUrl: item.url, publishedAt: item.page_age || null, description: "" });
      }
    }
  }
  return results;
}

async function searchViaGPT({ query }) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: buildSearchPrompt(query),
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `GPT web search error (${res.status})`);
  }

  const results = [];
  for (const item of body.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.type === "url_citation") {
          results.push({ headline: annotation.title, articleUrl: annotation.url, publishedAt: null, description: "" });
        }
      }
    }
  }
  return results;
}

/** Wraps a provider call so logSearchUsage always fires — including when fetch() itself throws, before any response exists. */
async function loggedCall(provider, fn, { clientId, clientName }) {
  let ok = false;
  try {
    const results = await fn();
    ok = true;
    return results;
  } finally {
    logSearchUsage({ provider, clientId, clientName, ok });
  }
}

const PROVIDERS = [
  { name: "claude", envKey: "ANTHROPIC_API_KEY", call: (args) => loggedCall("claude", () => searchViaClaude(args), args) },
  { name: "gpt", envKey: "OPENAI_API_KEY", call: (args) => loggedCall("gpt", () => searchViaGPT(args), args) },
];

export const isWebSearchDiscoveryConfigured = PROVIDERS.some((p) => Boolean(process.env[p.envKey]));

/**
 * Runs the broader web-search sweep, Claude first, GPT only if Claude
 * fails or isn't configured. Filters out anything already in
 * `alreadyFoundUrls` before returning, so the caller can just concatenate
 * this with newsSearch.js's results without re-deduping itself.
 */
export async function searchWebForMentions({ query, clientId, clientName, alreadyFoundUrls = [], maxUses = 5 }) {
  const attempted = [];
  let results = null;

  for (const provider of PROVIDERS) {
    if (!process.env[provider.envKey]) {
      attempted.push(`${provider.name}: no ${provider.envKey} set`);
      continue;
    }
    try {
      results = await provider.call({ query, clientId, clientName, maxUses });
      break;
    } catch (err) {
      attempted.push(`${provider.name}: ${err.message}`);
    }
  }

  if (!results) {
    throw new Error(`Web search discovery failed on every provider — ${attempted.join("; ")}`);
  }

  const seen = new Set(alreadyFoundUrls.filter(Boolean).map((u) => u.trim().toLowerCase()));
  return results.filter((r) => {
    if (!r.articleUrl) return false;
    const key = r.articleUrl.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
