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

// process.env.PORT first — Render (and most PaaS hosts) assign the port
// dynamically and expect the app to bind to whatever they inject via PORT,
// not a fixed one. OWNER_API_PORT/4001 stay as the local-dev fallback.
const PORT = process.env.PORT || process.env.OWNER_API_PORT || 4001;

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
// collected one, so rather than bolt on a schema change against the temp
// Supabase project for one route, the owner types the email in at invite
// time. inviteUserByEmail creates the auth.users row and emails the invite
// link; it does NOT create the matching `profiles` row (role, client_id) —
// that still needs to happen once the client actually completes setup,
// most likely via a Supabase trigger on auth.users insert. Not built yet;
// flagging here rather than silently pretending this route alone is enough
// to produce a working client login.
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

    const result = await generateText({ prompt });
    res.status(200).json(result);
  })
);

app.listen(PORT, () => {
  const status = isSupabaseConfigured ? "connected to Supabase" : "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — routes will 503";
  console.log(`owner-api listening on http://localhost:${PORT} (${status})`);
});
