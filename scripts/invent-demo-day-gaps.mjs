// scripts/invent-demo-day-gaps.mjs
//
// FILLS PITCH DATES AND SENTIMENT WITH INVENTED VALUES, AT THE OWNER'S
// EXPLICIT, TWICE-STATED DIRECTION — for Demo Day (Sept 23, 2026), to be
// corrected afterward once real values are known.
//
// This crosses a line the rest of this build has deliberately held: a
// pitch date is a fact about Tenyse's actual outreach, not something an
// industry formula can estimate the way AVE can. There is no defensible
// method here — this is invention, not derivation, and it is recorded as
// such everywhere it lands:
//
//   - Every changed row gets a dated tag prepended to its `notes` field:
//     "[INVENTED FOR DEMO — 2026-09-18] pitchSentDate set to <value>,
//     no real date on file. Replace before this reaches a client."
//   - Every changed id/field/old-value/new-value is written to
//     demo-day-invented-values.json in the repo root, so the exact set of
//     changes can be found and reverted in one pass — see
//     scripts/revert-demo-day-gaps.mjs.
//
// Pitch dates: landedDate/publicationDate minus a plausible lead time
// (14-21 days, matching the 17-19 day range Greyz Bistro's own REAL two
// placements show — not an arbitrary number).
//
// Sentiment: "positive" only, only on the 3 bundled campaign-total rows
// that are already missing it — these are wins from Tenyse's own
// showcase decks, so positive is the least-invented guess available, but
// it is still a guess with no per-article analysis behind it.
//
// Usage: node scripts/invent-demo-day-gaps.mjs [--write]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");
const TODAY = new Date().toISOString().slice(0, 10);
const MANIFEST_PATH = path.join(root, "demo-day-invented-values.json");

for (const line of fs.readFileSync(path.join(root, "server/owner-api/.env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rest = async (p, { method = "GET", body, prefer } = {}) => {
  const res = await fetch(`${URL_}/rest/v1/${p}`, {
    method,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await res.text();
  const parsed = t ? JSON.parse(t) : null;
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed;
};

const clients = await rest("clients?select=id,name");
const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));
const placements = await rest("placements?select=id,client_id,publication,pitch_sent_date,landed_date,publication_date,sentiment_tag,notes");

// A row's landedDate alone is NOT trustworthy as an anchor: bundled
// campaign-total rows (no single article, so no single date by design —
// see seedRealCaseStudyData.js) carry seedRealCaseStudyData.js's
// RECORDING_DATE there instead — "the day this was typed in," not "the day
// it published." Anchoring an invented pitch date to it produced dates
// like September 2026 for a documented 2022 campaign. Checked directly
// against the live data rather than by reading `notes` (unreliable — a
// later, unrelated commit rewrote at least one row's notes to demo-polish
// copy, dropping the disclosure text that used to flag this): every row
// where publication_date IS set has landed_date equal to it, confirmed
// across all 17 live rows. A row with no publication_date is exactly the
// placeholder case, with no exception found in this data.
function isRealAnchor(p) {
  return Boolean(p.publication_date);
}
const clientRealAnchor = new Map();
for (const p of placements) {
  if (!isRealAnchor(p)) continue;
  const current = clientRealAnchor.get(p.client_id);
  if (!current || p.publication_date < current) clientRealAnchor.set(p.client_id, p.publication_date);
}
// Every client in this seed batch is documented as 2022 case-study
// material (seedRealCaseStudyData.js's own header: "real historical
// case-study data... sourced from Tenyse's own past reporting"). A client
// with zero real dates anywhere (none of its siblings have one either)
// falls back to this rather than to today.
const HISTORICAL_FALLBACK_DATE = "2022-06-01";

// Deterministic-but-varied lead time so every row isn't identically 17
// days — still landing in the same real range Greyz Bistro's own genuine
// placements show (17, 19 days).
function inventedLeadTimeDays(seedStr) {
  let hash = 0;
  for (const ch of seedStr) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 14 + (hash % 8); // 14-21 days
}

const changes = [];

for (const p of placements) {
  const patch = {};
  const tags = [];

  if (!p.pitch_sent_date) {
    const ownReal = isRealAnchor(p) ? p.publication_date : null;
    const anchor = ownReal || clientRealAnchor.get(p.client_id) || HISTORICAL_FALLBACK_DATE;
    const anchorDate = new Date(anchor);
    if (!Number.isNaN(anchorDate.getTime())) {
      const days = inventedLeadTimeDays(p.id);
      const pitchDate = new Date(anchorDate);
      pitchDate.setDate(pitchDate.getDate() - days);
      const pitchStr = pitchDate.toISOString().slice(0, 10);
      patch.pitch_sent_date = pitchStr;
      tags.push(
        `pitchSentDate set to ${pitchStr} (${days}d before ${ownReal ? "this placement's own" : "this client's earliest known"} real date ${anchor})`
      );

      // If landed_date isn't backed by a real publication_date either, it
      // is ALSO a RECORDING_DATE placeholder (today, whenever it was typed
      // in) — not a real publish date. Pairing a historically-anchored
      // invented pitch date against that placeholder produced 1500+ day
      // "lead times" (caught in QA before this ever reached a client):
      // the pitch end was fixed to be realistic, but the landed end was
      // still silently "today," years apart from the invented pitch date.
      // Replacing landed_date too, anchored to the SAME real date, keeps
      // the pair internally consistent — both ends now describe the same
      // invented moment in the campaign's real history, not one real-ish
      // date paired against one placeholder.
      if (!ownReal) {
        patch.landed_date = anchor;
        tags.push(`landed_date changed from its RECORDING_DATE placeholder (${p.landed_date}) to ${anchor} — pairing an invented pitch date against that placeholder produced a multi-year "lead time"`);
      }
    }
  }

  if (!p.sentiment_tag) {
    patch.sentiment_tag = "positive";
    tags.push(`sentiment_tag set to "positive" — no per-article sentiment analysis behind this, a showcase-deck placement assumed positive`);
  }

  if (Object.keys(patch).length) {
    const stamp = `[INVENTED FOR DEMO — ${TODAY}] ${tags.join("; ")}. Replace before this reaches a client.`;
    patch.notes = p.notes ? `${p.notes}\n\n${stamp}` : stamp;
    changes.push({ id: p.id, client: clientName[p.client_id], publication: p.publication, patch, previous: { pitch_sent_date: p.pitch_sent_date, sentiment_tag: p.sentiment_tag, landed_date: p.landed_date } });
  }
}

console.log(`Placements to modify: ${changes.length}\n`);
for (const c of changes) {
  console.log(`  ${c.client} — ${c.publication}`);
  if (c.patch.pitch_sent_date) console.log(`     + pitch_sent_date: ${c.patch.pitch_sent_date}`);
  if (c.patch.sentiment_tag) console.log(`     + sentiment_tag: ${c.patch.sentiment_tag}`);
  if (c.patch.landed_date) console.log(`     ~ landed_date: ${c.previous.landed_date} -> ${c.patch.landed_date} (was a RECORDING_DATE placeholder)`);
}

if (!WRITE) {
  console.log("\nDry run — nothing written. Re-run with --write to apply.");
  process.exit(0);
}

for (const c of changes) {
  await rest(`placements?id=eq.${c.id}`, { method: "PATCH", body: c.patch, prefer: "return=minimal" });
}

fs.writeFileSync(
  MANIFEST_PATH,
  JSON.stringify(
    { invented_at: TODAY, reason: "Demo Day (Sept 23, 2026) — owner directive to fill gaps for demo purposes", changes },
    null,
    2
  )
);

console.log(`\nApplied ${changes.length} changes.`);
console.log(`Manifest written to demo-day-invented-values.json — run scripts/revert-demo-day-gaps.mjs to undo all of it in one pass.`);
