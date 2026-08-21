// Real-data source for both portals — reads whatever's actually been entered
// through the Phase 0 owner tool (index.html), via storage.js's localStorage
// placements. This is the "wiring, not building from scratch" step the PRD's
// Repo Status Check called for.
//
// This is still not the real backend. It's real DATA (whatever placements
// actually exist right now), read directly from the browser's localStorage —
// there is no server, no Supabase, no per-client access control here. Once
// Supabase/Express exist, these functions get replaced by real API calls;
// nothing that reads from this module should need to change shape when that
// happens, since it already returns the same field names as the mock data
// and the Placement schema.
//
// Real placements are identified by client NAME (whatever was typed into the
// "Client" field on the manual entry form) — there's no clientId slug system
// for real data the way the mock accounts have one. Callers should match on
// name, not on a mock clientId.

import { loadPlacements } from "./storage.js";
import { loadCampaigns } from "./campaignStorage.js";
import { loadSummary } from "./summaryStorage.js";
import { computeLeadTimeDays } from "./calculations.js";

const CAMPAIGN_STATUS_LABELS = { active: "Active", completed: "Completed", paused: "Paused" };

function findRealCampaignRecord(name, clientName) {
  return loadCampaigns().find((c) => c.client === clientName && c.name.trim().toLowerCase() === String(name).trim().toLowerCase());
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function avatarInitials(name) {
  const words = String(name).trim().split(/\s+/);
  return (words[0]?.[0] || "").concat(words[1]?.[0] || "").toUpperCase() || "?";
}

function deriveStatus(p) {
  if (p.landedDate) return "Published";
  if (p.pitchSentDate) return "In Progress";
  return "Awaiting Publication";
}

function placementsForClient(clientName) {
  return loadPlacements().filter((p) => p.client === clientName);
}

// ---------------------------------------------------------------------------
// Per-client
// ---------------------------------------------------------------------------

export function getRealClients() {
  const names = [...new Set(loadPlacements().map((p) => p.client).filter(Boolean))].sort();
  return names.map((name) => ({ id: slugify(name), name, avatarInitials: avatarInitials(name) }));
}

export function getRealPlacements(clientName) {
  return placementsForClient(clientName).map((p) => ({ ...p, status: deriveStatus(p) }));
}

export function getRealMetrics(clientName) {
  const items = placementsForClient(clientName);
  // "Confirmed" = landed (has a landedDate, same definition deriveStatus()
  // uses for "Published") — an AVE entered on a placement that's only been
  // pitched, not landed, shouldn't count toward publicity value yet. Total
  // Press Placements below deliberately does NOT apply this filter — that
  // card counts every placement record regardless of status.
  const confirmed = items.filter((p) => Boolean(p.landedDate));
  const totalAVE = confirmed.reduce((sum, p) => sum + (p.aveValue || 0), 0);
  const leadTimes = items.map((p) => computeLeadTimeDays(p.pitchSentDate, p.landedDate)).filter((lt) => lt != null);
  // null (not 0) when no placement has both dates yet — 0 would silently
  // claim "same-day turnaround," which isn't what "no data" means. See
  // getAggregateRealMetrics below for why this distinction also has to
  // hold through the weighted aggregate, not just here.
  const avgLeadTime = leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;
  // Real Campaign records (campaignStorage.js), not placement.campaign
  // name-strings — a placement tagged with a campaign name says nothing
  // about whether that campaign's actual status is active/completed/paused.
  const activeCampaigns = loadCampaigns().filter((c) => c.client === clientName && c.status === "active").length;
  return {
    totalAVE,
    totalPlacements: items.length,
    avgLeadTime,
    activeCampaigns,
    // No historical baseline exists yet to compare against, so there's
    // nothing honest to put here — null, not a made-up trend. MetricCard
    // already skips rendering the delta line when it's null.
    aveDelta: null,
    placementsDelta: null,
    leadTimeDelta: null,
  };
}

/**
 * Merges two sources: placements grouped by their free-text `campaign`
 * field (unchanged since Phase 0), and real Campaign records created via
 * the owner dashboard's Campaign form (campaignStorage.js). A real record
 * matching a derived group's (name, client) supplies startDate/status/
 * milestones; a derived group with no matching record stays honestly
 * "Not yet tracked" rather than guessing. Real campaigns with zero
 * placements yet (freshly created, nothing landed) still show up.
 */
export function getRealCampaigns(clientName) {
  const items = placementsForClient(clientName);
  const byCampaign = new Map();
  for (const p of items) {
    if (!p.campaign) continue;
    if (!byCampaign.has(p.campaign)) byCampaign.set(p.campaign, []);
    byCampaign.get(p.campaign).push(p);
  }

  const derived = [...byCampaign.entries()].map(([name, rows]) => {
    const leadTimes = rows.map((p) => computeLeadTimeDays(p.pitchSentDate, p.landedDate)).filter((lt) => lt != null);
    const record = findRealCampaignRecord(name, clientName);
    return {
      id: record ? record.id : slugify(name),
      name,
      // No "start state vs. 90-day/6-month current state" data exists yet
      // (Final PRD: this is a new feature, not something already tracked) —
      // progressPercent stays null rather than guessing one from placement
      // count, which the PRD explicitly warns against implying.
      progressPercent: null,
      startDate: record?.startDate || null,
      completedPlacements: rows.filter((p) => p.landedDate).length,
      totalPlacements: rows.length,
      avgLeadTime: leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null,
      status: record ? CAMPAIGN_STATUS_LABELS[record.status] || "Active" : "Not yet tracked",
      milestones: record?.milestones || [],
    };
  });

  const derivedNames = new Set(derived.map((d) => d.name.trim().toLowerCase()));
  const emptyRealCampaigns = loadCampaigns()
    .filter((c) => c.client === clientName && !derivedNames.has(c.name.trim().toLowerCase()))
    .map((record) => ({
      id: record.id,
      name: record.name,
      progressPercent: null,
      startDate: record.startDate || null,
      completedPlacements: 0,
      totalPlacements: 0,
      avgLeadTime: null,
      status: CAMPAIGN_STATUS_LABELS[record.status] || "Active",
      milestones: record.milestones || [],
    }));

  return [...derived, ...emptyRealCampaigns];
}

function bucketByMonth(items, range) {
  const now = new Date();
  const monthsBack = range === "30d" ? 1 : range === "90d" ? 3 : 12;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const buckets = new Map();
  for (const p of items) {
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

export function getRealChartSeries(clientName, range) {
  return bucketByMonth(placementsForClient(clientName), range);
}

// Executive summaries and generated reports are AI writing features (PRD
// Phase 7/8) — not built. Returning null lets the existing empty-state
// components handle this the same way they already do for mock "empty" mode.
export function getRealInsight() {
  return null;
}

// A "report" only exists once the owner has actually written an executive
// summary draft for that client (see summaryStorage.js/Reports view) — no
// report-generation engine exists yet (Phase 8, planned), so there's
// nothing else to base one on.
export function getRealReport(clientName) {
  const summary = loadSummary(clientName);
  if (!summary) return null;
  return {
    title: `${clientName} — Coverage Summary`,
    period: "All confirmed placements to date",
    datePublished: summary.savedAt.slice(0, 10),
    executiveSummary: summary.text,
    viewUrl: "",
    pdfUrl: "",
  };
}

// ---------------------------------------------------------------------------
// Aggregate across all clients (owner dashboard)
// ---------------------------------------------------------------------------

export function getAllRealPlacements() {
  return getRealClients().flatMap((c) => getRealPlacements(c.name).map((p) => ({ ...p, clientName: c.name })));
}

export function getAllRealCampaigns() {
  return getRealClients().flatMap((c) => getRealCampaigns(c.name).map((camp) => ({ ...camp, clientName: c.name })));
}

export function getAggregateRealMetrics() {
  const clients = getRealClients();
  if (clients.length === 0) {
    return { totalAVE: 0, totalPlacements: 0, avgLeadTime: null, activeCampaigns: 0, aveDelta: null, placementsDelta: null, leadTimeDelta: null };
  }
  const perClient = clients.map((c) => getRealMetrics(c.name));
  const totalAVE = perClient.reduce((sum, m) => sum + m.totalAVE, 0);
  const totalPlacements = perClient.reduce((sum, m) => sum + m.totalPlacements, 0);
  const activeCampaigns = perClient.reduce((sum, m) => sum + m.activeCampaigns, 0);
  // Only clients with an actual computed lead time (getRealMetrics returns
  // null, not 0, when none of their placements have both dates) count
  // toward this average. Weighting by totalPlacements alone — the previous
  // version of this line — would fold a client with real placements but no
  // lead-time data in as if their turnaround were 0 days, dragging the
  // whole aggregate toward a fabricated fast number in direct proportion
  // to how much real (but lead-time-less) volume they have.
  const withLeadTime = perClient.filter((m) => m.avgLeadTime != null);
  const leadTimeWeight = withLeadTime.reduce((sum, m) => sum + m.totalPlacements, 0);
  const avgLeadTime = leadTimeWeight
    ? Math.round(withLeadTime.reduce((sum, m) => sum + m.avgLeadTime * m.totalPlacements, 0) / leadTimeWeight)
    : null;
  return { totalAVE, totalPlacements, avgLeadTime, activeCampaigns, aveDelta: null, placementsDelta: null, leadTimeDelta: null };
}

export function getAggregateRealChartSeries(range) {
  const clients = getRealClients();
  const merged = new Map();
  for (const c of clients) {
    for (const point of getRealChartSeries(c.name, range)) {
      if (!merged.has(point.label)) merged.set(point.label, { label: point.label, ave: 0, placements: 0 });
      const bucket = merged.get(point.label);
      bucket.ave += point.ave;
      bucket.placements += point.placements;
    }
  }
  return [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
}

export function getAggregateRealInsight() {
  return null;
}
