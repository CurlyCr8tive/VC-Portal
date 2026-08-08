// Client API — scaffolding only.
//
// Separate Express instance from owner-api on purpose (per the PRD's
// "Backend structure" decision) — stronger isolation between what a client
// session can reach and what an owner session can reach, even before real
// auth/RLS exists. Every route is scoped in comment-intent to "the
// requesting client's own data only," but there is no actual session
// verification here yet — that's what Supabase Auth + Row Level Security
// (drafted in db/schema.sql, not yet applied) are for.
//
// All routes return 501 on purpose — no Supabase project exists yet.

import express from "express";

const PORT = process.env.CLIENT_API_PORT || 4002;

const app = express();
app.use(express.json());

// Dev-only convenience, not a production CORS policy.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "client-api", supabaseConnected: false });
});

function notImplemented(resourceName) {
  return (req, res) => {
    res.status(501).json({
      error: "not_implemented",
      message: `${resourceName} is not wired to a real database yet — no Supabase project exists. See the PRD's Required Access status table.`,
    });
  };
}

// Scoped to "my own client" once real auth exists — every one of these
// should eventually filter by the authenticated session's client_id at the
// query level (RLS), not just in application code.
app.get("/api/campaigns", notImplemented("My campaigns"));
app.get("/api/placements", notImplemented("My placements"));
app.get("/api/campaigns/:campaignId/notes", notImplemented("Campaign notes"));

app.listen(PORT, () => {
  console.log(`client-api scaffold listening on http://localhost:${PORT} (no database connected)`);
});
