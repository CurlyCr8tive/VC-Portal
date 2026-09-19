// scripts/set-owner-password.mjs
//
// Reset one owner Auth user's password via Supabase Admin API and ensure the
// matching profiles row has owner access. This bypasses email reset links for
// local/demo-day administration without printing service-role credentials.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

readEnvFile(path.join(root, "server/owner-api/.env"));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = argValue("--email").trim().toLowerCase();
const password = argValue("--password");
const name = argValue("--name").trim() || "Tenyse Williams";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/owner-api/.env.");
  process.exit(1);
}

if (!email || !password) {
  console.error('Usage: npm run auth:set-owner-password -- --email "owner@example.com" --password "NewPassword!" --name "Owner Name"');
  process.exit(1);
}

async function admin(pathSuffix, { method = "GET", body } = {}) {
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

const users = await admin("/users?page=1&per_page=1000");
const user = users.users?.find((candidate) => candidate.email?.toLowerCase() === email);

if (!user) {
  console.error(`No Supabase Auth user found for ${email}.`);
  process.exit(1);
}

await admin(`/users/${user.id}`, {
  method: "PUT",
  body: {
    password,
    email_confirm: true,
    user_metadata: { ...(user.user_metadata || {}), name, email_verified: true },
  },
});

await rest("profiles", {
  method: "POST",
  body: { id: user.id, role: "owner", name, email, client_id: null },
  prefer: "resolution=merge-duplicates,return=minimal",
});

console.log(`Password reset and owner profile verified for ${email}.`);
