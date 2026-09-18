// scripts/backfill-audience-reach.mjs
//
// Fills audience_reach on placements whose AVE was already derived from an
// outlet traffic figure, but which never got that same figure written to
// audience_reach itself — apply-outlet-rates-to-placements.mjs wrote
// ave_value and ave_auto_calculated but not the reach number it was
// derived from, so a client reading the placement saw a dollar figure with
// no audience number behind it.
//
// Only touches rows where audience_reach is null. Never overwrites a real
// reach figure Tenyse's source material supplied. The value written is
// exactly the audience figure already used for that outlet's AVE — no new
// number is introduced, this just makes the one already in use visible.
//
// Usage: node scripts/backfill-audience-reach.mjs [--write]

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

const { OUTLET_TRAFFIC_REFERENCE } = await import(`file://${path.join(root, "src/outletTrafficReference.js")}`);
const trafficFor = new Map(OUTLET_TRAFFIC_REFERENCE.map((o) => [o.outlet.trim().toLowerCase(), o.value]));

const clients = await rest("clients?select=id,name");
const clientName = Object.fromEntries(clients.map((c) => [c.id, c.name]));
const placements = await rest("placements?select=id,client_id,publication,audience_reach,ave_data_quality");

const targets = [];
for (const p of placements) {
  if (p.audience_reach != null) continue;
  const value = trafficFor.get(p.publication.trim().toLowerCase());
  if (value == null) continue;
  targets.push({ id: p.id, client: clientName[p.client_id], publication: p.publication, value, hadFlag: Boolean(p.ave_data_quality) });
}

console.log(`Placements with no audience_reach but a known traffic figure: ${targets.length}\n`);
for (const t of targets) console.log(`   + ${t.value.toLocaleString().padStart(10)}  ${t.client} — ${t.publication}${t.hadFlag ? "  [AVE already flagged as estimate]" : ""}`);

if (!WRITE) { console.log("\nDry run — nothing written. Re-run with --write to apply."); process.exit(0); }
for (const t of targets) {
  await rest(`placements?id=eq.${t.id}`, { method: "PATCH", body: { audience_reach: t.value }, prefer: "return=minimal" });
}
console.log(`\nBackfilled ${targets.length} audience_reach values.`);
