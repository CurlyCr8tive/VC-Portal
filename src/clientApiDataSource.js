import { leadTimeDaysForPlacement } from "./calculations.js";
import { applyDemoMetricFallbacks } from "./demoFallbacks.js";
import { getAccessToken } from "./supabaseAuthClient.js";

const CLIENT_API_BASE = window.CLIENT_API_BASE_URL || "http://localhost:4002";
const CAMPAIGN_STATUS_LABELS = { active: "Active", completed: "Completed", paused: "Paused" };

async function authedJsonHeaders() {
  const token = await getAccessToken();
  if (!token) throw new Error("Your session needs to be refreshed. Please sign in again.");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${CLIENT_API_BASE}${path}`, {
    ...options,
    headers: { ...(await authedJsonHeaders()), ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || "We had trouble loading the latest client data.");
  }
  return body;
}

function deriveStatus(row) {
  if (row.landed_date) return "Published";
  if (row.pitch_sent_date) return "In Progress";
  return "Awaiting Publication";
}

function mapClient(row) {
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
  };
}

function mapCampaign(row, placements) {
  const campaignPlacements = placements.filter((p) => p.campaignId === row.id);
  const leadTimes = campaignPlacements.map(leadTimeDaysForPlacement).filter((v) => v != null);
  const milestones = (row.campaign_milestones || []).map((m) => ({
    id: m.id,
    text: m.text,
    done: Boolean(m.done),
    createdAt: m.created_at,
  }));

  return {
    id: row.id,
    name: row.name,
    progressPercent: null,
    startDate: row.start_date || null,
    completedPlacements: campaignPlacements.filter((p) => Boolean(p.landedDate)).length,
    totalPlacements: campaignPlacements.length,
    avgLeadTime: leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null,
    status: CAMPAIGN_STATUS_LABELS[row.status] || "Active",
    milestones,
  };
}

function mapPlacement(row, campaignNameById) {
  return {
    id: row.id,
    createdAt: row.created_at,
    publication: row.publication,
    headline: row.headline,
    articleUrl: row.article_url || "",
    publicationDate: row.publication_date || "",
    client: "",
    aveValue: row.ave_value == null ? null : Number(row.ave_value),
    pitchSentDate: row.pitch_sent_date || "",
    landedDate: row.landed_date || "",
    leadTimeOverrideDays: row.lead_time_override_days == null ? null : Number(row.lead_time_override_days),
    leadTimeSource: row.lead_time_source || "dates",
    leadTimeNotes: row.lead_time_notes || "",
    notes: row.notes || "",
    campaignId: row.campaign_id || null,
    campaign: row.campaign_id ? campaignNameById.get(row.campaign_id) || null : null,
    sentiment: row.sentiment_tag || null,
    audienceReach: row.audience_reach == null ? null : Number(row.audience_reach),
    status: deriveStatus(row),
  };
}

function mapPhase(row) {
  return {
    id: row.id,
    client: row.client || "",
    clientId: row.clientId,
    phaseNumber: row.phaseNumber,
    name: row.name,
    weeks: row.weeks || "",
    vaam: row.vaam,
    status: row.status,
    goal: row.goal || "",
    deliverables: Array.isArray(row.deliverables) ? row.deliverables : [],
    notes: row.notes || "",
    createdAt: row.createdAt,
    homework: (row.homework || []).map((h) => ({
      id: h.id,
      phaseId: h.phaseId,
      type: h.type,
      text: h.text,
      dueDate: h.dueDate || "",
      status: h.status,
      response: h.response || "",
      createdAt: h.createdAt,
    })),
  };
}

function mapOpportunity(row) {
  return {
    id: row.id,
    client: row.client || "",
    clientId: row.clientId,
    title: row.title,
    description: row.description || "",
    scores: row.scores || {},
    decisionStatus: row.decisionStatus,
    writeUp: row.writeUp || "",
    createdAt: row.createdAt,
  };
}

function mapResource(row) {
  return {
    id: row.id,
    client: row.client || "",
    clientId: row.clientId,
    kind: row.kind,
    title: row.title,
    content: row.content || "",
    priority: row.priority,
    completed: row.completed,
    createdAt: row.createdAt,
  };
}

function bucketByMonth(placements, range) {
  const now = new Date();
  const monthsBack = range === "30d" ? 1 : range === "90d" ? 3 : 12;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const buckets = new Map();
  for (const p of placements) {
    if (!p.publicationDate) continue;
    const d = new Date(p.publicationDate);
    if (Number.isNaN(d.getTime()) || d < cutoff) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, { label: key, ave: 0, placements: 0 });
    const bucket = buckets.get(key);
    bucket.ave += p.aveValue || 0;
    bucket.placements += 1;
  }
  return [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
}

export function buildClientApiChartSeries(placements, range) {
  return bucketByMonth(placements, range);
}

function metricsFrom({ placements, campaigns }) {
  const confirmed = placements.filter((p) => Boolean(p.landedDate));
  const leadTimes = placements.map(leadTimeDaysForPlacement).filter((v) => v != null);
  const withAve = confirmed.filter((p) => p.aveValue != null);
  return applyDemoMetricFallbacks({
    totalAVE: withAve.length ? withAve.reduce((sum, p) => sum + p.aveValue, 0) : null,
    totalPlacements: placements.length,
    avgLeadTime: leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null,
    activeCampaigns: campaigns.filter((c) => c.status === "Active").length,
    aveDelta: null,
    placementsDelta: null,
    leadTimeDelta: null,
  }, { placements });
}

export async function loadClientApiData(range = "30d") {
  const [me, rawCampaigns, rawPlacements, rawCoaching, latestReport] = await Promise.all([
    apiFetch("/api/me"),
    apiFetch("/api/campaigns"),
    apiFetch("/api/placements"),
    apiFetch("/api/coaching").catch(() => ({ phases: [], opportunities: [], resources: [] })),
    apiFetch("/api/reports/latest").catch(() => null),
  ]);
  const campaignNameById = new Map(rawCampaigns.map((c) => [c.id, c.name]));
  const placements = rawPlacements.map((p) => mapPlacement(p, campaignNameById));
  const campaigns = rawCampaigns.map((c) => mapCampaign(c, placements));
  return {
    client: mapClient(me.client),
    profile: me.profile,
    placements,
    campaigns,
    metrics: metricsFrom({ placements, campaigns }),
    chartSeries: bucketByMonth(placements, range),
    coaching: {
      phases: (rawCoaching.phases || []).map(mapPhase),
      opportunities: (rawCoaching.opportunities || []).map(mapOpportunity),
      resources: (rawCoaching.resources || []).map(mapResource),
    },
    insight: null,
    report: latestReport
      ? {
          title: latestReport.title,
          date: latestReport.approvedAt ? latestReport.approvedAt.slice(0, 10) : latestReport.updatedAt?.slice(0, 10) || "",
          summary: latestReport.executiveSummary,
          viewUrl: "",
          pdfUrl: "",
        }
      : null,
  };
}

export async function loadClientApiNotes(campaignId) {
  const rows = await apiFetch(`/api/campaigns/${encodeURIComponent(campaignId)}/notes`);
  return rows.map((n) => ({
    id: n.id,
    campaignId: n.campaign_id,
    authorRole: n.author_role,
    authorName: n.author_name || n.author_role,
    body: n.body,
    createdAt: n.created_at,
  }));
}

export async function postClientApiNote(campaignId, body) {
  return apiFetch(`/api/campaigns/${encodeURIComponent(campaignId)}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function updateClientApiHomework(homeworkId, patch) {
  return apiFetch(`/api/coaching/homework/${encodeURIComponent(homeworkId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function postClientApiOpportunity({ title, description }) {
  return apiFetch("/api/coaching/opportunities", {
    method: "POST",
    body: JSON.stringify({ title, description }),
  });
}

export async function loadClientApiMessages() {
  return apiFetch("/api/messages");
}

export async function postClientApiMessage({ subject, body }) {
  return apiFetch("/api/messages", {
    method: "POST",
    body: JSON.stringify({ subject, body }),
  });
}

export async function loadClientApiFiles() {
  return apiFetch("/api/files");
}

export async function postClientApiFile({ fileName, mimeType, dataBase64, notes }) {
  return apiFetch("/api/files", {
    method: "POST",
    body: JSON.stringify({ fileName, mimeType, dataBase64, notes }),
  });
}
