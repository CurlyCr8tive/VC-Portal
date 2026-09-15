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

function phaseRowToApi(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    phaseNumber: row.phase_number,
    name: row.name,
    weeks: row.weeks || "",
    vaam: row.vaam,
    status: row.status,
    goal: row.goal || "",
    deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
    notes: row.notes || "",
    createdAt: row.created_at,
    homework: (row.coaching_homework || []).map(homeworkRowToApi),
  };
}

function homeworkRowToApi(row) {
  return {
    id: row.id,
    phaseId: row.phase_id,
    type: row.type,
    text: row.text,
    dueDate: row.due_date || "",
    status: row.status,
    response: row.response || "",
    createdAt: row.created_at,
  };
}

function opportunityRowToApi(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    description: row.description || "",
    scores: row.scores || {},
    decisionStatus: row.decision_status,
    writeUp: row.write_up || "",
    createdAt: row.created_at,
  };
}

function resourceRowToApi(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    kind: row.kind,
    title: row.title,
    content: row.content || "",
    priority: row.priority,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

app.get(
  "/api/me",
  clientRoute(async (req, res) => {
    const { data: client, error } = await supabase
      .from("clients")
      .select("id, name, status, engagement_type, contact_email, industry, engagement_start_date, notes, keyword_config")
      .eq("id", req.profile.client_id)
      .single();
    if (error) throw error;
    if (!client) return res.status(404).json({ error: "not_found", message: "No client row is attached to this profile." });

    res.json({
      profile: {
        id: req.profile.id,
        role: req.profile.role,
        name: req.profile.name,
        email: req.profile.email,
        client_id: req.profile.client_id,
      },
      client,
    });
  })
);

app.get(
  "/api/coaching",
  clientRoute(async (req, res) => {
    const [{ data: phases, error: phaseError }, { data: opportunities, error: opportunityError }, { data: resources, error: resourceError }] =
      await Promise.all([
        supabase
          .from("coaching_phases")
          .select("*, coaching_homework(*)")
          .eq("client_id", req.profile.client_id)
          .order("phase_number"),
        supabase
          .from("opportunities")
          .select("*")
          .eq("client_id", req.profile.client_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("coaching_resources")
          .select("*")
          .eq("client_id", req.profile.client_id)
          .order("created_at", { ascending: false }),
      ]);
    if (phaseError) throw phaseError;
    if (opportunityError) throw opportunityError;
    if (resourceError) throw resourceError;

    res.json({
      phases: (phases || []).map((phase) => ({
        ...phaseRowToApi(phase),
        homework: [...(phase.coaching_homework || [])].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map(homeworkRowToApi),
      })),
      opportunities: (opportunities || []).map(opportunityRowToApi),
      resources: (resources || []).map(resourceRowToApi),
    });
  })
);

app.patch(
  "/api/coaching/homework/:homeworkId",
  clientRoute(async (req, res) => {
    const patch = {};
    if (["not_started", "in_progress", "complete"].includes(req.body?.status)) patch.status = req.body.status;
    if (typeof req.body?.response === "string") patch.response = req.body.response.trim();
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "invalid_body", message: "Send a valid homework status or reflection response." });
    }

    const { data: existing, error: existingError } = await supabase
      .from("coaching_homework")
      .select("id, phase_id, coaching_phases!inner(client_id)")
      .eq("id", req.params.homeworkId)
      .single();
    if (existingError || !existing || existing.coaching_phases.client_id !== req.profile.client_id) {
      return res.status(404).json({ error: "not_found", message: "No homework item with that id for this client." });
    }

    const { data, error } = await supabase.from("coaching_homework").update(patch).eq("id", req.params.homeworkId).select().single();
    if (error) throw error;
    res.json(homeworkRowToApi(data));
  })
);

app.post(
  "/api/coaching/opportunities",
  clientRoute(async (req, res) => {
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "invalid_body", message: "Opportunity title is required." });

    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        client_id: req.profile.client_id,
        title,
        description: String(req.body?.description || "").trim() || null,
        scores: {},
        decision_status: "pressure_testing",
        write_up: "Submitted by the client for Tenyse to review before responding.",
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(opportunityRowToApi(data));
  })
);

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

const server = app.listen(PORT, () => {
  const status = isSupabaseConfigured ? "connected to Supabase" : "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — routes will 503";
  console.log(`client-api listening on http://localhost:${PORT} (${status})`);
});

server.on("error", (err) => {
  console.error(`client-api failed to start on port ${PORT}: ${err.message}`);
  process.exitCode = 1;
});
