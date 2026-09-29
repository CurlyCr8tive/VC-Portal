import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

function add(status, label, detail = "") {
  checks.push({ status, label, detail });
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function configValue(source, name, fallback = "") {
  const objectMatch = source.match(new RegExp(`${name}\\s*:\\s*["']([^"']*)["']`));
  if (objectMatch?.[1]) return objectMatch[1];
  const windowMatch = source.match(new RegExp(`window\\.${name}\\s*=\\s*["']([^"']*)["']`));
  return windowMatch?.[1] || fallback;
}

function env(name) {
  return String(process.env[name] || "").trim();
}

async function fetchJson(label, url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(Number(process.env.LOCAL_FLOW_TIMEOUT_MS || 5000)),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      add("fail", label, `${url} responded ${res.status}: ${body.message || body.error || "no JSON error message"}`);
      return null;
    }
    add("pass", label, `${url} responded ok`);
    return body;
  } catch (err) {
    add("fail", label, `${url} not reachable (${err.message}). Start the local stack first with: npm run start:local`);
    return null;
  }
}

async function fetchHead(label, url) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    add(res.ok ? "pass" : "fail", label, `${url} responded ${res.status}`);
  } catch (err) {
    add("fail", label, `${url} not reachable (${err.message}). Start the local stack first with: npm run start:local`);
  }
}

async function signIn({ label, supabaseUrl, anonKey, email, password }) {
  if (!email || !password) {
    add("warn", `${label} login`, `Skipped. Set ${label.toUpperCase()}_TEST_EMAIL and ${label.toUpperCase()}_TEST_PASSWORD to test real login.`);
    return null;
  }
  const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    add("fail", `${label} login`, `Supabase rejected ${email}: ${body.error_description || body.msg || body.error || res.status}`);
    return null;
  }
  add("pass", `${label} login`, `${email} signed in with real Supabase Auth.`);
  return body.access_token;
}

function authHeaders(token) {
  return {
    Origin: "http://localhost:8420",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const runtimeConfig = readIfExists(join(root, "config.js"));
const supabaseConfig = readIfExists(join(root, "src/supabaseConfig.js"));
const supabaseUrl = configValue(runtimeConfig, "SUPABASE_URL") || configValue(supabaseConfig, "SUPABASE_URL");
const anonKey = configValue(runtimeConfig, "SUPABASE_ANON_KEY") || configValue(supabaseConfig, "SUPABASE_ANON_KEY");
const ownerApiBase = configValue(runtimeConfig, "OWNER_API_BASE_URL", "http://localhost:4001").replace(/\/$/, "");
const clientApiBase = configValue(runtimeConfig, "CLIENT_API_BASE_URL", "http://localhost:4002").replace(/\/$/, "");
const appBase = configValue(runtimeConfig, "APP_BASE_URL", "http://localhost:8420").replace(/\/$/, "");

add(supabaseUrl ? "pass" : "fail", "Supabase URL", supabaseUrl || "Missing.");
add(anonKey ? "pass" : "fail", "Supabase anon key", anonKey ? "Configured." : "Missing.");

await fetchHead("Static login page", `${appBase}/login.html`);
const ownerHealth = await fetchJson("Owner API health", `${ownerApiBase}/health`);
if (ownerHealth) {
  add(ownerHealth.supabaseConnected ? "pass" : "fail", "Owner API Supabase", JSON.stringify(ownerHealth));
  add(ownerHealth.localDemoAuthEnabled ? "fail" : "pass", "Owner demo auth disabled", `localDemoAuthEnabled=${ownerHealth.localDemoAuthEnabled}`);
}
const clientHealth = await fetchJson("Client API health", `${clientApiBase}/health`);
if (clientHealth) {
  add(clientHealth.supabaseConnected ? "pass" : "fail", "Client API Supabase", JSON.stringify(clientHealth));
  add(clientHealth.gmailNotificationsConfigured ? "pass" : "warn", "Gmail notifications", `gmailNotificationsConfigured=${clientHealth.gmailNotificationsConfigured}`);
}

const ownerToken = await signIn({
  label: "owner",
  supabaseUrl,
  anonKey,
  email: env("OWNER_TEST_EMAIL"),
  password: env("OWNER_TEST_PASSWORD"),
});

let ownerClients = [];
if (ownerToken) {
  ownerClients = await fetchJson("Owner clients route", `${ownerApiBase}/api/clients`, { headers: authHeaders(ownerToken) }) || [];
  await fetchJson("Owner review queue route", `${ownerApiBase}/api/review-queue`, { headers: authHeaders(ownerToken) });
  await fetchJson("Owner agent status route", `${ownerApiBase}/api/agent-status`, { headers: authHeaders(ownerToken) });
}

const clientToken = await signIn({
  label: "client",
  supabaseUrl,
  anonKey,
  email: env("CLIENT_TEST_EMAIL"),
  password: env("CLIENT_TEST_PASSWORD"),
});

if (clientToken) {
  await fetchJson("Client profile route", `${clientApiBase}/api/me`, { headers: authHeaders(clientToken) });
  await fetchJson("Client campaigns route", `${clientApiBase}/api/campaigns`, { headers: authHeaders(clientToken) });
  await fetchJson("Client placements route", `${clientApiBase}/api/placements`, { headers: authHeaders(clientToken) });
  await fetchJson("Client coaching route", `${clientApiBase}/api/coaching`, { headers: authHeaders(clientToken) });
  await fetchJson("Client messages route", `${clientApiBase}/api/messages`, { headers: authHeaders(clientToken) });
}

if (env("SEND_PILOT_INVITE") === "true") {
  if (!ownerToken) {
    add("fail", "Pilot invite", "Skipped because owner login was not tested. Set owner test credentials.");
  } else if (!env("PILOT_CLIENT_EMAIL") || !env("PILOT_CLIENT_NAME")) {
    add("fail", "Pilot invite", "Set PILOT_CLIENT_NAME and PILOT_CLIENT_EMAIL before SEND_PILOT_INVITE=true.");
  } else {
    const client = ownerClients.find((item) => String(item.name || "").toLowerCase() === env("PILOT_CLIENT_NAME").toLowerCase());
    if (!client) {
      add("fail", "Pilot invite", `No client named ${env("PILOT_CLIENT_NAME")} was found.`);
    } else {
      const result = await fetchJson("Pilot invite", `${ownerApiBase}/api/clients/${encodeURIComponent(client.id)}/invite`, {
        method: "POST",
        headers: authHeaders(ownerToken),
        body: JSON.stringify({ email: env("PILOT_CLIENT_EMAIL") }),
      });
      if (result?.ok) add("pass", "Pilot invite email", `Invite sent to ${result.invitedEmail}.`);
    }
  }
} else {
  add("warn", "Pilot invite", "Not sent. Set SEND_PILOT_INVITE=true with PILOT_CLIENT_NAME and PILOT_CLIENT_EMAIL when ready.");
}

const icons = { pass: "PASS", warn: "WARN", fail: "FAIL" };
for (const check of checks) {
  console.log(`[${icons[check.status]}] ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

const failed = checks.filter((check) => check.status === "fail");
const warned = checks.filter((check) => check.status === "warn");
console.log(`\nLocal user flow check complete: ${failed.length} failed, ${warned.length} warnings, ${checks.length} total checks.`);

if (failed.some((check) => check.detail.includes("Start the local stack first"))) {
  console.log("\nLocal stack help:");
  console.log("  1. Open a new terminal in this repo.");
  console.log("  2. Run: npm run start:local");
  console.log("  3. Leave that terminal open.");
  console.log("  4. In another terminal, rerun: npm run handoff:check-real && npm run test:local-user-flow");
}

if (failed.length) process.exitCode = 1;
