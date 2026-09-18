// scripts/fix-placement-links.mjs
//
// Repairs article_url on placements where the stored link is wrong.
//
// Found during QA: of 11 stored links, two pointed at example.com — literal
// placeholder URLs on Greyz Bistro, a CURRENT client, in the live database.
// A headline that looks like a link and 404s is worse than a headline with
// no link: the first is a broken promise on a client's own record, the
// second is honest about missing data. One 404'd outright and two pointed at
// muckrack.com tracking redirects, which need a Muck Rack login and never
// reach the source article.
//
// Removing a bad URL is safe — PressPlacementTable then renders "No link
// saved yet" — so that runs by default. Replacements are only applied for
// URLs verified to resolve.
//
// Usage (TERMINAL, from repo root — not the Supabase SQL editor):
//   node scripts/fix-placement-links.mjs           # dry run
//   node scripts/fix-placement-links.mjs --write   # apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

for (const line of fs.readFileSync(path.join(root, "server/owner-api/.env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rest = async (p, opts = {}) => {
  const res = await fetch(`${SB}/rest/v1/${p}`, {
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(opts.prefer ? { prefer: opts.prefer } : {}) },
    ...opts,
  });
  const t = await res.text();
  const parsed = t ? JSON.parse(t) : null;
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${p} -> ${res.status}: ${JSON.stringify(parsed).slice(0, 200)}`);
  return parsed;
};

/**
 * A stored link is "bad" if it can never reach the coverage:
 *   - example.com — placeholder that was never a real article
 *   - muckrack.com/link/… — an aggregator tracking redirect that requires a
 *     Muck Rack login; it is not the source article even when it resolves
 * Live 404s are listed explicitly, since a 404 today may be a moved article
 * rather than a fabricated URL, and that distinction is worth keeping.
 */
const isPlaceholder = (url) => /^https?:\/\/(www\.)?example\.(com|org|net)\b/i.test(url || "");
const isAggregatorRedirect = (url) => /muckrack\.com\/link\//i.test(url || "");

const KNOWN_DEAD = new Set([
  // Verified 404 on 2026-09-18.
  "https://finance.yahoo.com/news/houston-housing-authority-board-directors-161000092.html",
]);

/**
 * Verified replacements, keyed by the publication the placement is filed
 * under. Each was confirmed to return 200 on 2026-09-18 before being put
 * here — a replacement that isn't checked is just a different broken link.
 *
 * Only PRWeb could be recovered. The Houston Business Journal pieces sit
 * behind a paywall and aren't indexed, and the Yahoo Finance syndication of
 * the same release is gone, so those get cleared rather than guessed at.
 */
const REPLACEMENTS = {
  PRWeb: "https://www.prweb.com/releases/houston-housing-authority-board-of-directors-announces-david-a-northern-sr-as-president-amp-ceo-871316352.html",
};

const placements = await rest("placements?select=id,publication,headline,article_url,client_id,notes");
const clients = await rest("clients?select=id,name");
const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));

const clears = [];
for (const p of placements) {
  if (!p.article_url) continue;
  let reason = null;
  if (isPlaceholder(p.article_url)) reason = "placeholder (example.com) — never a real article";
  else if (isAggregatorRedirect(p.article_url)) reason = "Muck Rack tracking redirect — needs a login, not the source";
  else if (KNOWN_DEAD.has(p.article_url)) reason = "verified 404";
  if (reason) {
    const replacement = REPLACEMENTS[p.publication] || null;
    clears.push({ ...p, reason, replacement });
  }
}

console.log(`Supabase: ${new URL(SB).host}\n`);
console.log(`${placements.filter((p) => p.article_url).length} placements have a link; ${clears.length} are unreachable:\n`);
for (const c of clears) {
  console.log(`  ${clientName[c.client_id]} — ${c.publication}`);
  console.log(`     ${c.reason}`);
  console.log(`     was: ${c.article_url}`);
  console.log(`     ${c.replacement ? `REPLACE with: ${c.replacement}` : "CLEAR (old URL preserved in notes)"}\n`);
}

if (!clears.length) { console.log("Nothing to fix."); process.exit(0); }
if (!WRITE) { console.log("Dry run — nothing written. Re-run with --write to clear these."); process.exit(0); }

let replaced = 0;
let cleared = 0;
for (const c of clears) {
  if (c.replacement) {
    await rest(`placements?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ article_url: c.replacement }), prefer: "return=minimal" });
    replaced += 1;
    continue;
  }
  // Preserve the old URL in notes rather than destroying it. It may be the
  // only record of where this placement was filed, and someone with a Muck
  // Rack login could still follow it — clearing the field only stops the UI
  // offering a link that fails for Tenyse and her clients.
  const stamp = `[${new Date().toISOString().slice(0, 10)}] Unreachable article_url removed (${c.reason}). Previous value: ${c.article_url}`;
  const notes = c.notes ? `${c.notes}\n\n${stamp}` : stamp;
  await rest(`placements?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ article_url: null, notes }), prefer: "return=minimal" });
  cleared += 1;
}
console.log(`\nReplaced ${replaced} link(s) with a verified URL.`);
console.log(`Cleared ${cleared} unreachable link(s) — old URLs preserved in each placement's notes.`);
console.log(`Those rows now read "No link saved yet" instead of promising a link that fails.`);
