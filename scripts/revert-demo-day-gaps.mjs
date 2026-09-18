// scripts/revert-demo-day-gaps.mjs
//
// Undoes everything scripts/invent-demo-day-gaps.mjs wrote, reading
// demo-day-invented-values.json for the exact previous values.
//
// Restores pitch_sent_date and sentiment_tag to what they were before
// (null, in every case that script touched), and strips the
// "[INVENTED FOR DEMO — ...]" tag back out of notes rather than leaving
// it appended once the values it describes are gone.
//
// Usage: node scripts/revert-demo-day-gaps.mjs [--write]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");
const MANIFEST_PATH = path.join(root, "demo-day-invented-values.json");

if (!fs.existsSync(MANIFEST_PATH)) {
  console.log("No demo-day-invented-values.json found — nothing to revert.");
  process.exit(0);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

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

console.log(`Reverting ${manifest.changes.length} placements invented on ${manifest.invented_at}\n`);

for (const c of manifest.changes) {
  console.log(`  ${c.client} — ${c.publication}`);
}

if (!WRITE) {
  console.log("\nDry run — nothing written. Re-run with --write to apply.");
  process.exit(0);
}

for (const c of manifest.changes) {
  const current = (await rest(`placements?id=eq.${c.id}&select=notes`))[0];
  const stampPattern = /\n*\[INVENTED FOR DEMO[^\]]*\][^\n]*\n?/g;
  const restoredNotes = (current?.notes || "").replace(stampPattern, "").trim();
  await rest(`placements?id=eq.${c.id}`, {
    method: "PATCH",
    body: { ...c.previous, notes: restoredNotes || null },
    prefer: "return=minimal",
  });
}

fs.unlinkSync(MANIFEST_PATH);
console.log(`\nReverted ${manifest.changes.length} placements. demo-day-invented-values.json removed.`);
