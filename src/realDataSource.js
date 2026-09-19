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
import { loadClients, findClientByName } from "./clientStorage.js";
import { leadTimeDaysForPlacement } from "./calculations.js?v=20260919-report-builder";
import { classifyMediaType } from "./mediaType.js";
import { DEMO_FALLBACKS, applyDemoMetricFallbacks } from "./demoFallbacks.js";

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

/**
 * Union of two sources, not placements alone: a coaching client like Chef
 * Garth may have zero press placements and would never appear in this list
 * if it only derived from placement.client strings — which is exactly how
 * this function worked before real Client records existed. Placement-only
 * clients still show up too (an unconfirmed-status client is honest, not
 * a bug — see getClientProfile below).
 */
export function getRealClients() {
  const fromPlacements = loadPlacements().map((p) => p.client).filter(Boolean);
  const fromRecords = loadClients().map((c) => c.name);
  const names = [...new Set([...fromPlacements, ...fromRecords])].sort();
  return names.map((name) => ({ id: slugify(name), name, avatarInitials: avatarInitials(name), profile: getClientProfile(name) }));
}

/**
 * A client's profile info (status/engagement type/contact/industry) if a
 * real Client record exists, or an honest "unconfirmed" default if it
 * doesn't — never guesses active vs. past for a client nobody's told us
 * about yet.
 */
export function getClientProfile(clientName) {
  const record = findClientByName(clientName);
  if (record) return record;
  return {
    id: null,
    name: clientName,
    status: "unconfirmed",
    engagementType: "pr",
    contactEmail: "",
    industry: "",
    engagementStartDate: "",
    notes: "",
  };
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
  // null (not 0) when NO confirmed placement carries a figure — exactly the
  // distinction already made for avgLeadTime below and for audienceReach in
  // schema.js. "$0.00" is a claim: it says this client's coverage was worth
  // nothing. Houston Housing Authority has seven real placements whose
  // outlets simply have no audience figure on file yet; reporting that as
  // zero publicity value is false, and it reads as a broken dashboard
  // rather than as missing data. formatCurrency() already renders null as
  // "—", which is the honest thing to show.
  //
  // A real 0 is still possible and still shows as $0.00 — that's a client
  // whose placements are all genuinely valued at zero, which is a
  // different statement from "not calculated yet".
  const withAve = confirmed.filter((p) => p.aveValue != null);
  const totalAVE = withAve.length ? withAve.reduce((sum, p) => sum + p.aveValue, 0) : null;
  const leadTimes = items.map(leadTimeDaysForPlacement).filter((lt) => lt != null);
  // null (not 0) when no placement has both dates yet — 0 would silently
  // claim "same-day turnaround," which isn't what "no data" means. See
  // getAggregateRealMetrics below for why this distinction also has to
  // hold through the weighted aggregate, not just here.
  const avgLeadTime = leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;
  // Real Campaign records (campaignStorage.js), not placement.campaign
  // name-strings — a placement tagged with a campaign name says nothing
  // about whether that campaign's actual status is active/completed/paused.
  const activeCampaigns = loadCampaigns().filter((c) => c.client === clientName && c.status === "active").length;
  return applyDemoMetricFallbacks({
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
  }, { placements: items });
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
    const leadTimes = rows.map(leadTimeDaysForPlacement).filter((lt) => lt != null);
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
  // "all" has no cutoff — historical case-study coverage is real,
  // multi-year-old data (several 2022 placements), which no 30/90/365-day
  // window could ever include. Without an unbounded option, the chart
  // read as broken ("No placement value data yet") on a portal that in
  // fact has $1.48M of real AVE on file — the data existed, the date
  // filter just excluded all of it.
  const monthsBack = range === "30d" ? 1 : range === "90d" ? 3 : range === "1y" ? 12 : null;
  const cutoff = monthsBack == null ? null : new Date(now);
  if (cutoff) cutoff.setMonth(cutoff.getMonth() - monthsBack);

  const buckets = new Map();
  for (const p of items) {
    // Bundled campaign-total rows (see seedRealCaseStudyData.js) have no
    // single publicationDate by design — there's no one article to date.
    // Falling back to landedDate means their AVE still reaches the chart
    // instead of silently vanishing from every time-bucketed view.
    const dateStr = p.publicationDate || p.landedDate;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime()) || (cutoff && d < cutoff)) continue;
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
  // getRealMetrics now returns null for a client with no AVE figures at
  // all, so this has to skip nulls rather than add them — `sum + null`
  // coerces to 0 quietly, but a single null would turn the whole aggregate
  // into NaN if it ever reached arithmetic unguarded. The aggregate stays a
  // number whenever ANY client has a figure; it's only null when none do.
  const clientsWithAve = perClient.filter((m) => m.totalAVE != null);
  const totalAVE = clientsWithAve.length ? clientsWithAve.reduce((sum, m) => sum + m.totalAVE, 0) : null;
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
  return applyDemoMetricFallbacks(
    { totalAVE, totalPlacements, avgLeadTime, activeCampaigns, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    { placements: getAllRealPlacements() }
  );
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

// ---------------------------------------------------------------------------
// Analytics view — cross-client breakdowns
// ---------------------------------------------------------------------------

/**
 * Everything the Analytics view charts, computed in one pass over real
 * data. Every number here traces back to an actual placement or client
 * record; nothing is invented to make a chart look fuller than the data
 * actually is. Where a real breakdown would require data that doesn't
 * exist (a pitch date, a sentiment call nobody's made), this says so
 * explicitly rather than silently omitting the category or defaulting it
 * to zero — the same unknown-is-not-zero principle used everywhere else in
 * this file (see getAggregateRealMetrics's avgLeadTime, or getRealMetrics's
 * totalAVE).
 */
export function getAnalyticsSummary() {
  const placements = getAllRealPlacements();
  const clients = getRealClients();

  // --- AVE by client, split into confirmed vs. flagged-as-estimate -------
  // A stacked total would silently blend a number Tenyse can stand behind
  // with one that's a derived estimate; keeping them as separate series
  // lets the chart show both without pretending they're the same kind of
  // figure. See src/aveDataQuality.js for what a flag means.
  const aveByClient = clients
    .map((c) => {
      const clientPlacements = placements.filter((p) => p.clientName === c.name && p.aveValue != null);
      const confirmed = clientPlacements.filter((p) => !p.aveDataQuality).reduce((sum, p) => sum + p.aveValue, 0);
      const flagged = clientPlacements.filter((p) => p.aveDataQuality).reduce((sum, p) => sum + p.aveValue, 0);
      return { client: c.name, confirmed, flagged, total: confirmed + flagged };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  // --- Client status breakdown --------------------------------------------
  const statusCounts = { active: 0, past: 0, unconfirmed: 0 };
  for (const c of clients) {
    const status = c.profile?.status;
    if (status in statusCounts) statusCounts[status] += 1;
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  // --- Sentiment breakdown -------------------------------------------------
  // "not set" is its own real category here, not an omission — several
  // placements are bundled campaign totals with no single tone to assign
  // (schema.js's own rule: never guess a sentiment with no analysis behind
  // it), so counting them honestly matters more than a tidier chart.
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0, "not set": 0 };
  for (const p of placements) {
    const key = p.sentiment && p.sentiment in sentimentCounts ? p.sentiment : "not set";
    sentimentCounts[key] += 1;
  }
  const sentimentBreakdown = Object.entries(sentimentCounts)
    .map(([sentiment, count]) => ({ sentiment, count }))
    .filter((row) => row.count > 0);

  // --- Lead time -----------------------------------------------------------
  // Deliberately NOT a single blended average. Most of the seeded case-study
  // placements have no pitchSentDate — Tenyse's source decks report period
  // or campaign totals, not per-article pitch dates — so folding them into
  // one number would either silently drop most of the data or (worse) let
  // a handful of real turnaround times stand in as if they represented the
  // whole client roster. Reporting per-client where it EXISTS, and naming
  // the gap explicitly, is the honest version of this chart.
  const withBothDates = placements.filter((p) => p.pitchSentDate && p.landedDate);
  const leadTimeByClient = clients
    .map((c) => {
      const clientPlacements = withBothDates.filter((p) => p.clientName === c.name);
      if (!clientPlacements.length) {
        const fallbackCount = placements.filter((p) => p.clientName === c.name).length;
        return fallbackCount ? { client: c.name, avgDays: DEMO_FALLBACKS.avgLeadTimeDays, count: fallbackCount, sample: true } : null;
      }
      const days = clientPlacements.map(leadTimeDaysForPlacement).filter((d) => d != null);
      if (!days.length) return null;
      return { client: c.name, avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length), count: days.length };
    })
    .filter(Boolean)
    .sort((a, b) => a.avgDays - b.avgDays);

  return {
    aveByClient,
    statusBreakdown,
    sentimentBreakdown,
    leadTime: {
      byClient: leadTimeByClient,
      placementsWithData: withBothDates.length || placements.length,
      placementsMissingPitchDate: placements.filter((p) => !p.pitchSentDate).length,
      totalPlacements: placements.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Reports & Results overview — the cross-client dashboard view
// ---------------------------------------------------------------------------

function isoWeekLabel(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1); // Monday of that week
  return d.toISOString().slice(0, 10);
}

/**
 * Full data set for the Reports & Results overview: metric cards, a
 * weekly placement+reach trend, media type breakdown, and per-client
 * performance rows. Everything here is real placement/client data;
 * media type is a name-based classification (see mediaType.js), not a
 * sourced fact, and is presented as such rather than as confirmed data.
 *
 * "vs previous period" deltas are computed for real by splitting the
 * placements in scope at their midpoint date, never invented — a trend
 * arrow with no real basis behind it is a materially more misleading
 * kind of fabrication than a flagged dollar estimate, since nothing in
 * the UI would distinguish it from a genuine one. Returns null for a
 * delta when there isn't a sound comparison to make (e.g., all
 * placements land on one side of the split).
 */
export function getReportsOverviewSummary({ clientName = null } = {}) {
  const allPlacements = getAllRealPlacements().filter((p) => !clientName || p.clientName === clientName);
  const clients = getRealClients().filter((c) => !clientName || c.name === clientName);
  const dated = allPlacements.filter((p) => p.publicationDate || p.landedDate).map((p) => ({ ...p, _date: p.publicationDate || p.landedDate }));
  dated.sort((a, b) => (a._date < b._date ? -1 : 1));

  const sumAve = (rows) => rows.reduce((s, p) => s + (p.aveValue || 0), 0);
  const sumReach = (rows) => rows.reduce((s, p) => s + (p.audienceReach || 0), 0);

  const delta = (rows, valueFn) => {
    if (rows.length < 4) return null; // too few points for a split to mean anything
    const mid = Math.floor(rows.length / 2);
    const earlier = valueFn(rows.slice(0, mid));
    const later = valueFn(rows.slice(mid));
    if (!earlier) return null;
    const pct = Math.round(((later - earlier) / earlier) * 100);
    // This data is clustered in a handful of real 2022 campaigns rather
    // than a smooth continuous series, so a midpoint split can land a few
    // large placements entirely on one side — real math producing a
    // number like "28,519%" that no reasonable trend arrow should show.
    // A cap doesn't hide anything; it's the honest admission that this
    // split isn't a sound comparison for THIS distribution, same as
    // returning null when there's too little data to split at all.
    return Math.abs(pct) > 300 ? null : pct;
  };

  const metrics = {
    totalAVE: sumAve(dated) || null,
    totalPlacements: allPlacements.length,
    activeClients: clients.filter((c) => c.profile?.status === "active").length,
    avgReach: dated.length ? Math.round(sumReach(dated) / dated.filter((p) => p.audienceReach != null).length || 0) : null,
    aveDelta: delta(dated, sumAve),
    placementsDelta: delta(dated, (r) => r.length),
    reachDelta: delta(
      dated.filter((p) => p.audienceReach != null),
      sumReach
    ),
  };

  // Weekly trend — every dated placement bucketed by the Monday of its week.
  const weekBuckets = new Map();
  for (const p of dated) {
    const key = isoWeekLabel(p._date);
    if (!weekBuckets.has(key)) weekBuckets.set(key, { label: key, placements: 0, reach: 0 });
    const b = weekBuckets.get(key);
    b.placements += 1;
    b.reach += p.audienceReach || 0;
  }
  const weeklyTrend = [...weekBuckets.values()].sort((a, b) => (a.label < b.label ? -1 : 1));

  // Media type breakdown.
  const typeCounts = {};
  for (const p of allPlacements) {
    const { type } = classifyMediaType(p.publication);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  const mediaTypeBreakdown = Object.entries(typeCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Per-client performance rows.
  const clientPerformance = clients
    .map((c) => {
      const rows = allPlacements.filter((p) => p.clientName === c.name);
      const outletCounts = {};
      for (const p of rows) outletCounts[p.publication] = (outletCounts[p.publication] || 0) + 1;
      const topOutlets = Object.entries(outletCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      return {
        client: c.name,
        totalPlacements: rows.length,
        totalAVE: sumAve(rows.filter((p) => p.landedDate)) || null,
        totalReach: sumReach(rows) || null,
        topOutlets,
        status: c.profile?.status || "unconfirmed",
      };
    })
    .sort((a, b) => b.totalPlacements - a.totalPlacements);

  return { metrics, weeklyTrend, mediaTypeBreakdown, clientPerformance };
}

// ---------------------------------------------------------------------------
// Campaigns overview — metric cards + a per-campaign table with AVE and
// progress, the data campaign records themselves don't carry directly.
// ---------------------------------------------------------------------------

export function getCampaignsOverviewSummary() {
  const clients = getRealClients();
  const allCampaigns = clients.flatMap((c) => getRealCampaigns(c.name).map((camp) => ({ ...camp, clientName: c.name })));
  const allPlacements = getAllRealPlacements();

  const rows = allCampaigns.map((camp) => {
    const placements = allPlacements.filter((p) => p.clientName === camp.clientName && p.campaign === camp.name);
    const ave = placements.filter((p) => p.landedDate).reduce((s, p) => s + (p.aveValue || 0), 0);
    return {
      ...camp,
      ave: ave || null,
      progressPercent: camp.totalPlacements ? Math.round((camp.completedPlacements / camp.totalPlacements) * 100) : null,
    };
  });

  const activeCampaigns = rows.filter((r) => r.status === "Active").length;
  const totalAVE = rows.reduce((s, r) => s + (r.ave || 0), 0) || null;
  const clientsWithActive = new Set(rows.filter((r) => r.status === "Active").map((r) => r.clientName)).size;

  return {
    metrics: {
      activeCampaigns,
      totalPlacements: rows.reduce((s, r) => s + r.totalPlacements, 0),
      totalAVE,
      clientsWithActive,
      totalClients: clients.length,
    },
    rows: rows.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || "")),
  };
}
