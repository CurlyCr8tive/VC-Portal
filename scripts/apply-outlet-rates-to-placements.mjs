// scripts/apply-outlet-rates-to-placements.mjs
//
// Fills in AVE on placements that have none, using the saved rate for that
// outlet — the same lookup the Calculate button performs, applied in bulk
// to rows that pre-date the rate table existing.
//
// Why this instead of placeholder numbers: a dashboard full of $0 looks
// broken, and the instinct is to drop in something that looks plausible.
// But these figures are client-facing — Tenyse's clients log into this
// database and read them as what her work was worth. Every value written
// here traces back to a published industry formula over a sourced audience
// figure (src/aveEstimation.js over src/outletTrafficReference.js), so the
// number on screen can always be explained. An invented one can't.
//
// Only touches rows where ave_value is null or 0. A figure Tenyse entered
// herself is never overwritten.
//
// Sets ave_auto_calculated = true, which is what that column is for per
// db/schema.sql ("true if Agent 2 set this, false if Tenyse entered it
// manually"). That distinction is what lets the UI — and Tenyse — tell a
// derived estimate from a number she stands behind.
//
// Usage (run in a TERMINAL from the repo root, not the Supabase SQL editor):
//   node scripts/apply-outlet-rates-to-placements.mjs           # dry run
//   node scripts/apply-outlet-rates-to-placements.mjs --write   # apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

for (const line of fs.readFileSync(path.join(root, "server/owner-api/.env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Supabase env missing from server/owner-api/.env"); process.exit(1); }

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
const rates = await rest("outlet_rates?select=outlet_name,rate_estimate,multiplier");
// Case-insensitive, matching outletRatesStorage.getRate()'s own behaviour —
// "pix11" and "PIX11" have to resolve to the same saved rate.
const rateFor = new Map(rates.map((r) => [r.outlet_name.trim().toLowerCase(), Number(r.rate_estimate) * (Number(r.multiplier) || 1)]));

// Which outlets' rates rest on an estimated audience figure rather than a
// sourced one. Any placement taking one of those rates gets an
// ave_data_quality flag, so an estimate can never be mistaken for one of
// Tenyse's confirmed numbers and a single query finds them all again when
// real figures arrive.
const { OUTLET_TRAFFIC_REFERENCE } = await import(`file://${path.join(root, "src/outletTrafficReference.js")}`);
const estimatedOutlets = new Map(
  OUTLET_TRAFFIC_REFERENCE.filter((o) => o.confidence === "estimated" || o.metric === "monthly_visits").map((o) => [
    o.outlet.trim().toLowerCase(),
    o,
  ])
);

const placements = await rest("placements?select=id,client_id,publication,ave_value,ave_auto_calculated,ave_data_quality");
const targets = [];
const noRate = [];
for (const p of placements) {
  if (p.ave_value != null && Number(p.ave_value) !== 0) continue;
  const rate = rateFor.get(p.publication.trim().toLowerCase());
  if (rate == null) { noRate.push(p); continue; }
  const ref = estimatedOutlets.get(p.publication.trim().toLowerCase());
  const flag = !ref
    ? null
    : ref.confidence === "estimated"
      ? `Estimated figure, not a sourced one. ${ref.source} Replace once a real number is available.`
      : `Derived from total visits rather than unique visitors, which the AVE formulas actually call for — so this overstates. Source: ${ref.source}`;
  targets.push({ id: p.id, client: clientName[p.client_id], publication: p.publication, value: rate, flag, existingFlag: p.ave_data_quality });
}

console.log(`Supabase: ${new globalThis.URL(URL_).host}\n`);
console.log(`Placements missing an AVE: ${targets.length + noRate.length}`);
console.log(`  fillable from a saved rate: ${targets.length}`);
console.log(`  no rate on file yet:        ${noRate.length}\n`);
for (const t of targets) console.log(`   + $${t.value.toLocaleString(undefined, { maximumFractionDigits: 0 }).padStart(9)}  ${t.client} — ${t.publication}${t.flag ? "  [flagged as estimate]" : ""}`);
if (noRate.length) {
  console.log("\nStill $0 — these outlets need an audience figure before anything can be derived:");
  for (const p of noRate) console.log(`     ${clientName[p.client_id]} — ${p.publication}`);
}
console.log(`\nTotal being added: $${targets.reduce((s, t) => s + t.value, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

if (!WRITE) { console.log("\nDry run — nothing written. Re-run with --write to apply."); process.exit(0); }
for (const t of targets) {
  await rest(`placements?id=eq.${t.id}`, {
    method: "PATCH",
    body: {
      ave_value: Number(t.value.toFixed(2)),
      ave_auto_calculated: true,
      // Never clobber an existing flag — the duplicate-figure warnings must
      // survive this pass.
      ...(t.flag && !t.existingFlag ? { ave_data_quality: t.flag } : {}),
    },
    prefer: "return=minimal",
  });
}
console.log(`\nApplied ${targets.length} rates.`);
