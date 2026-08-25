// Client API — real Supabase-backed routes, gated by requireClient().
//
// Separate Express instance from owner-api on purpose (per the PRD's
// "Backend structure" decision) — stronger isolation between what a client
// session can reach and what an owner session can reach.
//
// Every route below verifies a Supabase Auth JWT, requires
// profiles.role = 'pr_client', and filters every query by that profile's
// own client_id — a client can never pass a different client_id and get
// another client's data, whether or not RLS (db/schema.sql) also catches
// it. Until a real Supabase project's URL/service-role key are set as env
// vars, every route responds 503.

// Must load before lib/supabaseClient.js — that module reads process.env at
// import time (module-level consts), so .env has to be in process.env first.
import "dotenv/config";
import express from "express";
import { supabase, isSupabaseConfigured, requireClient } from "./lib/supabaseClient.js";
import { sendNoteNotification } from "./lib/gmailNotify.js";

// process.env.PORT first — same reasoning as owner-api/index.js: Render
// assigns the port dynamically via PORT, CLIENT_API_PORT/4002 are the
// local-dev fallback only.
const PORT = process.env.PORT || process.env.CLIENT_API_PORT || 4002;

const app = express();
app.use(express.json());

// Dev-only convenience, not a production CORS policy. See owner-api/index.js's
// matching comment — Allow-Headers/Methods and the OPTIONS short-circuit are
// required for any browser call that sends a Content-Type header, not optional.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "client-api", supabaseConnected: isSupabaseConfigured });
});

/** Wraps a route handler so `requireClient` failures short-circuit before the handler body runs. */
function clientRoute(handler) {
  return async (req, res) => {
    if (!(await requireClient(req, res))) return;
    try {
      await handler(req, res);
    } catch (err) {
      res.status(500).json({ error: "internal_error", message: err.message });
    }
  };
}

app.get(
  "/api/campaigns",
  clientRoute(async (req, res) => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*, campaign_milestones(*)")
      .eq("client_id", req.profile.client_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  "/api/placements",
  clientRoute(async (req, res) => {
    // Reads through placements_for_client (db/schema.sql), not the base
    // table — that view nulls out `notes` itself when notes_shareable is
    // false, since RLS only scopes by ROW (which client), not by column.
    const { data, error } = await supabase
      .from("placements_for_client")
      .select("*")
      .eq("client_id", req.profile.client_id)
      .order("publication_date", { ascending: false });
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  "/api/campaigns/:campaignId/notes",
  clientRoute(async (req, res) => {
    // Confirm the campaign actually belongs to this client before returning
    // notes for it — without this, a client could read another client's
    // notes just by guessing/enumerating campaign ids.
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, client_id")
      .eq("id", req.params.campaignId)
      .single();
    if (campaignError || !campaign || campaign.client_id !== req.profile.client_id) {
      return res.status(404).json({ error: "not_found", message: "No campaign with that id for this client." });
    }
    const { data, error } = await supabase
      .from("campaign_notes")
      .select("*")
      .eq("campaign_id", req.params.campaignId)
      .order("created_at");
    if (error) throw error;
    res.json(data);
  })
);

app.post(
  "/api/campaigns/:campaignId/notes",
  clientRoute(async (req, res) => {
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "invalid_body", message: "Note body can't be empty." });

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, client_id, name")
      .eq("id", req.params.campaignId)
      .single();
    if (campaignError || !campaign || campaign.client_id !== req.profile.client_id) {
      return res.status(404).json({ error: "not_found", message: "No campaign with that id for this client." });
    }

    const { data: note, error: insertError } = await supabase
      .from("campaign_notes")
      .insert({ campaign_id: req.params.campaignId, author_id: req.profile.id, author_role: "pr_client", body })
      .select()
      .single();
    if (insertError) throw insertError;

    const { data: client } = await supabase.from("clients").select("name").eq("id", req.profile.client_id).single();

    // Fire-and-forget: a mailer outage should never fail the note itself,
    // which has already saved successfully above.
    sendNoteNotification({
      clientName: client?.name || "Unknown client",
      campaignName: campaign.name,
      authorName: req.profile.name,
      body,
    });

    res.status(201).json(note);
  })
);

app.listen(PORT, () => {
  const status = isSupabaseConfigured ? "connected to Supabase" : "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — routes will 503";
  console.log(`client-api listening on http://localhost:${PORT} (${status})`);
});
