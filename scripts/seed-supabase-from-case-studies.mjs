// scripts/seed-supabase-from-case-studies.mjs
//
// Pushes the real case-study data into Supabase so the live database holds
// what the browser has been holding on its own.
//
// The gap this closes: seedRealCaseStudyData.js writes 15 placements into
// localStorage on first load, so the dashboard looks complete on the
// machine that seeded it — while the live `placements` table had only 4
// rows. Deploy without this and Tenyse signs in to a near-empty portal,
// because the data everyone has been looking at never left one browser.
//
// Also seeds `outlet_rates`, which was empty, so the AVE calculator's
// primary lookup path has something real to hit. Every rate written here
// is derived from a published industry formula over a sourced audience
// figure (see src/aveEstimation.js and src/outletTrafficReference.js) —
// nothing is invented, and the provenance travels with the row.
//
// Idempotent: matches existing rows on (client, publication, headline) for
// placements and on outlet name for rates, same keys a human would use to
// say "that one's already there". Safe to re-run after every new batch of
// case-study material.
//
// Usage (from repo root):
//   node scripts/seed-supabase-from-case-studies.mjs          # dry run
//   node scripts/seed-supabase-from-case-studies.mjs --write  # actually write

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

// --- env -------------------------------------------------------------------
for (const line of fs.readFileSync(path.join(root, "server/owner-api/.env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from server/owner-api/.env");
  process.exit(1);
}

const rest = async (pathname, { method = "GET", body, prefer } = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed;
};

// --- source data -----------------------------------------------------------
// Imported rather than duplicated: seedRealCaseStudyData.js stays the one
// place real case-study rows are defined, so this never drifts from what
// the browser seeds.
const seedSrc = fs.readFileSync(path.join(root, "src/owner/seedRealCaseStudyData.js"), "utf8");
const shimPath = path.join(root, "scripts", ".seed-shim.mjs");
fs.writeFileSync(
  shimPath,
  seedSrc
    .replace(/^import .*$/gm, "")
    .replace(/export function seedRealCaseStudyData[\s\S]*$/m, "")
    .replace(/export function backfillAveDataQuality[\s\S]*?\n}\n/m, "") +
    "\nexport { REAL_CASE_STUDY_PLACEMENTS };\n"
);
const { REAL_CASE_STUDY_PLACEMENTS } = await import(`file://${shimPath}`);
fs.unlinkSync(shimPath);

const { OUTLET_TRAFFIC_REFERENCE } = await import(`file://${path.join(root, "src/outletTrafficReference.js")}`);
const { estimateAVE } = await import(`file://${path.join(root, "src/aveEstimation.js")}`);

// --- placements ------------------------------------------------------------
const clients = await rest("clients?select=id,name");
const clientByName = new Map(clients.map((c) => [c.name, c.id]));
// ave_data_quality ships as a migration (db/migrations/2026-09-17-*.sql) that
// has to be run in Supabase by hand — PostgREST can't do DDL. Until it is,
// selecting the column 400s and takes the whole script down. Detecting that
// and carrying on lets the dry run still show the full plan while someone
// runs the migration, instead of a stack trace that hides the other 14 rows.
let hasDataQualityColumn = true;
let existing;
try {
  existing = await rest("placements?select=id,client_id,publication,headline,ave_value,audience_reach,ave_data_quality,notes");
} catch (err) {
  if (!String(err.message).includes("ave_data_quality does not exist")) throw err;
  hasDataQualityColumn = false;
  console.warn("WARNING  placements.ave_data_quality is missing — run db/migrations/2026-09-17-placement-ave-data-quality.sql");
  console.warn("         in the Supabase SQL editor. Continuing without it; the duplicate-figure flags will NOT be written.\n");
  existing = await rest("placements?select=id,client_id,publication,headline,ave_value,audience_reach,notes");
}

// Exact string matching is not enough here. Some case-study rows were
// already entered by hand with SHORTENED text — the live VeganHood row
// reads "...Patch, PIX11, NBC" where the seed says "...Patch, PIX11, NBC
// (2 not individually named in source)", and its Blavity headline stops
// less than halfway through. Keyed exactly, those look like new rows and
// we would insert a second near-identical copy of each. Treating one
// string as matching when either side is a prefix of the other catches
// truncation in both directions.
const norm = (s) => String(s || "").trim().toLowerCase();
const looseEq = (a, b) => {
  const [x, y] = [norm(a), norm(b)];
  return Boolean(x && y) && (x === y || x.startsWith(y) || y.startsWith(x));
};
const findExisting = (clientId, row) =>
  existing.find((p) => p.client_id === clientId && looseEq(p.publication, row.publication) && looseEq(p.headline, row.headline));

const toInsert = [];
const toUpdate = [];
const skipped = [];
for (const row of REAL_CASE_STUDY_PLACEMENTS) {
  const clientId = clientByName.get(row.client);
  if (!clientId) { skipped.push(`${row.client} — no matching client row`); continue; }

  const match = findExisting(clientId, row);
  if (match) {
    // Fill only what's missing. A hand-entered row may have been edited
    // deliberately, so this never overwrites a value that's already there —
    // it backfills nulls and, critically, attaches the data-quality flag,
    // which is the whole reason the live copy of the duplicate figure was
    // showing as confirmed.
    const patch = {};
    if (hasDataQualityColumn && !match.ave_data_quality && row.aveDataQuality) patch.ave_data_quality = row.aveDataQuality;
    if (match.ave_value == null && row.aveValue) patch.ave_value = Number(row.aveValue);
    if (match.audience_reach == null && row.audienceReach) patch.audience_reach = Number(row.audienceReach);
    if (!match.notes && row.notes) patch.notes = row.notes;
    if (Object.keys(patch).length) toUpdate.push({ id: match.id, publication: match.publication, patch });
    continue;
  }
  const num = (v) => (v !== "" && v != null && Number.isFinite(Number(v)) ? Number(v) : null);
  toInsert.push({
    client_id: clientId,
    publication: row.publication,
    headline: row.headline,
    article_url: row.articleUrl || null,
    publication_date: row.publicationDate || null,
    ave_value: num(row.aveValue),
    audience_reach: num(row.audienceReach),
    pitch_sent_date: row.pitchSentDate || null,
    landed_date: row.landedDate || null,
    sentiment_tag: ["positive", "neutral", "negative"].includes(row.sentiment) ? row.sentiment : null,
    notes: row.notes || null,
    ...(hasDataQualityColumn ? { ave_data_quality: row.aveDataQuality || null } : {}),
    // 'manual' not a new 'case_study_seed' value: the table constrains
    // source to ('manual','discovery_agent'), and these rows ARE
    // human-curated — a person read them off Tenyse's decks. No agent
    // found them. Per-row provenance already lives in `notes`, so nothing
    // is lost by not inventing a third source value.
    source: "manual",
  });
}

// --- outlet rates ----------------------------------------------------------
const existingRates = await rest("outlet_rates?select=outlet_name");
const haveRate = new Set(existingRates.map((r) => r.outlet_name.toLowerCase()));
const rateRows = [];
for (const o of OUTLET_TRAFFIC_REFERENCE) {
  // Skip figures built on the wrong metric — aveEstimation flags these as
  // overstating, and a rate table is exactly where an overstated number
  // would quietly become "the" number.
  const est = estimateAVE(o.value, o.metric);
  if (!est || est.overstated) continue;
  if (haveRate.has(o.outlet.toLowerCase())) continue;
  rateRows.push({ outlet_name: o.outlet, rate_estimate: Number(est.muckRack.toFixed(2)), multiplier: 1 });
}

// --- report / write --------------------------------------------------------
console.log(`Supabase: ${new URL(SUPABASE_URL).host}`);
console.log(`\nPlacements: ${existing.length} live, ${toInsert.length} to add, ${toUpdate.length} to backfill, ${REAL_CASE_STUDY_PLACEMENTS.length} in source`);
for (const p of toInsert) console.log(`   + ${p.publication.slice(0, 58)}${p.ave_data_quality ? "  [flagged]" : ""}`);
for (const u of toUpdate) console.log(`   ~ ${u.publication.slice(0, 48)} <- ${Object.keys(u.patch).join(", ")}`);
for (const s of skipped) console.log(`   ! skipped: ${s}`);
console.log(`\nOutlet rates: ${existingRates.length} live, ${rateRows.length} to add`);
for (const r of rateRows) console.log(`   + ${r.outlet_name}: $${r.rate_estimate.toLocaleString()}`);

if (!WRITE) {
  console.log("\nDry run — nothing written. Re-run with --write to apply.");
  process.exit(0);
}
if (toInsert.length) await rest("placements", { method: "POST", body: toInsert, prefer: "return=minimal" });
for (const u of toUpdate) {
  await rest(`placements?id=eq.${u.id}`, { method: "PATCH", body: u.patch, prefer: "return=minimal" });
}
if (rateRows.length) await rest("outlet_rates", { method: "POST", body: rateRows, prefer: "return=minimal" });
console.log(`\nWrote ${toInsert.length} placements, backfilled ${toUpdate.length}, added ${rateRows.length} outlet rates.`);
