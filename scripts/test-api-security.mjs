import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

// These tests stub Auth/DB responses; they never contact a live account.
process.env.SUPABASE_URL = "https://security-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
const owner = await import("../server/owner-api/lib/supabaseClient.js");
const client = await import("../server/client-api/lib/supabaseClient.js");

for (const [label, api, gate, role] of [
  ["owner", owner, owner.requireOwner, "owner"],
  ["client", client, client.requireClient, "pr_client"],
]) {
  test(`${label} gate verifies JWT and database profile, not request metadata`, async () => {
    let profile;
    let validToken = true;
    api.supabase.auth.getUser = async () => validToken
      ? { data: { user: { id: "authenticated-user" } } }
      : { error: new Error("expired"), data: {} };
    api.supabase.from = (table) => {
      assert.equal(table, "profiles");
      return { select: () => ({ eq: (column, id) => {
        assert.equal(column, "id");
        assert.equal(id, "authenticated-user");
        return { single: async () => ({ data: profile }) };
      } }) };
    };
    async function check(headers, expected, expectedStatus) {
      const req = { headers, body: { role: "owner", client_id: "other-client" } };
      const res = { status(code) { this.code = code; return this; }, json() {} };
      assert.equal(await gate(req, res), expected);
      assert.equal(res.code, expectedStatus);
      if (expected) assert.equal(req.profile, profile);
    }
    await check({}, false, 401);
    validToken = false;
    await check({ authorization: "Bearer expired" }, false, 401);
    validToken = true;
    profile = { role: role === "owner" ? "pr_client" : "owner", client_id: "client-a" };
    await check({ authorization: "Bearer valid" }, false, 403);
    profile = null;
    await check({ authorization: "Bearer valid" }, false, 403);
    profile = { role, client_id: label === "client" ? "client-a" : null };
    await check({ authorization: "Bearer valid" }, true, undefined);
    if (label === "client") {
      profile = { role, client_id: null };
      await check({ authorization: "Bearer valid" }, false, 403);
    }
  });
}

test("signup SQL never derives authorization from user-editable metadata", () => {
  for (const path of ["db/schema.sql", "db/migrations/2026-08-31-auth-profile-trigger.sql", "db/migrations/2026-11-09-trusted-profile-provisioning.sql"]) {
    const sql = readFileSync(path, "utf8");
    assert.doesNotMatch(sql, /raw_user_meta_data\s*->>\s*'(role|client_id)'/);
    assert.match(sql, /raw_app_meta_data\s*->>\s*'role'/);
  }
});

test("Render build rejects missing or local URLs before creating an artifact", () => {
  for (const value of ["", "http://localhost:8420", "https://127.0.0.1", "https://portal.example.com/path"]) {
    const result = spawnSync(process.execPath, ["scripts/build-frontend.mjs"], {
      env: { ...process.env, RENDER: "true", PUBLIC_SUPABASE_URL: value }, encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /PUBLIC_SUPABASE_URL must be an explicit deployed HTTPS origin/);
  }
});

test("owner API refuses demo authentication in production", () => {
  const result = spawnSync(process.execPath, ["index.js"], {
    cwd: "server/owner-api",
    env: { ...process.env, DOTENV_CONFIG_PATH: "/dev/null", NODE_ENV: "production", ALLOW_LOCAL_DEMO_AUTH: "true" },
    encoding: "utf8", timeout: 5000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to start owner-api with ALLOW_LOCAL_DEMO_AUTH=true in production/);
});

for (const [api, port, protectedPath] of [["owner-api", 14101, "/api/clients"], ["client-api", 14102, "/api/me"]]) {
  test(`${api} HTTP health, CORS, JSON parser and unauthenticated access`, async (t) => {
    const child = spawn(process.execPath, ["index.js"], {
      cwd: `server/${api}`,
      env: { ...process.env, DOTENV_CONFIG_PATH: "/dev/null", PORT: String(port), NODE_ENV: "production", ALLOW_LOCAL_DEMO_AUTH: "false", APP_BASE_URL: "https://portal.example.test", CORS_ALLOWED_ORIGINS: "https://portal.example.test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) {
        const closed = once(child, "exit");
        child.kill();
        await closed;
      }
    });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("API startup timed out")), 5000);
      child.stdout.on("data", (data) => {
        if (String(data).includes("listening")) { clearTimeout(timeout); resolve(); }
      });
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", () => { clearTimeout(timeout); reject(new Error("API exited before startup")); });
    });
    const base = `http://127.0.0.1:${port}`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).service, api);
    const anonymous = await fetch(`${base}${protectedPath}`);
    assert.equal(anonymous.status, 401);
    const blocked = await fetch(`${base}/health`, { headers: { Origin: "https://untrusted.example" } });
    assert.equal(blocked.status, 403);
    const preflight = await fetch(`${base}${protectedPath}`, { method: "OPTIONS", headers: { Origin: "https://portal.example.test" } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://portal.example.test");
    const malformed = await fetch(`${base}${protectedPath}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
}
