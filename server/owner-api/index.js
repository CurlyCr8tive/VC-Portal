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

// Must load before lib/supabaseClient.js — that module reads process.env at
// import time (module-level consts), so .env has to be in process.env first.
import "dotenv/config";
import express from "express";
import { supabase, isSupabaseConfigured, requireOwner } from "./lib/supabaseClient.js";
import { searchNews, isNewsSearchConfigured } from "./lib/newsSearch.js";
import { searchWebForMentions, isWebSearchDiscoveryConfigured } from "./lib/webSearchDiscovery.js";
import { listSearchUsage } from "./lib/searchUsageLog.js";
import { buildSearchQuery, scoreArticleMatch } from "./lib/discoveryScoring.js";
import { researchOutletRate } from "./lib/perplexityResearch.js";
import { generateText } from "./lib/aiClient.js";
import { buildExecutiveSummaryPrompt } from "./lib/prompts/executiveSummaryPrompt.js";
import { buildCampaignActivitySummaryPrompt } from "./lib/prompts/campaignActivitySummaryPrompt.js";
import { buildReportNarrativePrompt } from "./lib/prompts/reportNarrativePrompt.js";
import { buildSentimentAnalysisPrompt } from "./lib/prompts/sentimentAnalysisPrompt.js";
import { buildLanguageSuggestionsPrompt } from "./lib/prompts/languageSuggestionsPrompt.js";
import { createCalendarEvent, isGoogleWorkspaceConfigured, searchGmailForPitchDate } from "./lib/googleWorkspace.js";

// process.env.PORT first — Render (and most PaaS hosts) assign the port
// dynamically and expect the app to bind to whatever they inject via PORT,
// not a fixed one. OWNER_API_PORT/4001 stay as the local-dev fallback.
const PORT = process.env.PORT || process.env.OWNER_API_PORT || 4001;

const app = express();
app.use(express.json());

// Dev-only convenience so the static frontend (served separately on 8420)
// can eventually call this without a proxy. Not a production CORS policy —
// revisit this once real hosting/domains exist.
//
// Access-Control-Allow-Headers/Methods and the explicit OPTIONS short-
// circuit are not decoration — every real call this app makes sends a
// Content-Type header (fetch's JSON.stringify body, or authedJsonHeaders()
// even on a plain GET), which makes the browser send a CORS preflight
// OPTIONS request first. Without an Allow-Headers response naming
// Content-Type/Authorization, the browser silently blocks the real
// request after the preflight — found live via Playwright while
// verifying the Discovery Agent frontend: every owner-api call failed
// with a CORS console error, invisible to curl-based testing since CORS
// is a browser-enforced restriction, not a server one.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "owner-api", supabaseConnected: isSupabaseConfigured });
});

app.get(
  "/api/google/status",
  ownerRoute(async (req, res) => {
    res.json({
      configured: isGoogleWorkspaceConfigured,
      gmailSearch: isGoogleWorkspaceConfigured,
      calendarEvents: isGoogleWorkspaceConfigured,
      requiredEnv: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"],
      requiredScopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    });
  })
);

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

const CLIENT_STATUSES = new Set(["active", "past", "unconfirmed"]);
const ENGAGEMENT_TYPES = new Set(["pr", "coaching", "pr_and_coaching"]);

function normalizeClientPayload(body) {
  const name = String(body?.name || "").trim();
  if (!name) {
    return { error: "Client name is required." };
  }

  const status = CLIENT_STATUSES.has(body?.status) ? body.status : "unconfirmed";
  const engagementType = ENGAGEMENT_TYPES.has(body?.engagementType || body?.engagement_type)
    ? body.engagementType || body.engagement_type
    : "pr";
  const existingKeywordConfig = body?.keywordConfig || body?.keyword_config || {};
  const aliasesRaw = body?.discoveryAliases != null
    ? body.discoveryAliases
    : Array.isArray(existingKeywordConfig.aliases)
      ? existingKeywordConfig.aliases.join("\n")
      : "";
  const aliases = String(aliasesRaw)
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
  const keywordConfig = {
    clientName: String(body?.discoveryClientName || existingKeywordConfig.clientName || name).trim(),
    ...(String(body?.discoveryCompanyName || existingKeywordConfig.companyName || "").trim()
      ? { companyName: String(body?.discoveryCompanyName || existingKeywordConfig.companyName).trim() }
      : {}),
    ...(aliases.length ? { aliases } : {}),
  };

  return {
    data: {
      name,
      keyword_config: keywordConfig,
      status,
      engagement_type: engagementType,
      contact_email: String(body?.contactEmail || body?.contact_email || "").trim() || null,
      industry: String(body?.industry || "").trim() || null,
      engagement_start_date: body?.engagementStartDate || body?.engagement_start_date || null,
      notes: String(body?.notes || "").trim() || null,
    },
  };
}

function clientRowToApi(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    engagementType: row.engagement_type,
    contactEmail: row.contact_email || "",
    industry: row.industry || "",
    engagementStartDate: row.engagement_start_date || "",
    notes: row.notes || "",
    keywordConfig: row.keyword_config || {},
    createdAt: row.created_at,
  };
}

function campaignRowToApi(row, clientName) {
  return {
    id: row.id,
    name: row.name,
    client: clientName || row.client_name || "",
    startDate: row.start_date || "",
    duration: row.duration || "",
    budget: row.budget == null ? null : Number(row.budget),
    status: row.status,
    createdAt: row.created_at,
    milestones: (row.campaign_milestones || []).map((m) => ({
      id: m.id,
      text: m.text,
      done: Boolean(m.done),
      createdAt: m.created_at,
    })),
  };
}

function placementRowToApi(row, { clientName = "", campaignName = null } = {}) {
  return {
    id: row.id,
    createdAt: row.created_at,
    publication: row.publication,
    headline: row.headline,
    articleUrl: row.article_url || "",
    publicationDate: row.publication_date || "",
    client: clientName,
    aveValue: row.ave_value == null ? null : Number(row.ave_value),
    pitchSentDate: row.pitch_sent_date || "",
    landedDate: row.landed_date || "",
    notes: row.notes || "",
    campaign: campaignName || null,
    sentiment: row.sentiment_tag || null,
    audienceReach: row.audience_reach == null ? null : Number(row.audience_reach),
  };
}

function phaseRowToApi(row, clientName = "") {
  return {
    id: row.id,
    clientId: row.client_id,
    client: clientName || row.client_name || "",
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

function opportunityRowToApi(row, clientName = "") {
  return {
    id: row.id,
    clientId: row.client_id,
    client: clientName || row.client_name || "",
    title: row.title,
    description: row.description || "",
    scores: row.scores || {},
    decisionStatus: row.decision_status,
    writeUp: row.write_up || "",
    createdAt: row.created_at,
  };
}

function resourceRowToApi(row, clientName = "") {
  return {
    id: row.id,
    clientId: row.client_id,
    client: clientName || row.client_name || "",
    kind: row.kind,
    title: row.title,
    content: row.content || "",
    priority: row.priority,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

async function findClientByName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return { error: "Client is required." };
  const { data, error } = await supabase.from("clients").select("id, name").ilike("name", trimmed).limit(2);
  if (error) throw error;
  const exact = (data || []).find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (!exact) return { error: `No Supabase client row found for "${trimmed}". Add the client first.` };
  return { client: exact };
}

async function findCampaignByName(clientId, name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return { campaign: null };
  const { data, error } = await supabase.from("campaigns").select("id, name").eq("client_id", clientId).ilike("name", trimmed).limit(2);
  if (error) throw error;
  return { campaign: (data || []).find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()) || null };
}

async function normalizeCampaignPayload(body) {
  const name = String(body?.name || "").trim();
  if (!name) return { error: "Campaign name is required." };
  const clientResult = await findClientByName(body?.client);
  if (clientResult.error) return clientResult;

  const status = ["active", "completed", "paused"].includes(body?.status) ? body.status : "active";
  const budgetRaw = body?.budget;
  const budget = budgetRaw !== "" && budgetRaw != null && Number.isFinite(Number(budgetRaw)) ? Number(budgetRaw) : null;

  return {
    client: clientResult.client,
    data: {
      client_id: clientResult.client.id,
      name,
      start_date: body?.startDate || body?.start_date || null,
      duration: String(body?.duration || "").trim() || null,
      budget,
      status,
    },
  };
}

async function normalizePlacementPayload(body) {
  const publication = String(body?.publication || "").trim();
  const headline = String(body?.headline || "").trim();
  if (!publication || !headline) return { error: "Publication and headline are required." };

  const clientResult = await findClientByName(body?.client);
  if (clientResult.error) return clientResult;
  const campaignResult = await findCampaignByName(clientResult.client.id, body?.campaign);
  if (String(body?.campaign || "").trim() && !campaignResult.campaign) {
    return { error: `No Supabase campaign row found for "${String(body.campaign).trim()}". Add the campaign first or leave Campaign blank.` };
  }

  const aveRaw = body?.aveValue ?? body?.ave_value;
  const reachRaw = body?.audienceReach ?? body?.audience_reach;
  const sentiment = ["positive", "neutral", "negative"].includes(body?.sentiment || body?.sentiment_tag)
    ? body.sentiment || body.sentiment_tag
    : null;

  return {
    client: clientResult.client,
    campaign: campaignResult.campaign,
    data: {
      client_id: clientResult.client.id,
      campaign_id: campaignResult.campaign?.id || null,
      publication,
      headline,
      article_url: String(body?.articleUrl || body?.article_url || "").trim() || null,
      publication_date: body?.publicationDate || body?.publication_date || null,
      ave_value: aveRaw !== "" && aveRaw != null && Number.isFinite(Number(aveRaw)) ? Number(aveRaw) : null,
      pitch_sent_date: body?.pitchSentDate || body?.pitch_sent_date || null,
      landed_date: body?.landedDate || body?.landed_date || null,
      sentiment_tag: sentiment,
      audience_reach: reachRaw !== "" && reachRaw != null && Number.isFinite(Number(reachRaw)) ? Number(reachRaw) : null,
      notes: String(body?.notes || "").trim() || null,
      source: "manual",
    },
  };
}

// Owner sees everything — no client_id filter needed, unlike client-api.
app.get(
  "/api/clients",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("clients").select("*").order("name");
    if (error) throw error;
    res.json(data.map(clientRowToApi));
  })
);

app.post(
  "/api/clients",
  ownerRoute(async (req, res) => {
    const normalized = normalizeClientPayload(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: "invalid_body", message: normalized.error });
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({ ...normalized.data, created_by: req.profile.id })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "duplicate_client", message: "A client with that name or email may already exist." });
      }
      throw error;
    }
    res.status(201).json(clientRowToApi(data));
  })
);

app.patch(
  "/api/clients/:clientId",
  ownerRoute(async (req, res) => {
    const normalized = normalizeClientPayload(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: "invalid_body", message: normalized.error });
    }

    const { data, error } = await supabase
      .from("clients")
      .update(normalized.data)
      .eq("id", req.params.clientId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No client with that id." });
    res.json(clientRowToApi(data));
  })
);

app.get(
  "/api/campaigns",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("campaigns").select("*, campaign_milestones(*)").order("created_at", { ascending: false });
    if (error) throw error;
    const clientIds = [...new Set(data.map((c) => c.client_id).filter(Boolean))];
    const { data: clients, error: clientsError } = clientIds.length
      ? await supabase.from("clients").select("id, name").in("id", clientIds)
      : { data: [], error: null };
    if (clientsError) throw clientsError;
    const clientNameById = new Map((clients || []).map((c) => [c.id, c.name]));
    res.json(data.map((row) => campaignRowToApi(row, clientNameById.get(row.client_id))));
  })
);

app.post(
  "/api/campaigns",
  ownerRoute(async (req, res) => {
    const normalized = await normalizeCampaignPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: "invalid_body", message: normalized.error });

    const { data, error } = await supabase.from("campaigns").insert(normalized.data).select("*, campaign_milestones(*)").single();
    if (error) throw error;
    res.status(201).json(campaignRowToApi(data, normalized.client.name));
  })
);

app.patch(
  "/api/campaigns/:campaignId",
  ownerRoute(async (req, res) => {
    const normalized = await normalizeCampaignPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: "invalid_body", message: normalized.error });

    const { data, error } = await supabase
      .from("campaigns")
      .update(normalized.data)
      .eq("id", req.params.campaignId)
      .select("*, campaign_milestones(*)")
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No campaign with that id." });
    res.json(campaignRowToApi(data, normalized.client.name));
  })
);

app.delete(
  "/api/campaigns/:campaignId",
  ownerRoute(async (req, res) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", req.params.campaignId);
    if (error) throw error;
    res.status(204).send();
  })
);

app.post(
  "/api/campaigns/:campaignId/milestones",
  ownerRoute(async (req, res) => {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "invalid_body", message: "Milestone text is required." });
    const { data, error } = await supabase.from("campaign_milestones").insert({ campaign_id: req.params.campaignId, text }).select().single();
    if (error) throw error;
    res.status(201).json({ id: data.id, text: data.text, done: Boolean(data.done), createdAt: data.created_at });
  })
);

app.patch(
  "/api/campaign-milestones/:milestoneId",
  ownerRoute(async (req, res) => {
    const { data: existing, error: existingError } = await supabase
      .from("campaign_milestones")
      .select("done")
      .eq("id", req.params.milestoneId)
      .single();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "not_found", message: "No milestone with that id." });
    const done = typeof req.body?.done === "boolean" ? req.body.done : !existing.done;
    const { data, error } = await supabase.from("campaign_milestones").update({ done }).eq("id", req.params.milestoneId).select().single();
    if (error) throw error;
    res.json({ id: data.id, text: data.text, done: Boolean(data.done), createdAt: data.created_at });
  })
);

app.delete(
  "/api/campaign-milestones/:milestoneId",
  ownerRoute(async (req, res) => {
    const { error } = await supabase.from("campaign_milestones").delete().eq("id", req.params.milestoneId);
    if (error) throw error;
    res.status(204).send();
  })
);

app.get(
  "/api/placements",
  ownerRoute(async (req, res) => {
    const { data, error } = await supabase.from("placements").select("*").order("publication_date", { ascending: false });
    if (error) throw error;
    const clientIds = [...new Set(data.map((p) => p.client_id).filter(Boolean))];
    const campaignIds = [...new Set(data.map((p) => p.campaign_id).filter(Boolean))];
    const [{ data: clients, error: clientsError }, { data: campaigns, error: campaignsError }] = await Promise.all([
      clientIds.length ? supabase.from("clients").select("id, name").in("id", clientIds) : Promise.resolve({ data: [], error: null }),
      campaignIds.length ? supabase.from("campaigns").select("id, name").in("id", campaignIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (clientsError) throw clientsError;
    if (campaignsError) throw campaignsError;
    const clientNameById = new Map((clients || []).map((c) => [c.id, c.name]));
    const campaignNameById = new Map((campaigns || []).map((c) => [c.id, c.name]));
    res.json(data.map((row) => placementRowToApi(row, { clientName: clientNameById.get(row.client_id), campaignName: campaignNameById.get(row.campaign_id) })));
  })
);

app.post(
  "/api/placements",
  ownerRoute(async (req, res) => {
    const normalized = await normalizePlacementPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: "invalid_body", message: normalized.error });

    const { data, error } = await supabase.from("placements").insert({ ...normalized.data, created_by: req.profile.id }).select().single();
    if (error) throw error;
    res.status(201).json(placementRowToApi(data, { clientName: normalized.client.name, campaignName: normalized.campaign?.name }));
  })
);

app.patch(
  "/api/placements/:placementId",
  ownerRoute(async (req, res) => {
    const normalized = await normalizePlacementPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: "invalid_body", message: normalized.error });

    const { data, error } = await supabase
      .from("placements")
      .update(normalized.data)
      .eq("id", req.params.placementId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No placement with that id." });
    res.json(placementRowToApi(data, { clientName: normalized.client.name, campaignName: normalized.campaign?.name }));
  })
);

app.delete(
  "/api/placements/:placementId",
  ownerRoute(async (req, res) => {
    const { error } = await supabase.from("placements").delete().eq("id", req.params.placementId);
    if (error) throw error;
    res.status(204).send();
  })
);

app.get(
  "/api/coaching",
  ownerRoute(async (req, res) => {
    const [{ data: phases, error: phaseError }, { data: opportunities, error: opportunityError }, { data: resources, error: resourceError }] =
      await Promise.all([
        supabase.from("coaching_phases").select("*, coaching_homework(*)").order("phase_number"),
        supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
        supabase.from("coaching_resources").select("*").order("created_at", { ascending: false }),
      ]);
    if (phaseError) throw phaseError;
    if (opportunityError) throw opportunityError;
    if (resourceError) throw resourceError;

    const clientIds = [
      ...new Set([
        ...(phases || []).map((row) => row.client_id),
        ...(opportunities || []).map((row) => row.client_id),
        ...(resources || []).map((row) => row.client_id),
      ].filter(Boolean)),
    ];
    const { data: clients, error: clientsError } = clientIds.length
      ? await supabase.from("clients").select("id, name").in("id", clientIds)
      : { data: [], error: null };
    if (clientsError) throw clientsError;
    const clientNameById = new Map((clients || []).map((client) => [client.id, client.name]));

    res.json({
      phases: (phases || []).map((phase) => ({
        ...phaseRowToApi(phase, clientNameById.get(phase.client_id)),
        homework: [...(phase.coaching_homework || [])].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)).map(homeworkRowToApi),
      })),
      opportunities: (opportunities || []).map((row) => opportunityRowToApi(row, clientNameById.get(row.client_id))),
      resources: (resources || []).map((row) => resourceRowToApi(row, clientNameById.get(row.client_id))),
    });
  })
);

app.post(
  "/api/clients/:clientId/coaching/phases",
  ownerRoute(async (req, res) => {
    const phaseNumber = Number(req.body?.phaseNumber ?? req.body?.phase_number);
    const name = String(req.body?.name || "").trim();
    if (!Number.isFinite(phaseNumber) || !name) {
      return res.status(400).json({ error: "invalid_body", message: "Phase number and name are required." });
    }

    const { data: client, error: clientError } = await supabase.from("clients").select("id, name").eq("id", req.params.clientId).single();
    if (clientError || !client) return res.status(404).json({ error: "not_found", message: "No client with that id." });

    const { data, error } = await supabase
      .from("coaching_phases")
      .insert({
        client_id: client.id,
        phase_number: phaseNumber,
        name,
        weeks: String(req.body?.weeks || "").trim() || null,
        vaam: ["V", "A_AUTHORITY", "A_ALIGNMENT", "M", "NOT_APPLICABLE"].includes(req.body?.vaam) ? req.body.vaam : "V",
        status: ["not_started", "in_progress", "complete"].includes(req.body?.status) ? req.body.status : "not_started",
        goal: String(req.body?.goal || "").trim() || null,
        deliverables: Array.isArray(req.body?.deliverables) ? req.body.deliverables.filter(Boolean) : [],
        notes: String(req.body?.notes || "").trim() || null,
      })
      .select("*, coaching_homework(*)")
      .single();
    if (error) throw error;
    res.status(201).json(phaseRowToApi(data, client.name));
  })
);

app.patch(
  "/api/coaching/phases/:phaseId",
  ownerRoute(async (req, res) => {
    const patch = {
      phase_number: Number(req.body?.phaseNumber ?? req.body?.phase_number),
      name: String(req.body?.name || "").trim(),
      weeks: String(req.body?.weeks || "").trim() || null,
      vaam: ["V", "A_AUTHORITY", "A_ALIGNMENT", "M", "NOT_APPLICABLE"].includes(req.body?.vaam) ? req.body.vaam : "V",
      status: ["not_started", "in_progress", "complete"].includes(req.body?.status) ? req.body.status : "not_started",
      goal: String(req.body?.goal || "").trim() || null,
      deliverables: Array.isArray(req.body?.deliverables) ? req.body.deliverables.filter(Boolean) : [],
      notes: String(req.body?.notes || "").trim() || null,
    };
    if (!Number.isFinite(patch.phase_number) || !patch.name) {
      return res.status(400).json({ error: "invalid_body", message: "Phase number and name are required." });
    }

    const { data, error } = await supabase
      .from("coaching_phases")
      .update(patch)
      .eq("id", req.params.phaseId)
      .select("*, coaching_homework(*)")
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No phase with that id." });
    res.json(phaseRowToApi(data));
  })
);

app.post(
  "/api/coaching/phases/:phaseId/homework",
  ownerRoute(async (req, res) => {
    const type = ["action", "reflection", "standing"].includes(req.body?.type) ? req.body.type : null;
    const text = String(req.body?.text || "").trim();
    if (!type || !text) return res.status(400).json({ error: "invalid_body", message: "Homework type and text are required." });
    const { data, error } = await supabase
      .from("coaching_homework")
      .insert({
        phase_id: req.params.phaseId,
        type,
        text,
        due_date: type === "standing" ? null : req.body?.dueDate || req.body?.due_date || null,
        status: ["not_started", "in_progress", "complete"].includes(req.body?.status) ? req.body.status : "not_started",
        response: String(req.body?.response || "").trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(homeworkRowToApi(data));
  })
);

app.patch(
  "/api/coaching/homework/:homeworkId",
  ownerRoute(async (req, res) => {
    const patch = {};
    if (["not_started", "in_progress", "complete"].includes(req.body?.status)) patch.status = req.body.status;
    if (typeof req.body?.response === "string") patch.response = req.body.response.trim();
    if (!Object.keys(patch).length) return res.status(400).json({ error: "invalid_body", message: "Send a valid homework status or response." });
    const { data, error } = await supabase.from("coaching_homework").update(patch).eq("id", req.params.homeworkId).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No homework item with that id." });
    res.json(homeworkRowToApi(data));
  })
);

app.delete(
  "/api/coaching/homework/:homeworkId",
  ownerRoute(async (req, res) => {
    const { error } = await supabase.from("coaching_homework").delete().eq("id", req.params.homeworkId);
    if (error) throw error;
    res.status(204).send();
  })
);

app.post(
  "/api/clients/:clientId/coaching/opportunities",
  ownerRoute(async (req, res) => {
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "invalid_body", message: "Opportunity title is required." });
    const { data, error } = await supabase
      .from("opportunities")
      .insert({
        client_id: req.params.clientId,
        title,
        description: String(req.body?.description || "").trim() || null,
        scores: req.body?.scores && typeof req.body.scores === "object" ? req.body.scores : {},
        decision_status: ["pursuing", "pressure_testing", "declined"].includes(req.body?.decisionStatus || req.body?.decision_status)
          ? req.body.decisionStatus || req.body.decision_status
          : "pressure_testing",
        write_up: String(req.body?.writeUp || req.body?.write_up || "").trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(opportunityRowToApi(data));
  })
);

app.patch(
  "/api/coaching/opportunities/:opportunityId",
  ownerRoute(async (req, res) => {
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "invalid_body", message: "Opportunity title is required." });
    const { data, error } = await supabase
      .from("opportunities")
      .update({
        title,
        description: String(req.body?.description || "").trim() || null,
        scores: req.body?.scores && typeof req.body.scores === "object" ? req.body.scores : {},
        decision_status: ["pursuing", "pressure_testing", "declined"].includes(req.body?.decisionStatus || req.body?.decision_status)
          ? req.body.decisionStatus || req.body.decision_status
          : "pressure_testing",
        write_up: String(req.body?.writeUp || req.body?.write_up || "").trim() || null,
      })
      .eq("id", req.params.opportunityId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No opportunity with that id." });
    res.json(opportunityRowToApi(data));
  })
);

app.delete(
  "/api/coaching/opportunities/:opportunityId",
  ownerRoute(async (req, res) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", req.params.opportunityId);
    if (error) throw error;
    res.status(204).send();
  })
);

app.post(
  "/api/clients/:clientId/coaching/resources",
  ownerRoute(async (req, res) => {
    const kind = ["resource", "checklist"].includes(req.body?.kind) ? req.body.kind : "resource";
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "invalid_body", message: "Resource title is required." });
    const { data, error } = await supabase
      .from("coaching_resources")
      .insert({
        client_id: req.params.clientId,
        kind,
        title,
        content: String(req.body?.content || "").trim() || null,
        priority: ["high", "medium", "low"].includes(req.body?.priority) ? req.body.priority : "medium",
        completed: kind === "checklist" ? Boolean(req.body?.completed) : null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(resourceRowToApi(data));
  })
);

app.patch(
  "/api/coaching/resources/:resourceId",
  ownerRoute(async (req, res) => {
    const kind = ["resource", "checklist"].includes(req.body?.kind) ? req.body.kind : "resource";
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ error: "invalid_body", message: "Resource title is required." });
    const { data, error } = await supabase
      .from("coaching_resources")
      .update({
        kind,
        title,
        content: String(req.body?.content || "").trim() || null,
        priority: ["high", "medium", "low"].includes(req.body?.priority) ? req.body.priority : "medium",
        completed: kind === "checklist" ? Boolean(req.body?.completed) : null,
      })
      .eq("id", req.params.resourceId)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No resource with that id." });
    res.json(resourceRowToApi(data));
  })
);

app.delete(
  "/api/coaching/resources/:resourceId",
  ownerRoute(async (req, res) => {
    const { error } = await supabase.from("coaching_resources").delete().eq("id", req.params.resourceId);
    if (error) throw error;
    res.status(204).send();
  })
);

app.post(
  "/api/google/gmail/pitch-search",
  ownerRoute(async (req, res) => {
    const result = await searchGmailForPitchDate({
      clientName: req.body?.clientName,
      publication: req.body?.publication,
      headline: req.body?.headline,
    });
    res.status(result.available ? 200 : 503).json(result);
  })
);

app.post(
  "/api/google/calendar/events",
  ownerRoute(async (req, res) => {
    const result = await createCalendarEvent({
      clientName: req.body?.clientName,
      contactEmail: req.body?.contactEmail,
      notes: req.body?.notes,
      startDate: req.body?.startDate,
      startTime: req.body?.startTime,
      durationMinutes: req.body?.durationMinutes,
    });
    res.status(result.available ? 201 : 503).json(result);
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

// Closes the loop on discovery-scan's real inserts — confirm/reject a real
// candidate rather than just being able to see it. `resolved_by` is the
// owner who acted, read from req.profile (attached by requireOwner), not
// trusted from the request body.
app.patch(
  "/api/review-queue/:id",
  ownerRoute(async (req, res) => {
    const status = req.body?.status;
    if (!["confirmed", "rejected"].includes(status)) {
      return res.status(400).json({ error: "invalid_body", message: 'status must be "confirmed" or "rejected".' });
    }
    const { data, error } = await supabase
      .from("review_queue")
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: req.profile.id })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "not_found", message: "No review_queue row with that id." });
    res.status(200).json(data);
  })
);

app.post(
  "/api/review-queue/:id/create-placement",
  ownerRoute(async (req, res) => {
    const { data: item, error: itemError } = await supabase
      .from("review_queue")
      .select("id, client_id, publication, headline, article_url, status")
      .eq("id", req.params.id)
      .single();
    if (itemError || !item) {
      return res.status(404).json({ error: "not_found", message: "No review_queue row with that id." });
    }
    if (item.status !== "pending") {
      return res.status(409).json({ error: "already_resolved", message: "This review item has already been resolved." });
    }

    const { data: client, error: clientError } = await supabase.from("clients").select("id, name").eq("id", item.client_id).single();
    if (clientError || !client) {
      return res.status(404).json({ error: "not_found", message: "No client row is attached to this review item." });
    }

    const campaignResult = await findCampaignByName(client.id, req.body?.campaign);
    if (String(req.body?.campaign || "").trim() && !campaignResult.campaign) {
      return res.status(400).json({
        error: "invalid_body",
        message: `No Supabase campaign row found for "${String(req.body.campaign).trim()}". Add the campaign first or leave Campaign blank.`,
      });
    }

    const publicationDate = req.body?.publicationDate || req.body?.publication_date || null;
    const aveRaw = req.body?.aveValue ?? req.body?.ave_value;
    const reachRaw = req.body?.audienceReach ?? req.body?.audience_reach;
    const sentiment = ["positive", "neutral", "negative"].includes(req.body?.sentiment || req.body?.sentiment_tag)
      ? req.body.sentiment || req.body.sentiment_tag
      : null;

    const { data: placement, error: placementError } = await supabase
      .from("placements")
      .insert({
        client_id: client.id,
        campaign_id: campaignResult.campaign?.id || null,
        publication: String(req.body?.publication || item.publication || "Unknown").trim(),
        headline: String(req.body?.headline || item.headline || "").trim(),
        article_url: String(req.body?.articleUrl || req.body?.article_url || item.article_url || "").trim() || null,
        publication_date: publicationDate,
        ave_value: aveRaw !== "" && aveRaw != null && Number.isFinite(Number(aveRaw)) ? Number(aveRaw) : null,
        pitch_sent_date: req.body?.pitchSentDate || req.body?.pitch_sent_date || null,
        landed_date: req.body?.landedDate || req.body?.landed_date || publicationDate,
        sentiment_tag: sentiment,
        audience_reach: reachRaw !== "" && reachRaw != null && Number.isFinite(Number(reachRaw)) ? Number(reachRaw) : null,
        notes: String(req.body?.notes || "Created from Discovery Agent review queue.").trim(),
        source: "discovery_agent",
        created_by: req.profile.id,
      })
      .select()
      .single();
    if (placementError) throw placementError;

    const { error: queueError } = await supabase
      .from("review_queue")
      .update({ status: "confirmed", resolved_at: new Date().toISOString(), resolved_by: req.profile.id })
      .eq("id", item.id);
    if (queueError) throw queueError;

    res.status(201).json({
      reviewItemId: item.id,
      placement: placementRowToApi(placement, { clientName: client.name, campaignName: campaignResult.campaign?.name }),
    });
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

// Invite-link client onboarding — scaffolded now, activates the moment a
// real Supabase project is configured. ownerRoute()/requireOwner() already
// give the "not configured yet" case an honest 503 (see lib/supabaseClient.js)
// before this handler body ever runs — never a faked success.
//
// `clients` has no email column (see db/schema.sql) — nothing has ever
// collected one, so the owner types the email in at invite time.
// inviteUserByEmail creates the auth.users row and emails the invite link;
// db/migrations/2026-08-31-auth-profile-trigger.sql turns that auth row's
// metadata into the matching public.profiles row (role, client_id) that
// login/routing requires.
app.post(
  "/api/clients/:clientId/invite",
  ownerRoute(async (req, res) => {
    const email = String(req.body?.email || "").trim();
    if (!email) {
      return res.status(400).json({ error: "invalid_body", message: "An email address is required to send an invite." });
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", req.params.clientId)
      .single();
    if (clientError || !client) {
      return res.status(404).json({ error: "not_found", message: "No client with that id." });
    }

    // APP_BASE_URL is the deployed static frontend's origin — local dev
    // fallback matches the static server's actual port (see README/run docs).
    const redirectTo = `${process.env.APP_BASE_URL || "http://localhost:8420"}/set-up-account.html`;

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { client_id: client.id, client_name: client.name, role: "pr_client" },
    });
    if (inviteError) {
      return res.status(502).json({ error: "invite_failed", message: inviteError.message });
    }

    res.status(200).json({ ok: true, invitedEmail: email, clientId: client.id, clientName: client.name });
  })
);

// Discovery Agent — real search, run on demand per client rather than on a
// schedule (Supabase Edge Functions scheduling per the PRD's backend
// architecture is separate future work, not this route's job). Two-layer
// stack: newsSearch.js (Currents API + NewsData.io, structured) always
// runs first; webSearchDiscovery.js (Claude/GPT web search, broader but
// costs real money per call) runs after and only if configured, adding
// whatever the structured layer missed. Both feed the same scoring and the
// same review_queue — one unified queue, not two separate ones.
//
// Blocked on layer 1 specifically until CURRENTS_API_KEY or
// NEWSDATA_API_KEY exists (see lib/newsSearch.js) — this 503s honestly the
// same way an unconfigured Supabase project does, just for a different
// missing credential. Layer 2 is optional on top: if neither
// ANTHROPIC_API_KEY nor OPENAI_API_KEY is set, the scan still runs on
// layer 1 alone rather than blocking the whole route on a second,
// unrelated credential.
app.post(
  "/api/clients/:clientId/discovery-scan",
  ownerRoute(async (req, res) => {
    if (!isNewsSearchConfigured) {
      return res.status(503).json({
        error: "not_configured",
        message: "Neither CURRENTS_API_KEY nor NEWSDATA_API_KEY is set — sign up for one (both are free) and add it to .env first.",
      });
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, keyword_config")
      .eq("id", req.params.clientId)
      .single();
    if (clientError || !client) {
      return res.status(404).json({ error: "not_found", message: "No client with that id." });
    }

    const query = buildSearchQuery(client.keyword_config);
    if (!query) {
      return res.status(400).json({
        error: "no_keyword_config",
        message: `${client.name} has no keyword_config set (client name, company name, or aliases) — nothing to search for.`,
      });
    }

    const { articles: structuredArticles, errors: newsSearchErrors } = await searchNews({ query });

    let webSearchArticles = [];
    let webSearchError = null;
    if (isWebSearchDiscoveryConfigured) {
      try {
        webSearchArticles = await searchWebForMentions({
          query,
          clientId: client.id,
          clientName: client.name,
          alreadyFoundUrls: structuredArticles.map((a) => a.articleUrl),
        });
      } catch (err) {
        // Layer 2 failing (e.g. both providers rate-limited) doesn't fail
        // the whole scan — layer 1's results are still real and still get
        // scored and inserted below. The error comes back in the response
        // so it's visible, not swallowed.
        webSearchError = err.message;
      }
    }

    const allArticles = [...structuredArticles, ...webSearchArticles];

    const candidates = allArticles
      .map((article) => {
        const match = scoreArticleMatch(article, client.keyword_config);
        return match ? { article, match } : null;
      })
      .filter(Boolean);

    const rows = candidates.map(({ article, match }) => ({
      client_id: client.id,
      publication: article.publication || "Unknown (found via web search)",
      headline: article.headline,
      article_url: article.articleUrl,
      matched_on: match.matchedOn,
      status: "pending",
    }));

    let inserted = 0;
    if (rows.length > 0) {
      const { data, error: insertError } = await supabase.from("review_queue").insert(rows).select();
      if (insertError) throw insertError;
      inserted = data.length;
    }

    res.status(200).json({
      ok: true,
      scanned: allArticles.length,
      structuredSourcesScanned: structuredArticles.length,
      webSearchSourcesScanned: webSearchArticles.length,
      matched: candidates.length,
      inserted,
      newsSearchErrors,
      webSearchError,
    });
  })
);

// Read-only visibility into webSearchDiscovery.js's paid-call log — the
// "traceable over time" half of the cost safeguard (see
// lib/searchUsageLog.js for the "every call gets logged" half).
app.get(
  "/api/search-usage-log",
  ownerRoute(async (req, res) => {
    res.status(200).json(listSearchUsage());
  })
);

// AVE manual-fallback research — wraps perplexityResearch.js. Gated behind
// the same ownerRoute()/requireOwner() as every other route here for
// consistency and to keep an unauthenticated caller from running up a
// Perplexity bill; the tradeoff is this feature is otherwise fully
// independent of Supabase but still 503s on a missing Supabase config
// before it even checks for PERPLEXITY_API_KEY. Acceptable for now — this
// whole API has no real per-request auth without Supabase anyway.
app.post(
  "/api/research-outlet-rate",
  ownerRoute(async (req, res) => {
    const outletName = String(req.body?.outletName || "").trim();
    if (!outletName) {
      return res.status(400).json({ error: "invalid_body", message: "outletName is required." });
    }
    const result = await researchOutletRate(outletName);
    res.status(200).json(result);
  })
);

// AI writing functions — one shared route, five prompt builders. Every one
// of these is a SUGGESTION: this route only ever returns generated text,
// it never writes to Supabase/localStorage itself. The caller (frontend)
// decides what to do with the result — fill a draft textarea, show
// alternatives next to a field — and a human still has to save/approve it,
// same "AI drafts, owner approves, never auto-final" rule as everywhere
// else in this build (src/summaryStorage.js's approvedAt gate, etc.).
//
// The data these prompts need (real placements, notes, campaign info)
// mostly lives in the FRONTEND's localStorage (src/storage.js et al.), not
// Supabase — this server has no way to read it. So unlike discovery-scan
// (which pulls from Supabase itself), the caller is responsible for
// assembling and sending the real data in the request body; this route
// only builds the prompt and calls the model.
// Types whose output is a multi-paragraph document rather than a line or
// two — these are the ones that hit a token ceiling in practice.
const LONG_FORM_TYPES = new Set(["report-narrative", "executive-summary", "campaign-activity-summary"]);

const PROMPT_BUILDERS = {
  "executive-summary": buildExecutiveSummaryPrompt,
  "campaign-activity-summary": buildCampaignActivitySummaryPrompt,
  "report-narrative": buildReportNarrativePrompt,
  "sentiment-analysis": buildSentimentAnalysisPrompt,
  "language-suggestions": buildLanguageSuggestionsPrompt,
};

app.post(
  "/api/generate/:type",
  ownerRoute(async (req, res) => {
    const builder = PROMPT_BUILDERS[req.params.type];
    if (!builder) {
      return res.status(404).json({
        error: "unknown_type",
        message: `No prompt builder for "${req.params.type}". Known types: ${Object.keys(PROMPT_BUILDERS).join(", ")}.`,
      });
    }

    let prompt;
    try {
      prompt = builder(req.body || {});
    } catch (err) {
      return res.status(400).json({ error: "invalid_body", message: err.message });
    }

    // Long-form types get an explicit, larger budget rather than the
    // 2048 default. Two reasons: a full report narrative legitimately
    // runs long, and Claude's extended thinking counts its thinking
    // tokens against max_tokens — so a budget sized for the visible
    // answer alone can be consumed before the answer starts. aiClient
    // now throws on a max_tokens stop rather than returning a truncated
    // string, so getting this wrong is loud instead of silent.
    const result = await generateText({ prompt, maxTokens: LONG_FORM_TYPES.has(req.params.type) ? 4096 : 2048 });
    if (result.fellBackFrom) {
      console.warn(`[generate/${req.params.type}] answered by ${result.providerUsed} after: ${result.fellBackFrom.join("; ")}`);
    }
    res.status(200).json(result);
  })
);

const server = app.listen(PORT, () => {
  const status = isSupabaseConfigured ? "connected to Supabase" : "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — routes will 503";
  console.log(`owner-api listening on http://localhost:${PORT} (${status})`);
});

server.on("error", (err) => {
  console.error(`owner-api failed to start on port ${PORT}: ${err.message}`);
  process.exitCode = 1;
});
