// scripts/provision-test-accounts.mjs
//
// Provisions the PR platform accounts needed for real handoff testing:
//   1. Tenyse owner/admin account.
//   2. Jessica tester/admin account, when her email is provided.
//   3. One internal pr_client test account tied to a real clients row.
//   4. A named real/pilot invite target that should be sent through the
//      live owner portal invite route, so the actual email/password flow is
//      tested rather than bypassed.
//
// Dry-run is the default. Use --write only after confirming the emails.
//
// Example:
//   node scripts/provision-test-accounts.mjs \
//     --jessica-email jessica@example.com \
//     --internal-client-name "Greyz Bistro" \
//     --internal-client-email internal-client-test@example.com \
//     --pilot-client-name "Greyz Bistro" \
//     --pilot-client-email client@example.com
//
//   node scripts/provision-test-accounts.mjs ... --write

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
    if (match && match[2].trim() && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function genPassword() {
  return `Verified${crypto.randomBytes(4).toString("hex")}!26`;
}

function encodeFilterValue(value) {
  return encodeURIComponent(String(value).replaceAll("*", ""));
}

readEnvFile(path.join(root, "server/owner-api/.env"));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:8420";

const plan = {
  tenyse: {
    email: argValue("--tenyse-email", "tenyse@verifiedconsulting.com").trim().toLowerCase(),
    name: argValue("--tenyse-name", "Tenyse Williams").trim(),
    password: argValue("--tenyse-password", genPassword()),
  },
  jessica: {
    email: argValue("--jessica-email", "").trim().toLowerCase(),
    name: argValue("--jessica-name", "Jessica").trim(),
    password: argValue("--jessica-password", genPassword()),
  },
  internalClient: {
    clientName: argValue("--internal-client-name", "Greyz Bistro").trim(),
    email: argValue("--internal-client-email", "internal-client-test@verifiedconsulting-demo.test").trim().toLowerCase(),
    password: argValue("--internal-client-password", genPassword()),
  },
  pilotInvite: {
    clientName: argValue("--pilot-client-name", "").trim(),
    email: argValue("--pilot-client-email", "").trim().toLowerCase(),
  },
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/owner-api/.env.");
  process.exit(1);
}

async function authAdmin(pathSuffix, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin${pathSuffix}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${pathSuffix} failed (${res.status}): ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  return parsed;
}

async function rest(pathSuffix, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathSuffix}`, {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${pathSuffix} failed (${res.status}): ${JSON.stringify(parsed).slice(0, 300)}`);
  }
  return parsed;
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = await authAdmin(`/users?page=${page}&per_page=1000`);
    const chunk = result.users || [];
    users.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return users;
}

async function findAuthUserByEmail(email) {
  const users = await listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function ensureAuthUser({ email, password, name, role, clientId = null, clientName = "" }) {
  const existing = await findAuthUserByEmail(email);
  const userMetadata = {
    ...(existing?.user_metadata || {}),
    name,
    role,
    ...(clientId ? { client_id: clientId, client_name: clientName || name } : {}),
    email_verified: true,
  };

  if (!WRITE) {
    return { id: existing?.id || "(created on --write)", existed: Boolean(existing) };
  }

  if (existing) {
    await authAdmin(`/users/${existing.id}`, {
      method: "PUT",
      body: { password, email_confirm: true, user_metadata: userMetadata },
    });
    return { id: existing.id, existed: true };
  }

  const created = await authAdmin("/users", {
    method: "POST",
    body: { email, password, email_confirm: true, user_metadata: userMetadata },
  });
  return { id: created.id, existed: false };
}

async function upsertProfile({ id, role, name, email, clientId = null }) {
  if (!WRITE) return;
  await rest("profiles", {
    method: "POST",
    body: { id, role, name, email, client_id: clientId },
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

async function findClientByName(name) {
  const exact = await rest(`clients?name=eq.${encodeFilterValue(name)}&select=id,name,contact_email`);
  if (exact.length === 1) return exact[0];
  const fuzzy = await rest(`clients?name=ilike.${encodeFilterValue(`*${name}*`)}&select=id,name,contact_email`);
  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    throw new Error(`Multiple clients match "${name}": ${fuzzy.map((client) => client.name).join(", ")}. Use an exact --internal-client-name/--pilot-client-name.`);
  }
  return null;
}

async function profileForEmail(email) {
  const rows = await rest(`profiles?email=eq.${encodeFilterValue(email)}&select=id,role,name,email,client_id`);
  return rows[0] || null;
}

async function provisionOwner(label, account) {
  if (!isEmail(account.email)) {
    throw new Error(`${label} email is invalid or missing: ${account.email || "(blank)"}`);
  }
  const user = await ensureAuthUser({
    email: account.email,
    password: account.password,
    name: account.name,
    role: "owner",
  });
  await upsertProfile({ id: user.id, role: "owner", name: account.name, email: account.email, clientId: null });
  return { label, ...account, role: "owner", clientId: null, existed: user.existed };
}

async function provisionInternalClient() {
  const client = await findClientByName(plan.internalClient.clientName);
  if (!client) {
    throw new Error(`No clients row found for "${plan.internalClient.clientName}". Add that client first or pass --internal-client-name with an existing client.`);
  }
  if (!isEmail(plan.internalClient.email)) {
    throw new Error(`Internal client email is invalid: ${plan.internalClient.email || "(blank)"}`);
  }

  const user = await ensureAuthUser({
    email: plan.internalClient.email,
    password: plan.internalClient.password,
    name: client.name,
    role: "pr_client",
    clientId: client.id,
    clientName: client.name,
  });
  await upsertProfile({ id: user.id, role: "pr_client", name: client.name, email: plan.internalClient.email, clientId: client.id });
  return {
    label: "Internal test client",
    email: plan.internalClient.email,
    password: plan.internalClient.password,
    role: "pr_client",
    clientName: client.name,
    clientId: client.id,
    existed: user.existed,
  };
}

async function buildPilotInviteInstruction() {
  if (!plan.pilotInvite.clientName && !plan.pilotInvite.email) return null;
  if (!plan.pilotInvite.clientName || !isEmail(plan.pilotInvite.email)) {
    throw new Error("Pilot invite requires both --pilot-client-name and a valid --pilot-client-email.");
  }
  const client = await findClientByName(plan.pilotInvite.clientName);
  if (!client) {
    throw new Error(`No clients row found for pilot invite client "${plan.pilotInvite.clientName}".`);
  }
  return {
    label: "Pilot client invite flow",
    clientName: client.name,
    clientId: client.id,
    email: plan.pilotInvite.email,
    redirectTo: `${APP_BASE_URL.replace(/\/$/, "")}/set-up-account.html`,
    ownerAction: `Log in as owner, open Clients, choose ${client.name}, click Invite Client, and send to ${plan.pilotInvite.email}.`,
    apiRoute: `POST /api/clients/${client.id}/invite`,
  };
}

const created = [];
created.push(await provisionOwner("Tenyse owner/admin", plan.tenyse));

if (plan.jessica.email) {
  created.push(await provisionOwner("Jessica tester/admin", plan.jessica));
} else {
  created.push({
    label: "Jessica tester/admin",
    skipped: true,
    reason: "No --jessica-email provided.",
  });
}

created.push(await provisionInternalClient());
const pilotInvite = await buildPilotInviteInstruction();

const verifiedProfiles = [];
if (WRITE) {
  for (const account of created.filter((item) => item.email)) {
    verifiedProfiles.push(await profileForEmail(account.email));
  }
}

console.log(`Supabase: ${new URL(SUPABASE_URL).host}`);
console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}\n`);

console.log("Account provisioning plan:\n");
for (const account of created) {
  if (account.skipped) {
    console.log(`- ${account.label}: SKIPPED (${account.reason})`);
    continue;
  }
  console.log(`- ${account.label}`);
  console.log(`  email: ${account.email}`);
  console.log(`  role: ${account.role}`);
  if (account.clientName) console.log(`  client: ${account.clientName} (${account.clientId})`);
  console.log(`  auth user: ${account.existed ? "existing user will be updated" : "new user will be created"}`);
  console.log(`  password: ${account.password}`);
}

if (pilotInvite) {
  console.log("\nPilot invite flow to run from the live owner portal:\n");
  console.log(`- client: ${pilotInvite.clientName} (${pilotInvite.clientId})`);
  console.log(`- email: ${pilotInvite.email}`);
  console.log(`- setup redirect: ${pilotInvite.redirectTo}`);
  console.log(`- action: ${pilotInvite.ownerAction}`);
  console.log(`- owner API route: ${pilotInvite.apiRoute}`);
} else {
  console.log("\nPilot invite flow: SKIPPED (pass --pilot-client-name and --pilot-client-email when ready).");
}

if (verifiedProfiles.length) {
  console.log("\nVerified profile rows after write:\n");
  for (const profile of verifiedProfiles) {
    console.log(`- ${profile.email}: role=${profile.role}, client_id=${profile.client_id || "(none)"}`);
  }
}

if (!WRITE) {
  console.log("\nDry run only — no Supabase Auth users or profiles were changed. Re-run with --write to apply.");
}
