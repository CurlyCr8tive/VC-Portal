// scripts/provision-test-accounts.mjs
//
// Provisions the accounts needed for real end-to-end testing/demo:
//   1. Sets Tenyse's real owner password directly (admin API), bypassing
//      the broken email-reset flow — Cherice can hand it to her.
//   2. Converts Cherice's existing account (currently a leftover
//      pr_client test-client row) into an owner-role "admin tester"
//      login, so she can see exactly what Tenyse sees without needing
//      Tenyse's own credentials.
//   3. Creates two NEW client-role test accounts, tied to two real
//      clients with the most real case-study data on file, so the
//      client-side PR dashboard and Coaching Program can be checked from
//      their view.
//
// Does NOT delete anything. The two clearly-disposable smoke/test owner
// accounts found in the audit are named in this script's output for
// Cherice to remove herself in the Supabase dashboard — deleting a real
// Auth record is irreversible, and that step stays a deliberate, manual
// action rather than something this script does unattended.
//
// Usage: node scripts/provision-test-accounts.mjs [--write]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

for (const line of fs.readFileSync(path.join(root, "server/owner-api/.env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && m[2].trim()) process.env[m[1]] = m[2].trim();
}
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const authAdmin = async (pathSuffix, { method = "GET", body } = {}) => {
  const res = await fetch(`${URL_}/auth/v1/admin${pathSuffix}`, {
    method,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${pathSuffix} -> ${res.status}: ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed;
};
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

// Readable-but-real demo passwords, not left for anyone to guess at
// random — each is unique per account.
const genPassword = () => "Verified" + crypto.randomBytes(4).toString("hex") + "!26";

const results = [];

// --- 1. Tenyse's real password ---------------------------------------
const TENYSE_ID = "9b6ce01c-c0ae-4466-8115-1c0851e38fd6";
const tenysePassword = genPassword();
results.push({ label: "Tenyse Williams (real owner)", email: "tenyse@verifiedconsulting.com", password: tenysePassword, action: () => authAdmin(`/users/${TENYSE_ID}`, { method: "PUT", body: { password: tenysePassword } }) });

// --- 2. Cherice's account: convert to owner ----------------------------
const CHERICE_ID = "973783e5-b01f-4fdc-aea6-ed17adbca057";
const chericePassword = genPassword();
results.push({
  label: "Cherice Heron (admin tester — owner role)",
  email: "cherice.heron@pursuit.org",
  password: chericePassword,
  action: async () => {
    await authAdmin(`/users/${CHERICE_ID}`, { method: "PUT", body: { password: chericePassword } });
    await rest(`profiles?id=eq.${CHERICE_ID}`, { method: "PATCH", body: { role: "owner", name: "Cherice Heron (Admin Tester)", client_id: null }, prefer: "return=minimal" });
  },
});

// --- 3. Two client test accounts ----------------------------------------
const CLIENT_ACCOUNTS = [
  { businessName: "Greyz Bistro", email: "greyzbistro@verifiedconsulting-demo.test" },
  { businessName: "Houston Housing Authority", email: "houstonhousingauthority@verifiedconsulting-demo.test" },
];

async function findClientId(name) {
  const rows = await rest(`clients?name=eq.${encodeURIComponent(name)}&select=id`);
  return rows[0]?.id || null;
}

for (const c of CLIENT_ACCOUNTS) {
  const password = genPassword();
  results.push({
    label: `${c.businessName} (client test login)`,
    email: c.email,
    password,
    action: async () => {
      const clientId = await findClientId(c.businessName);
      if (!clientId) throw new Error(`No clients row found for "${c.businessName}" — can't link this login.`);
      const created = await authAdmin("/users", {
        method: "POST",
        body: { email: c.email, password, email_confirm: true, user_metadata: { name: c.businessName } },
      });
      await rest("profiles", {
        method: "POST",
        body: { id: created.id, role: "pr_client", name: c.businessName, email: c.email, client_id: clientId },
        prefer: "return=minimal",
      });
    },
  });
}

console.log(`Supabase: ${new URL(URL_).host}\n`);
console.log("Accounts to provision:\n");
for (const r of results) console.log(`  ${r.label}\n    email: ${r.email}\n    password: ${r.password}\n`);

console.log("NOT touched by this script — remove yourself in the Supabase dashboard (Authentication → Users) if you want them gone:");
console.log("  vc-temp-owner-1788193670371@example.com  (Temporary Owner Test)");
console.log("  owner-api-smoke-1789129260788@verified-consulting.test  (automated smoke-test account)");
console.log("  vc-live-owner-test@verified-consulting.test  (live-feature verification test account)");

if (!WRITE) {
  console.log("\nDry run — nothing written. Re-run with --write to apply.");
  process.exit(0);
}

for (const r of results) {
  await r.action();
  console.log(`Applied: ${r.label}`);
}
console.log("\nDone. Save the emails/passwords above somewhere safe — they won't be printed again.");
