// server/owner-api/lib/searchUsageLog.js
//
// Cost-visibility log for webSearchDiscovery.js's paid AI-web-search calls
// (Claude web search, GPT web search via OpenAI's Responses API). NOT an
// error log — mirrors src/errorLog.js's shape (append an entry, list
// entries) but for a different purpose: both providers have documented
// real-world cases of these tools costing more than expected, so every
// call gets one entry here, success or failure, rather than only logging
// the ones that "count." This is the non-negotiable safeguard from the
// build plan — usage traceable over time, not discovered later in a bill.
//
// Server-side, so no localStorage — persisted to a local JSON Lines file
// so it survives a restart. Becomes a real Supabase table (alongside
// `errors` in db/schema.sql) once Supabase is live; same
// real/local-file relationship every other piece of this build has before
// its production backing store exists.

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "data");
const LOG_FILE = join(LOG_DIR, "search-usage-log.jsonl");

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Records one web-search API call. `ok` is whether the HTTP call itself
 * succeeded — not whether it found results, and not a claim about whether
 * the provider actually billed for it (Anthropic doesn't bill a failed
 * web search; OpenAI's failure-billing behavior isn't publicly
 * guaranteed either way). Logging every call regardless of outcome is the
 * honest choice here rather than trying to guess which ones "counted."
 */
export function logSearchUsage({ provider, clientId, clientName, ok }) {
  ensureLogDir();
  const entry = {
    provider,
    clientId: clientId || null,
    clientName: clientName || null,
    ok: Boolean(ok),
    occurredAt: new Date().toISOString(),
  };
  appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
}

/** Every logged web-search call, oldest first (append order). */
export function listSearchUsage() {
  ensureLogDir();
  if (!existsSync(LOG_FILE)) return [];
  return readFileSync(LOG_FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
