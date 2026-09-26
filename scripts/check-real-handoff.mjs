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

function extractWindowValue(source, name) {
  const match = source.match(new RegExp(`window\\.${name}\\s*=\\s*["']([^"']*)["']`));
  return match?.[1] || "";
}

function envValue(source, key) {
  const line = source
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value && !value.startsWith("#") && value.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
}

async function readHealth(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      add("warn", `${label} health`, `${url} responded ${res.status}`);
      return null;
    }
    add("pass", `${label} health`, `${url} responded ok`);
    return body;
  } catch (err) {
    add("warn", `${label} health`, `${url} not reachable from this machine (${err.message})`);
    return null;
  }
}

const supabaseConfig = readIfExists(join(root, "src/supabaseConfig.js"));
const ownerEnv = readIfExists(join(root, "server/owner-api/.env"));
const clientEnv = readIfExists(join(root, "server/client-api/.env"));

const publicSupabaseUrl = extractWindowValue(supabaseConfig, "SUPABASE_URL");
const publicAnonKey = extractWindowValue(supabaseConfig, "SUPABASE_ANON_KEY");
const ownerApiBase = extractWindowValue(supabaseConfig, "OWNER_API_BASE_URL");
const clientApiBase = extractWindowValue(supabaseConfig, "CLIENT_API_BASE_URL");

add(publicSupabaseUrl ? "pass" : "fail", "Frontend Supabase URL", publicSupabaseUrl ? `Configured: ${publicSupabaseUrl}` : "window.SUPABASE_URL is blank.");
add(publicAnonKey ? "pass" : "fail", "Frontend anon key", publicAnonKey ? "Configured. Confirm this is the anon/public key, never service_role." : "window.SUPABASE_ANON_KEY is blank.");
add(ownerApiBase && !ownerApiBase.includes("localhost") ? "pass" : "warn", "Owner API frontend URL", ownerApiBase || "Missing. Localhost is okay only for local testing.");
add(clientApiBase && !clientApiBase.includes("localhost") ? "pass" : "warn", "Client API frontend URL", clientApiBase || "Missing. Localhost is okay only for local testing.");

const ownerNodeEnv = envValue(ownerEnv, "NODE_ENV");
const ownerDemoAuth = envValue(ownerEnv, "ALLOW_LOCAL_DEMO_AUTH");
const ownerCors = envValue(ownerEnv, "CORS_ALLOWED_ORIGINS");
const ownerServiceKey = envValue(ownerEnv, "SUPABASE_SERVICE_ROLE_KEY");
const ownerAppBase = envValue(ownerEnv, "APP_BASE_URL");

add(ownerEnv ? "pass" : "warn", "Owner API .env", ownerEnv ? "Found server/owner-api/.env." : "Missing server/owner-api/.env; live owner routes will not be configured locally.");
add(ownerServiceKey ? "pass" : "fail", "Owner API service-role key", ownerServiceKey ? "Present in backend .env. Never put this in frontend files." : "Missing SUPABASE_SERVICE_ROLE_KEY.");
add(ownerNodeEnv === "production" ? "pass" : "warn", "Owner API NODE_ENV", ownerNodeEnv || "Not set. Use production for deployed handoff.");
add(ownerDemoAuth === "false" || ownerDemoAuth === "" ? "pass" : "fail", "Owner demo auth disabled", `ALLOW_LOCAL_DEMO_AUTH=${ownerDemoAuth || "(unset)"}`);
add(ownerCors && !ownerCors.includes("*") ? "pass" : "warn", "Owner CORS allowlist", ownerCors || "Missing. Set to final frontend origin before production.");
add(ownerAppBase && !ownerAppBase.includes("localhost") ? "pass" : "warn", "Invite redirect base URL", ownerAppBase || "Missing. Invites will fallback to localhost if APP_BASE_URL is unset.");

const clientNodeEnv = envValue(clientEnv, "NODE_ENV");
const clientCors = envValue(clientEnv, "CORS_ALLOWED_ORIGINS");
const clientServiceKey = envValue(clientEnv, "SUPABASE_SERVICE_ROLE_KEY");
const notifyTo = envValue(clientEnv, "GOOGLE_NOTIFY_TO") || envValue(clientEnv, "GMAIL_NOTIFY_TO");
const gmailClient = envValue(clientEnv, "GOOGLE_CLIENT_ID") || envValue(clientEnv, "GMAIL_CLIENT_ID");
const gmailSecret = envValue(clientEnv, "GOOGLE_CLIENT_SECRET") || envValue(clientEnv, "GMAIL_CLIENT_SECRET");
const gmailRefresh = envValue(clientEnv, "GOOGLE_REFRESH_TOKEN") || envValue(clientEnv, "GMAIL_REFRESH_TOKEN");

add(clientEnv ? "pass" : "warn", "Client API .env", clientEnv ? "Found server/client-api/.env." : "Missing server/client-api/.env; live client routes will not be configured locally.");
add(clientServiceKey ? "pass" : "fail", "Client API service-role key", clientServiceKey ? "Present in backend .env. Never put this in frontend files." : "Missing SUPABASE_SERVICE_ROLE_KEY.");
add(clientNodeEnv === "production" ? "pass" : "warn", "Client API NODE_ENV", clientNodeEnv || "Not set. Use production for deployed handoff.");
add(clientCors && !clientCors.includes("*") ? "pass" : "warn", "Client CORS allowlist", clientCors || "Missing. Set to final frontend origin before production.");
add(gmailClient && gmailSecret && gmailRefresh && notifyTo ? "pass" : "warn", "Real email notifications", gmailClient && gmailSecret && gmailRefresh && notifyTo ? `Configured to notify ${notifyTo}.` : "Google/Gmail OAuth notification env vars are incomplete.");

if (ownerApiBase) {
  const ownerHealth = await readHealth("Owner API", `${ownerApiBase.replace(/\/$/, "")}/health`);
  if (ownerHealth) {
    add(ownerHealth.supabaseConnected ? "pass" : "fail", "Owner API Supabase connected", JSON.stringify(ownerHealth));
    add(ownerHealth.localDemoAuthEnabled ? "fail" : "pass", "Owner API demo auth runtime", `localDemoAuthEnabled=${ownerHealth.localDemoAuthEnabled}`);
  }
}

if (clientApiBase) {
  const clientHealth = await readHealth("Client API", `${clientApiBase.replace(/\/$/, "")}/health`);
  if (clientHealth) {
    add(clientHealth.supabaseConnected ? "pass" : "fail", "Client API Supabase connected", JSON.stringify(clientHealth));
    add(clientHealth.gmailNotificationsConfigured ? "pass" : "warn", "Client API Gmail runtime", `gmailNotificationsConfigured=${clientHealth.gmailNotificationsConfigured}`);
  }
}

const icons = { pass: "PASS", warn: "WARN", fail: "FAIL" };
for (const check of checks) {
  console.log(`[${icons[check.status]}] ${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
}

const failed = checks.filter((check) => check.status === "fail");
const warned = checks.filter((check) => check.status === "warn");
console.log(`\nReal handoff check complete: ${failed.length} failed, ${warned.length} warnings, ${checks.length} total checks.`);

if (failed.length) {
  process.exitCode = 1;
}
