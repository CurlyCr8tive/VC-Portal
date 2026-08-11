// Owner API — real Supabase-backed routes, gated by requireOwner().
//
// Per the Final PRD's "Backend structure": separate API paths per role
// (owner, client, and a future coach path), one Express instance per path.
// This is that owner instance.
//
// "Real" here means: every route below verifies a Supabase Auth JWT and
// requires profiles.role = 'owner' before touching data (lib/supabaseClient.js
// requireOwner()), and the actual row-level enforcement is backed a second,
// independent time by the RLS policies in db/schema.sql. Until a real
// Supabase project exists (must be created under Tenyse's own
// account/payment method, per the PRD's Account Ownership section) and its
// URL/service-role key are set as env vars, every route below responds
// 503 — that's an honest "not configured yet," not fake data.

import express from "express";
import { supabase, isSupabaseConfigured, requireOwner } from "./lib/supabaseClient.js";

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
  res.json({ status: "ok", service: "owner-api", supabaseConnected: isSupabaseConfigured });
});

/** Wraps a route handler so `requireOwner` failures short-circuit before the handler body runs. */
function ownerRoute(handler) {
  return async (req, res) => {
    if (!(await requireOwner(req, res))) return;
    try {
      await handler(req, res);
    } catch (err) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  };
}

// Owner sees everything — no client_id filter needed, unlike client-api.
app.get(
  "/api/clients",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("clients").select("*").order("name");
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  "/api/campaigns",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("campaigns").select("*, campaign_milestones(*)").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  "/api/placements",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("placements").select("*").order("publication_date", { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  "/api/review-queue",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("review_queue").select("*").eq("status", "pending").order("discovered_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  "/api/errors",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("errors").select("*").order("occurred_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

app.listen(PORT, () => {
  const status = isSupabaseConfigured ? "connected to Supabase" : "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — routes will 503";
  console.log(`owner-api listening on http://localhost:${PORT} (${status})`);
});
