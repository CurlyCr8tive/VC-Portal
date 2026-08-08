// Owner API — scaffolding only.
//
// Per the Final PRD's "Backend structure": separate API paths per role
// (owner, client, and a future coach path), one Express instance per path.
// This is that owner instance. It is NOT connected to Supabase — no project
// exists yet (must be created under Tenyse's own account/payment method
// first, per the PRD's Account Ownership section). Every route below
// returns 501 Not Implemented on purpose, rather than fake data, so it's
// obvious this is scaffolding and not a working backend.
//
// Real per-client access control does not exist here or anywhere else in
// this repo yet. Row Level Security policies are drafted (commented out) in
// db/schema.sql, to be applied once Supabase exists — that's Week 3
// ("Architecture Up") scope, not this.

import express from "express";

const PORT = process.env.OWNER_API_PORT || 4001;

const app = express();
app.use(express.json());

// Dev-only convenience so the static frontend (served separately on 8420)
// can eventually call this without a proxy. Not a production CORS policy —
// revisit this once real hosting/domains exist.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "owner-api", supabaseConnected: false });
});

function notImplemented(resourceName) {
  return (req, res) => {
    res.status(501).json({
      error: "not_implemented",
      message: `${resourceName} is not wired to a real database yet — no Supabase project exists. See the PRD's Required Access status table.`,
    });
  };
}

// Resource shape matches db/schema.sql's tables — these become real queries
// once Supabase exists, without needing to redesign the routes themselves.
app.get("/api/clients", notImplemented("Clients"));
app.get("/api/campaigns", notImplemented("Campaigns"));
app.get("/api/placements", notImplemented("Placements"));
app.get("/api/review-queue", notImplemented("Review queue"));
app.get("/api/errors", notImplemented("Errors log"));

app.listen(PORT, () => {
  console.log(`owner-api scaffold listening on http://localhost:${PORT} (no database connected)`);
});
