import { CLIENTS, METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, AGGREGATE_INSIGHT, REPORTS } from "../client/mockData.js";
import {
  getRealClients,
  getClientProfile,
  getAnalyticsSummary,
  getReportsOverviewSummary,
  getCampaignsOverviewSummary,
  getRealMetrics,
  getRealPlacements,
  getRealCampaigns,
  getAllRealPlacements,
  getAllRealCampaigns,
  getAggregateRealMetrics,
  getAggregateRealChartSeries,
  getAggregateRealInsight,
  getRealReport,
} from "../realDataSource.js?v=20260919-report-builder";
import { formatCurrency, leadTimeDaysForPlacement } from "../calculations.js?v=20260919-report-builder";
import { requireSession, logout } from "../auth.js?v=20260918-real-session-priority";
import { getAccessToken, signOutReal } from "../supabaseAuthClient.js";
import { createPlacement, applyPlacementEdit } from "../schema.js";
import { addPlacement, updatePlacement, deletePlacement, upsertPlacement } from "../storage.js";
import { createCampaign, applyCampaignEdit, addMilestone, toggleMilestone, removeMilestone } from "../campaignSchema.js";
import { loadCampaigns, addCampaign, updateCampaign as updateCampaignRecord, deleteCampaign, upsertCampaign } from "../campaignStorage.js";
import { createClient, applyClientEdit } from "../clientSchema.js";
import { addClient, updateClient, upsertClientByName, findClientByName } from "../clientStorage.js";
import { renderHeader } from "../client/components/DashboardHeader.js";
import { renderMetricsGrid } from "../client/components/MetricCard.js?v=20260919-live-ui";
import { renderPlacementsTable } from "../client/components/PressPlacementTable.js?v=20260919-live-ui";
import { renderCampaignsGrid } from "../client/components/CampaignProgressCard.js?v=20260919-live-ui";
import { renderPerformanceChart } from "../client/components/PerformanceChart.js?v=20260919-report-builder-2";
import { renderInsightCard } from "../client/components/CampaignInsightCard.js";
import { renderReportCard } from "../client/components/LatestReportCard.js?v=20260919-live-ui";
import { renderLoadingState } from "../client/components/LoadingState.js";
import { renderErrorState } from "../client/components/ErrorState.js";
import { renderOwnerSidebar } from "./components/OwnerSidebar.js?v=20260916-polish";
import { installInfoPopoverDelegate, sectionInfoButton } from "./components/InfoPopover.js?v=20260919-dashboard-alive";
import { renderAveByClientChart, renderStatusBreakdownChart, renderSentimentChart, renderLeadTimeSection, renderDonutChart, renderWeeklyTrendChart } from "./components/AnalyticsCharts.js?v=20260919-analytics-clicks";
import { renderClientsList } from "./components/ClientsListCard.js?v=20260919-live-ui";
import { renderReviewQueue } from "./components/ReviewQueueCard.js?v=20260919-live-ui";
import { renderPlacementForm } from "./components/PlacementForm.js";
import { renderCampaignForm } from "./components/CampaignForm.js";
import { renderCampaignManageList } from "./components/CampaignManageList.js?v=20260919-report-builder";
import { renderCanvaExportPanel } from "./components/CanvaExportPanel.js?v=20260919-live-ui";
import { renderClientDetailForm } from "./components/ClientDetailForm.js";
import { renderCoachingAdminView } from "./components/CoachingAdminView.js?v=20260920-owner-coaching-workspace";
import { renderErrorLogPanel } from "./components/ErrorLogPanel.js";
import { renderOutletRatesView } from "./components/OutletRatesView.js?v=20260919-report-builder";
import { renderCampaignDetail } from "../client/components/CampaignDetailView.js?v=20260919-live-ui";
import { loadPhasesForClient, addPhase as addLocalPhase, updatePhase as updateLocalPhase } from "../coachingPhaseStorage.js";
import { loadResourcesForClient, addResource as addLocalResource, updateResource as updateLocalResource, deleteResource as deleteLocalResource } from "../coachingResourceStorage.js";
import { loadOpportunitiesForClient, addOpportunity as addLocalOpportunity, updateOpportunity as updateLocalOpportunity, deleteOpportunity as deleteLocalOpportunity } from "../opportunityStorage.js";
import { createPhase, applyPhaseEdit, addHomeworkItem, updateHomeworkStatus, respondToReflection, removeHomeworkItem } from "../coachingPhaseSchema.js";
import { createOpportunity, applyOpportunityEdit } from "../opportunitySchema.js";
import { createResource, applyResourceEdit } from "../coachingResourceSchema.js";
import { calculateCoachingProgress } from "../coachingProgress.js";
import { applyDemoMetricFallbacks } from "../demoFallbacks.js";
import { loadNotesForCampaign, addNote } from "../notesStorage.js";
import { loadSummary, saveSummary, approveSummary, normalizeStoredSummaryFormatting } from "../summaryStorage.js";
import { escapeHtml } from "../client/utils.js";
import { generateCanvaExport, downloadCsv } from "./canvaExport.js?v=20260919-live-ui";
import { seedSamplePlacements } from "./seedSampleData.js";
import { seedRealCaseStudyData, backfillAveDataQuality, inventDemoDayGapsForPreview, applyOutletRatesToPreviewPlacements } from "./seedRealCaseStudyData.js";
import { seedGreyzBistroCoachingData } from "./seedGreyzBistroCoachingData.js?v=20260916-polish-2";

// ---------------------------------------------------------------------------
// The owner side. Every getter below reads across ALL clients in mockData —
// that's the one place in this whole build where that's allowed. Nothing
// here is real: no discovery agent found the review-queue rows below, no
// database enforces that only an owner-role session can call these
// functions. `requireSession("owner")` gates the page the same shallow way
// client.html is gated — see src/auth.js for exactly what that does and
// doesn't prove.
// ---------------------------------------------------------------------------

const session = requireSession("owner");

// Local-dev fallback for owner-api's actual listen port (server/owner-api/index.js).
// Becomes a real build-time/env-driven value once real hosting exists — same
// "honest placeholder, not a fake success" posture as everything else here.
// Real owner sessions attach a Supabase Authorization header in ownerApi().
// Mock preview sessions still get an honest 401 from live endpoints instead
// of a fake success.
const OWNER_API_BASE = window.OWNER_API_BASE_URL || "http://localhost:4001";

function shouldUseOwnerApi() {
  return state.dataSource === "real" && Boolean(session?.real);
}

function showDevTools() {
  return new URLSearchParams(location.search).get("dev") === "1";
}

function ownerApiAuthHint() {
  if (state.dataSource !== "real" || shouldUseOwnerApi()) return "";
  // Only name what genuinely still needs a real session. Discovery scans, the
  // AI writing helpers and AVE rate research all work from the preview login
  // now (see ALLOW_LOCAL_DEMO_AUTH in owner-api), so listing them here sent
  // the owner looking for a sign-in that would have changed nothing.
  return `
    <p class="hint" style="margin-bottom:12px;">
      Previewing. Changes you make are kept locally and won't reach the live database, and client invites
      are unavailable — sign in with the live owner account for those. Discovery scans, AI writing and AVE
      rate research all work here.
    </p>
  `;
}

const state = {
  view: "dashboard",
  demoState: "normal", // normal | loading | empty | error
  dataSource: "real", // real | mock — real reads storage.js placements across all clients
  // Defaults to "all" rather than "30d" — most real case-study coverage
  // on file is from 2022, which no rolling 30/90/365-day window could ever
  // show. A narrower default would mean the Dashboard's headline chart
  // opens empty on every fresh session despite the portal holding real,
  // substantial data.
  chartRange: "all",
  campaignsFilter: "all",
  campaignsSearch: "",
  searchTerm: "",
  dashboardMode: "pr", // pr | coaching
  showCoachingOnDashboard: true,
  // Dashboard-only filter: null client = every client aggregated (the
  // original behavior); either date blank = unbounded on that side. Every
  // dashboard section (metrics, recent placements, campaigns, chart) reads
  // through this same filter — see getDashboardPlacements() below — so
  // there's one source of truth for "what does the dashboard mean by
  // 'the data' right now," not five separately-filtered pieces that could
  // drift out of sync with each other.
  dashboardClientFilter: "",
  dashboardDateFrom: "",
  dashboardDateTo: "",
  editingPlacementId: null,
  editingCampaignId: null,
  // Set by ClientsListCard's "Add Campaign" button — pre-fills/locks the
  // Add Campaign form's Client field so a new campaign is never typed by
  // hand and risks not matching the client it was launched from. Cleared
  // once that Add Campaign form is submitted or cancelled.
  addCampaignForClient: "",
  // Set by "View Coaching Program" links (ClientsListCard.js, the
  // Dashboard's master Coaching Program button) — pre-selects that client
  // in the Coaching Program admin view instead of defaulting to whichever
  // enrolled client happens to be first. Read once by renderCoachingView()
  // then cleared, so navigating to Coaching Program normally afterward
  // doesn't keep forcing the selection back.
  coachingSelectedClient: "",
  // Client info form: null = not showing, true = "add new client," or a
  // client name string = editing that client's existing profile.
  editingClient: null,
  // Clients view filter — "all" | "active" | "past". Unconfirmed-status
  // clients (the honest default for a case-study client Tenyse hasn't
  // said is current or closed) only show under "all", never silently
  // bucketed into either — see clientSchema.js's CLIENT_STATUSES comment.
  clientStatusFilter: "all",
  clientCommsPanel: null,
  clientCommsStatus: "idle",
  clientCommsData: null,
  realClientsSync: "idle", // idle | loading | loaded | error
  realClientsSyncMessage: "",
  realRecordsSync: "idle", // idle | loading | loaded | error
  realRecordsSyncMessage: "",
  realCoachingSync: "idle", // idle | loading | loaded | error
  realCoachingSyncMessage: "",
  realCoachingData: null,
  selectedCampaignId: null,
  // Hand-authored candidate mentions previewing the discovery-agent review
  // queue described in the PRD. Confirm/Reject only mutate this in-memory
  // array for the current page load — nothing is persisted.
  reviewQueue: [
    {
      id: "rq1",
      publication: "Eater NY",
      headline: "Where to Find the Best Vegan Soul Food Right Now",
      client: "VeganHood",
      matchedOn: "VeganHood + Harlem",
      discoveredDate: "2026-04-12",
    },
    {
      id: "rq2",
      publication: "Brooklyn Magazine",
      headline: "This Local Soda Brand Is Brooklyn's Next Big Thing",
      client: "Sunny Sparkling Co.",
      matchedOn: "Sunny Sparkling",
      discoveredDate: "2026-04-11",
    },
    {
      id: "rq3",
      publication: "Local Blog Network",
      headline: "Meet the Team Behind a Popular Hair Salon",
      client: "VeganHood",
      matchedOn: '"VeganHood" name-only match, no company context — likely false positive',
      discoveredDate: "2026-04-10",
    },
  ],
};

// ---------------------------------------------------------------------------
// Aggregation across all clients
// ---------------------------------------------------------------------------

function getAllPlacements() {
  if (state.demoState === "empty") return [];
  if (state.dataSource === "real") return getAllRealPlacements();
  return CLIENTS.flatMap((c) => (PLACEMENTS[c.id] || []).map((p) => ({ ...p, clientName: c.name })));
}

function getAllCampaigns() {
  if (state.demoState === "empty") return [];
  if (state.dataSource === "real") return getAllRealCampaigns();
  return CLIENTS.flatMap((c) => (CAMPAIGNS[c.id] || []).map((camp) => ({ ...camp, clientName: c.name })));
}

function getAggregateMetrics() {
  if (state.demoState === "empty") {
    return { totalAVE: 0, totalPlacements: 0, avgLeadTime: 0, activeCampaigns: 0, aveDelta: null, placementsDelta: null, leadTimeDelta: null };
  }
  if (state.dataSource === "real") return applyDemoMetricFallbacks(getAggregateRealMetrics(), { placements: getAllRealPlacements() });
  const perClient = CLIENTS.map((c) => METRICS[c.id]["1y"]);
  const totalAVE = perClient.reduce((sum, m) => sum + (m.totalAVE || 0), 0);
  const totalPlacements = perClient.reduce((sum, m) => sum + (m.totalPlacements || 0), 0);
  const activeCampaigns = perClient.reduce((sum, m) => sum + m.activeCampaigns, 0);
  // Case-study source material did not always report lead time. For Demo Day,
  // applyDemoMetricFallbacks() fills those gaps with sample values after this
  // aggregate preserves whatever real lead-time values do exist.
  const clientsWithLeadTime = perClient.filter((m) => m.avgLeadTime != null);
  const leadTimeWeight = clientsWithLeadTime.reduce((sum, m) => sum + m.totalPlacements, 0);
  const weightedLeadTime = leadTimeWeight
    ? clientsWithLeadTime.reduce((sum, m) => sum + m.avgLeadTime * m.totalPlacements, 0) / leadTimeWeight
    : null;
  const avg = (key) => perClient.reduce((sum, m) => sum + m[key], 0) / perClient.length;
  return applyDemoMetricFallbacks({
    totalAVE,
    totalPlacements,
    avgLeadTime: weightedLeadTime != null ? Math.round(weightedLeadTime) : null,
    activeCampaigns,
    aveDelta: Math.round(avg("aveDelta")),
    placementsDelta: Math.round(avg("placementsDelta")),
    leadTimeDelta: Math.round(avg("leadTimeDelta")),
  }, { placementCount: totalPlacements });
}

function getAggregateChartSeries(range) {
  if (state.demoState === "empty") return [{ label: "—", ave: 0, placements: 0 }];
  if (state.dataSource === "real") return getAggregateRealChartSeries(range);
  const perClientSeries = CLIENTS.map((c) => CHART_SERIES[c.id][range] || []);
  const length = Math.max(0, ...perClientSeries.map((s) => s.length));
  return Array.from({ length }, (_, i) => {
    const label = perClientSeries.find((s) => s[i])?.[i]?.label || `#${i + 1}`;
    const ave = perClientSeries.reduce((sum, s) => sum + (s[i]?.ave || 0), 0);
    const placements = perClientSeries.reduce((sum, s) => sum + (s[i]?.placements || 0), 0);
    return { label, ave, placements };
  });
}

function getAggregateInsight() {
  if (state.demoState === "empty") return null;
  if (state.dataSource === "real") return getAggregateRealInsight();
  return AGGREGATE_INSIGHT;
}

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "Size unavailable";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getClientsWithMetrics() {
  if (state.demoState === "empty") return [];
  if (state.dataSource === "real") {
    return getRealClients().map((c) => ({
      ...c,
      metrics: getRealMetrics(c.name),
      campaignNames: getRealCampaigns(c.name).map((camp) => camp.name),
    }));
  }
  return CLIENTS.map((c) => ({
    ...c,
    metrics: METRICS[c.id]["1y"],
    campaignNames: (CAMPAIGNS[c.id] || []).map((camp) => camp.name),
  }));
}

function filterPlacements(placements, term) {
  if (!term) return placements;
  const t = term.toLowerCase();
  return placements.filter(
    (p) =>
      (p.publication || "").toLowerCase().includes(t) ||
      (p.headline || "").toLowerCase().includes(t) ||
      (p.campaign || "").toLowerCase().includes(t) ||
      (p.clientName || "").toLowerCase().includes(t)
  );
}

// ---------------------------------------------------------------------------
// Dashboard client/date filter — single source of truth for every
// dashboard section (metrics, recent placements, campaigns, chart). Date
// bounds match Canva export's own withinRange() semantics exactly (string
// comparison on ISO dates, inclusive, unbounded when blank) — same
// definition of "within a date range" everywhere in this app, not a
// second slightly-different one invented for this screen.
// ---------------------------------------------------------------------------

function isDashboardFilterActive() {
  return Boolean(state.dashboardClientFilter || state.dashboardDateFrom || state.dashboardDateTo);
}

function withinDashboardDateRange(dateStr) {
  const { dashboardDateFrom, dashboardDateTo } = state;
  if (!dashboardDateFrom && !dashboardDateTo) return true;
  if (!dateStr) return false;
  if (dashboardDateFrom && dateStr < dashboardDateFrom) return false;
  if (dashboardDateTo && dateStr > dashboardDateTo) return false;
  return true;
}

/** Every placement matching the current dashboard client/date filter — the one filtered set every section below reads from. */
function getDashboardPlacements() {
  return getAllPlacements().filter((p) => {
    if (state.dashboardClientFilter && p.clientName !== state.dashboardClientFilter) return false;
    return withinDashboardDateRange(p.publicationDate);
  });
}

/**
 * Computes the same four metrics as getRealMetrics()/getAggregateMetrics()
 * — confirmed-only AVE, raw placement count, null-safe avg lead time — but
 * from an arbitrary already-filtered placement list instead of one
 * client's full history or a fixed 30d/90d/1y bucket. Kept as a separate
 * function rather than bolting date-range support onto those two: they're
 * real/mock-data-source-aware and bucket-shaped for other call sites
 * (client dashboards, owner aggregate cards elsewhere) that this filter
 * shouldn't change the behavior of.
 */
function computeFilteredMetrics(placements) {
  const confirmed = placements.filter((p) => Boolean(p.landedDate));
  const withAve = confirmed.filter((p) => p.aveValue != null);
  const totalAVE = withAve.length ? withAve.reduce((sum, p) => sum + p.aveValue, 0) : null;
  const leadTimes = placements.map(leadTimeDaysForPlacement).filter((lt) => lt != null);
  const avgLeadTime = leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;

  const activeCampaigns = getAllCampaigns().filter((c) => {
    if (state.dashboardClientFilter && c.clientName !== state.dashboardClientFilter) return false;
    return c.status === "active";
  }).length;

  return applyDemoMetricFallbacks({
    totalAVE,
    totalPlacements: placements.length,
    avgLeadTime,
    activeCampaigns,
    // No meaningful "vs last period" comparison exists for an arbitrary,
    // owner-chosen date range — there's no fixed prior period to diff
    // against, so these stay null (MetricCard already skips the delta
    // line when null) rather than comparing against something arbitrary.
    aveDelta: null,
    placementsDelta: null,
    leadTimeDelta: null,
  }, { placements });
}

/** Real placements grouped by publication month — no invented weekly/quarterly buckets, just what actually happened. */
function groupPlacementsByMonth(placements) {
  const byMonth = new Map();
  for (const p of placements) {
    if (!p.publicationDate) continue;
    const label = p.publicationDate.slice(0, 7); // YYYY-MM
    if (!byMonth.has(label)) byMonth.set(label, { label, ave: 0, placements: 0 });
    const bucket = byMonth.get(label);
    bucket.ave += p.landedDate ? p.aveValue || 0 : 0;
    bucket.placements += 1;
  }
  return [...byMonth.values()].sort((a, b) => (a.label < b.label ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Dashboard (overview) view
// ---------------------------------------------------------------------------

function dashboardSkeletonHTML() {
  return `
    <section class="section owner-dashboard-section">
      <div class="owner-dashboard-control-card" id="dashboard-filter-bar"></div>
      <p id="dashboard-filter-summary" class="hint" style="margin:8px 0 0;"></p>
    </section>
    <section class="section owner-dashboard-section">
      <div class="metrics-grid" id="dashboard-metrics"></div>
    </section>
    <section class="section owner-dashboard-section owner-rollup-section">
      <div id="dashboard-rollup-strip"></div>
    </section>
    <div class="owner-dashboard-split">
      <section class="section" style="margin-bottom:0;">
        <div class="owner-panel-card">
          <div class="section-heading">
            <h2 id="dashboard-primary-title">Recent Press Placements</h2>
            ${sectionInfoButton({ title: "Recent Press Placements", body: "The four most recently dated placements across every visible client, newest first. Switch to Coaching Program view mode above to see coaching activity here instead — this panel shows one or the other, not both at once." })}
            <button class="link-btn" id="dashboard-primary-action" data-goto="placements">View All</button>
          </div>
          <div id="dashboard-placements"></div>
        </div>
      </section>
      <section class="section" id="dashboard-coaching-overview" style="margin-bottom:0;"></section>
    </div>
    <div class="dashboard-split owner-analysis-grid">
      <section class="section" style="margin-bottom:0;">
        <div class="owner-analysis-card">
          <div class="section-heading">
            <h2>Campaign Progress</h2>
            ${sectionInfoButton({ title: "Campaign Progress", body: "Every real campaign across all visible clients, most recent first. Status is one of the three this app tracks (active, paused, completed) — see the full Campaigns page for filtering, search, and per-campaign publicity value." })}
            <button class="link-btn" data-goto="campaigns">View All</button>
          </div>
          <div class="campaigns-grid dashboard-campaigns-grid" id="dashboard-campaigns"></div>
        </div>
      </section>
      <section class="section" style="margin-bottom:0;">
        <div class="card chart-card" id="dashboard-chart"></div>
      </section>
    </div>
    <section class="section" id="dashboard-insight-wrap"></section>
    <section class="section">
      <div class="section-heading">
        <h2>Reports</h2>
        <button class="link-btn" data-goto="reports">View All</button>
      </div>
      <div id="dashboard-reports-summary"></div>
    </section>
  `;
}

function ownerMetricCard({ label, value, note, icon, iconBg, tooltip, target, actionLabel }) {
  const interactiveClass = target ? " is-interactive" : "";
  const interactionAttrs = target ? ` role="button" tabindex="0" data-metric-goto="${escapeHtml(target)}"` : "";
  return `
    <div class="card metric-card owner-metric-card${interactiveClass}"${interactionAttrs}>
      <div class="metric-top">
        <span class="metric-label">${escapeHtml(label)}${tooltip ? ` <span class="info-icon metric-info-icon" aria-hidden="true">i</span>` : ""}</span>
        <span class="metric-icon" style="background:${iconBg}">${icon}</span>
      </div>
      <p class="metric-value">${escapeHtml(String(value))}</p>
      ${note ? `<p class="metric-delta positive">${escapeHtml(note)}</p>` : ""}
      ${
        tooltip
          ? `<div class="metric-hover-panel" role="tooltip">
        <strong>${escapeHtml(label)}</strong>
        <p>${escapeHtml(tooltip)}</p>
        ${actionLabel ? `<span>${escapeHtml(actionLabel)}</span>` : ""}
      </div>`
          : ""
      }
    </div>
  `;
}

function formatCompactCurrency(value) {
  if (value == null || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  return formatCurrency(value);
}

function getCoachingClients() {
  if (state.dataSource !== "real") return [];
  return getClientsWithMetrics()
    .map((c) => c.profile || c)
    .filter((profile) => profile && (profile.engagementType === "coaching" || profile.engagementType === "pr_and_coaching"));
}

function getCoachingOverviewRows() {
  const apiCoaching = shouldUseOwnerApi() ? state.realCoachingData : null;
  return getCoachingClients().map((client) => {
    const clientData = apiCoaching ? coachingDataForClient(client.name) : null;
    const phases = clientData?.phases || loadPhasesForClient(client.name);
    const resources = clientData?.resources || loadResourcesForClient(client.name);
    const opportunities = clientData?.opportunities || loadOpportunitiesForClient(client.name);
    const progress = calculateCoachingProgress({ phases, resources, opportunities });
    const nextPhase = [...phases].reverse().find((phase) => phase.status === "in_progress") || phases.find((phase) => phase.status !== "complete") || phases[phases.length - 1];
    const reachedPhases = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    const roadmapPercent = phases.length ? Math.round((reachedPhases / phases.length) * 100) : 0;
    const program = phases.some((phase) => phase.vaam === "NOT_APPLICABLE")
      ? "Raise Local structure"
      : phases.length
        ? "Visibility to Revenue"
        : client.engagementType === "pr_and_coaching"
          ? "PR + Coaching"
          : "Coaching Program";
    return {
      client: client.name,
      program,
      progress: progress.phases.total ? roadmapPercent : Math.max(progress.homework.percent, progress.checklist.percent),
      nextMilestone: nextPhase ? `${nextPhase.name}${nextPhase.phaseNumber ? ` (Phase ${nextPhase.phaseNumber})` : ""}` : "Set first phase",
      nextCall: "Schedule needed",
    };
  });
}

function getDashboardCoachingRows() {
  const rows = getCoachingOverviewRows();
  if (!state.dashboardClientFilter) return rows;
  return rows.filter((row) => row.client === state.dashboardClientFilter);
}

function renderDashboardCoachingState(container, rows) {
  const clientName = state.dashboardClientFilter;
  if (!rows.length) {
    container.innerHTML = `
      <div class="state-panel compact">
        <h3>${clientName ? `No coaching program for ${escapeHtml(clientName)}` : "No coaching programs yet"}</h3>
        <p>${
          clientName
            ? "This client has no coaching enrollment or phase data yet. Set the client's engagement type to Coaching or PR + Coaching, then add phases in the Coaching Program hub."
            : "Set a client's engagement type to Coaching or PR + Coaching, then add phases in the Coaching Program hub."
        }</p>
        <button type="button" class="btn-secondary" data-goto="coaching">Go to Coaching Hub</button>
      </div>
    `;
    return;
  }

  const selected = rows[0];
  const clientData = coachingDataForClient(selected.client);
  const phases = clientData.phases?.length ? clientData.phases : loadPhasesForClient(selected.client);
  const resources = clientData.resources?.length ? clientData.resources : loadResourcesForClient(selected.client);
  const opportunities = clientData.opportunities?.length ? clientData.opportunities : loadOpportunitiesForClient(selected.client);
  const progress = calculateCoachingProgress({ phases, resources, opportunities });
  const nextPhase = [...phases].reverse().find((phase) => phase.status === "in_progress") || phases.find((phase) => phase.status !== "complete") || phases[0];
  const homework = phases.flatMap((phase) =>
    (phase.homework || []).map((item) => ({ ...item, phaseName: phase.name, phaseNumber: phase.phaseNumber }))
  );
  const openHomework = homework.filter((item) => item.type !== "standing" && item.status !== "complete").slice(0, 4);
  const checklist = resources.filter((item) => item.kind === "checklist");
  const uniqueByTitle = (items) => [...new Map(items.map((item) => [item.title, item])).values()];
  const missingAssets = uniqueByTitle(checklist.filter((item) => !item.completed)).slice(0, 4);
  const quickResources = uniqueByTitle(resources.filter((item) => item.kind === "resource")).slice(0, 4);
  const featuredOpportunity = opportunities.find((item) => item.decisionStatus === "pursuing") || opportunities[0];
  const opportunityScores = featuredOpportunity?.scores || {};
  const scoreEntries = Object.entries(opportunityScores).slice(0, 4);
  const scoreValues = Object.values(opportunityScores).filter((value) => Number.isFinite(Number(value))).map(Number);
  const averageScore = scoreValues.length ? (scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(1) : null;
  const programPercent = selected.progress || progress.phases.percent || progress.homework.percent || 0;

  container.innerHTML = `
    <div class="owner-coaching-detail-grid">
      <article class="owner-coaching-detail-card wide">
        <div class="section-heading">
          <div>
            <h3>${escapeHtml(selected.client)}</h3>
            <p>${escapeHtml(selected.program)} · ${programPercent}% complete</p>
          </div>
          <button type="button" class="btn-secondary" data-coaching-client="${escapeHtml(selected.client)}">Manage</button>
        </div>
        <div class="roadmap-overall">
          <span>Overall Progress</span>
          <strong>${programPercent}%</strong>
          <div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${programPercent}%;"></div></div>
        </div>
        ${
          phases.length
            ? `<div class="roadmap-steps compact-roadmap">
          ${phases
            .map(
              (phase) => `
            <div class="roadmap-step ${escapeHtml(phase.status)}">
              <span class="roadmap-node">${phase.status === "complete" ? "✓" : phase.phaseNumber}</span>
              <strong>${escapeHtml(String(phase.phaseNumber || ""))}</strong>
              <small>${escapeHtml(phase.name)}</small>
              ${phase.weeks ? `<em>${escapeHtml(phase.weeks)}</em>` : ""}
            </div>`
            )
            .join("")}
        </div>`
            : `<div class="state-panel compact"><h3>No phases loaded</h3><p>Load a program template or add phases in the Coaching Program hub.</p></div>`
        }
        <div class="client-card-footer">
          <p><strong>Next milestone:</strong> ${escapeHtml(selected.nextMilestone || nextPhase?.name || "Set first phase")}</p>
          <button type="button" class="link-btn" data-goto="coaching">Open hub</button>
        </div>
      </article>

      <article class="owner-coaching-detail-card">
        <div class="section-heading"><h3>Homework & Action Items</h3></div>
        ${
          openHomework.length
            ? `<div class="homework-list">
          ${openHomework
            .map(
              (item) => `
            <div class="homework-item">
              <input type="checkbox" disabled ${item.status === "complete" ? "checked" : ""} />
              <div>
                <strong>${escapeHtml(item.text)}</strong>
                <small>Phase ${escapeHtml(String(item.phaseNumber || ""))}${item.dueDate ? ` · Due ${escapeHtml(item.dueDate)}` : ""}</small>
              </div>
              <span class="client-status-badge ${item.status === "complete" ? "success" : "medium"}">${escapeHtml(item.status === "complete" ? "Done" : "Open")}</span>
            </div>`
            )
            .join("")}
        </div>`
            : `<div class="state-panel compact"><h3>No open homework</h3><p>Assigned action items and reflections will appear here.</p></div>`
        }
      </article>

      <article class="owner-coaching-detail-card">
        <div class="section-heading"><h3>Opportunity Scorecard</h3></div>
        ${
          featuredOpportunity
            ? `<p class="hint" style="margin-top:0;">${escapeHtml(featuredOpportunity.title)}</p>
        <div class="scorecard-rows">
          ${scoreEntries
            .map(
              ([label, score]) => `
            <div>
              <span>${escapeHtml(label.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()))}</span>
              <span class="stars">${"★".repeat(Number(score) || 0)}${"☆".repeat(Math.max(0, 5 - (Number(score) || 0)))}</span>
            </div>`
            )
            .join("")}
        </div>
        <div class="scorecard-summary">
          <span>Overall Score</span>
          <strong>${averageScore || "—"} / 5</strong>
          <small>${escapeHtml(selected.client)}</small>
        </div>`
            : `<div class="state-panel compact"><h3>No opportunities logged</h3><p>Partnership or visibility opportunities will appear here after they are added.</p></div>`
        }
      </article>

      <article class="owner-coaching-detail-card">
        <div class="section-heading"><h3>Resources & Checklist</h3></div>
        ${
          missingAssets.length
            ? `<p class="hint" style="margin-top:0;">Missing assets</p><div class="quick-resource-list">
          ${missingAssets.map((item) => `<div><span>□</span><span>${escapeHtml(item.title)}</span></div>`).join("")}
        </div>`
            : `<p class="hint" style="margin-top:0;">No missing checklist items.</p>`
        }
        ${
          quickResources.length
            ? `<p class="hint" style="margin:12px 0 6px;">Quick resources</p><div class="quick-resource-list">
          ${quickResources.map((item) => `<div><span>▤</span><span>${escapeHtml(item.title)}</span></div>`).join("")}
        </div>`
            : ""
        }
      </article>
    </div>
  `;

  container.querySelectorAll("[data-coaching-client]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.coachingSelectedClient = btn.dataset.coachingClient;
      navigate("coaching");
    });
  });
}

function renderOwnerMetrics(container, metrics) {
  const coachingCount = getCoachingClients().length;
  const aveNote = metrics.aveDelta != null ? `${metrics.aveDelta > 0 ? "+" : ""}${metrics.aveDelta}% vs prior period` : "Confirmed placements only";
  container.innerHTML = `
    ${ownerMetricCard({
      label: "Total Publicity Value (AVE)",
      value: formatCompactCurrency(metrics.totalAVE),
      note: aveNote,
      icon: "$",
      iconBg: "#fbe2da",
      tooltip: "Estimated equivalent paid-media value from confirmed and demo-ready placements. This is the headline value story Tenyse can turn into a client report.",
      target: "reports",
      actionLabel: "Open report builder",
    })}
    ${ownerMetricCard({
      label: "Total Press Placements",
      value: metrics.totalPlacements != null ? metrics.totalPlacements : "—",
      note: metrics.placementsDelta != null ? `${metrics.placementsDelta > 0 ? "+" : ""}${metrics.placementsDelta} vs prior period` : "Across visible clients",
      icon: "▦",
      iconBg: "#e1f2f0",
      tooltip: "Confirmed coverage wins across the visible clients. These placements feed campaign value, client reports, and the review workflow.",
      target: "placements",
      actionLabel: "Review placements",
    })}
    ${ownerMetricCard({
      label: "Avg. Lead Time",
      value: metrics.avgLeadTime != null ? `${metrics.avgLeadTime} days` : "—",
      note: metrics.leadTimeDelta != null ? `${metrics.leadTimeDelta < 0 ? "" : "+"}${metrics.leadTimeDelta} days vs prior period` : "Demo lead-time model",
      icon: "◷",
      iconBg: "#fdf0d8",
      tooltip: "Average days from pitch activity to landed coverage. For demo day this uses the seeded lead-time model while Google Workspace is on hold.",
      target: "analytics",
      actionLabel: "Explore analytics",
    })}
    ${ownerMetricCard({
      label: "Active Campaigns (PR)",
      value: metrics.activeCampaigns,
      note: "Active",
      icon: "□",
      iconBg: "#efe9f5",
      tooltip: "PR campaigns currently in motion. Campaign detail pages show proof points, value, client update drafts, and outreach angles.",
      target: "campaigns",
      actionLabel: "Open campaigns",
    })}
    ${ownerMetricCard({
      label: "Active Coaching Programs",
      value: coachingCount,
      note: coachingCount === 1 ? "Client enrolled" : "Clients enrolled",
      icon: "◎",
      iconBg: "#e9ecff",
      tooltip: "Coaching programs tied to clients after visibility lands. This keeps roadmap phases, homework, resources, and opportunities in one place.",
      target: "coaching",
      actionLabel: "Open coaching hub",
    })}
  `;
  wireMetricCardNavigation(container);
}

function wireMetricCardNavigation(container) {
  container.querySelectorAll("[data-metric-goto]").forEach((card) => {
    const openTarget = () => navigate(card.dataset.metricGoto);
    card.addEventListener("click", openTarget);
    card.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openTarget();
    });
  });
}

function renderCompactPlacementsTable(container, placements) {
  if (!placements.length) {
    container.innerHTML = `<div class="state-panel compact"><h3>No recent placements</h3><p>Add or confirm placements to populate this dashboard table.</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="table-scroll">
      <table class="placements-table compact-table">
        <thead>
          <tr>
            <th>Outlet</th>
            <th>Headline</th>
            <th>Campaign</th>
            <th>Date</th>
            <th>AVE</th>
          </tr>
        </thead>
        <tbody>
          ${placements
            .map(
              (p) => `
            <tr>
              <td><strong>${escapeHtml(p.publication || "—")}</strong></td>
              <td>${p.articleUrl ? `<a href="${escapeHtml(p.articleUrl)}" target="_blank" rel="noopener">${escapeHtml(p.headline)}</a>` : escapeHtml(p.headline || "—")}</td>
              <td>${escapeHtml(p.campaign || p.clientName || "—")}</td>
              <td>${escapeHtml(p.publicationDate || "—")}</td>
              <td>${formatCurrency(p.aveValue)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCoachingOverview(container) {
  if (!state.showCoachingOnDashboard) {
    container.innerHTML = "";
    return;
  }
  const rows = getCoachingOverviewRows();
  container.innerHTML = `
    <div class="owner-panel-card">
      <div class="section-heading">
        <h2>Coaching Program Overview</h2>
        <button class="link-btn" data-goto="coaching">View All</button>
      </div>
      ${
        rows.length
          ? `<div class="table-scroll">
        <table class="placements-table compact-table coaching-overview-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Program</th>
              <th>Progress</th>
              <th>Next Milestone</th>
              <th>Next Call</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                <td><strong>${escapeHtml(row.client)}</strong></td>
                <td>${escapeHtml(row.program)}</td>
                <td>
                  <span class="progress-cell"><span>${row.progress}%</span><span class="mini-progress"><span style="width:${row.progress}%;"></span></span></span>
                </td>
                <td>${escapeHtml(row.nextMilestone)}</td>
                <td>${escapeHtml(row.nextCall)}</td>
                <td><button type="button" class="link-btn" data-coaching-client="${escapeHtml(row.client)}">›</button></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
          : `<div class="state-panel compact"><h3>No coaching programs yet</h3><p>Set a client's engagement type to Coaching or PR + Coaching to show program progress here.</p></div>`
      }
    </div>
  `;

  container.querySelectorAll("[data-coaching-client]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.coachingSelectedClient = btn.dataset.coachingClient;
      navigate("coaching");
    });
  });
}

function renderDashboardRollup(container, metrics) {
  const clients = getClientsWithMetrics();
  const activePrCampaigns = getAllCampaigns().filter((campaign) => campaign.status === "active").length;
  const coachingCount = getCoachingClients().length;
  container.innerHTML = `
    <div class="owner-rollup-strip">
      <div class="owner-rollup-item">
        <span class="owner-rollup-icon">◎</span>
        <span><small>Clients</small><strong>${clients.length}</strong></span>
      </div>
      <div class="owner-rollup-item">
        <span class="owner-rollup-icon">□</span>
        <span><small>PR Campaigns</small><strong>${activePrCampaigns}</strong></span>
      </div>
      <div class="owner-rollup-item">
        <span class="owner-rollup-icon">◎</span>
        <span><small>Coaching Programs</small><strong>${coachingCount}</strong></span>
      </div>
      <div class="owner-rollup-item wide">
        <span><small>Total Revenue Impact Est. ${sectionInfoButton({ title: "Total Revenue Impact Est. (AVE)", body: "AVE — advertising value equivalent — estimates what confirmed press coverage would have cost as paid advertising. There is no industry standard for this figure (see the AVE agent's own docs); this build shows a range from two published formulas rather than a single confident number, and any figure resting on an estimate rather than a sourced audience number is flagged on the placement itself. Only counts placements with a landed date — pitched-but-not-yet-published coverage doesn't count toward this total." })}</small><strong>${formatCompactCurrency(metrics.totalAVE)}</strong><em>YTD (AVE)</em></span>
      </div>
    </div>
  `;
}

/**
 * Master shortcut into the Coaching Program admin view, front and center
 * on the Dashboard rather than only reachable via the sidebar — same idea
 * as the client-side PR/Coaching toggle, mirrored for the owner: a fast
 * way to jump into "the whole coaching side of the business" without
 * hunting for a specific client first. Mock dataSource has no coaching
 * concept (see ClientSidebar.js's matching comment) so this hides itself
 * entirely rather than pointing at data that isn't real.
 */
function renderCoachingBanner(container) {
  if (state.dataSource !== "real") {
    container.innerHTML = "";
    return;
  }
  const coachingClients = getClientsWithMetrics()
    .map((c) => c.profile)
    .filter((profile) => profile && (profile.engagementType === "coaching" || profile.engagementType === "pr_and_coaching"));

  container.innerHTML = `
    <div class="card" style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; border-color:var(--color-teal);">
      <div>
        <p style="margin:0 0 2px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--color-teal);">Coaching Program</p>
        <p style="margin:0; font-size:0.92rem;">
          ${
            coachingClients.length === 0
              ? "No clients enrolled yet — set a client's Engagement Type to Coaching under Clients → Edit Info to enroll them."
              : `${coachingClients.length} client${coachingClients.length === 1 ? "" : "s"} enrolled — Phase Tracker, Opportunity Evaluator, and Resource Library.`
          }
        </p>
      </div>
      <button type="button" class="btn-primary" id="dashboard-open-coaching" style="background:var(--color-teal); flex-shrink:0;">Open Coaching Program →</button>
    </div>
  `;

  document.getElementById("dashboard-open-coaching").addEventListener("click", () => navigate("coaching"));
}

/**
 * Client dropdown + date-range inputs that drive getDashboardPlacements()
 * above. Every control re-renders the whole dashboard on change rather
 * than trying to patch individual sections — this view has five sections
 * reading the same filtered set, and keeping them in sync piecemeal is a
 * worse bet than one cheap full re-render.
 */
function renderDashboardFilterBar(container) {
  container.innerHTML = `
    <div class="owner-control-block">
      <span class="control-label">View Mode</span>
      <div class="owner-segmented-control" role="tablist" aria-label="Dashboard view mode">
        <button type="button" class="${state.dashboardMode === "pr" ? "active" : ""}" data-dashboard-mode="pr">PR Reporting</button>
        <button type="button" class="${state.dashboardMode === "coaching" ? "active" : ""}" data-dashboard-mode="coaching">Coaching Program</button>
      </div>
    </div>
    <div class="owner-control-block">
      <span class="control-label">Time Range</span>
      <div class="owner-date-range">
        <span aria-hidden="true">▣</span>
        <input type="date" id="dashboard-filter-from" value="${escapeHtml(state.dashboardDateFrom)}" aria-label="From date" />
        <span aria-hidden="true">–</span>
        <input type="date" id="dashboard-filter-to" value="${escapeHtml(state.dashboardDateTo)}" aria-label="To date" />
      </div>
    </div>
    <div class="owner-control-block coaching-module-control">
      <span class="control-label">Coaching Module</span>
      <label class="switch-row">
        <input type="checkbox" id="dashboard-coaching-toggle" ${state.showCoachingOnDashboard ? "checked" : ""} />
        <span class="toggle-switch" aria-hidden="true"></span>
        <span>Show coaching overview on dashboard</span>
      </label>
      <button type="button" class="btn-secondary" id="dashboard-open-coaching">Go to Coaching Hub</button>
    </div>
    ${isDashboardFilterActive() ? `<button type="button" class="btn-secondary" id="dashboard-filter-clear">Clear filter</button>` : ""}
  `;

  container.querySelectorAll("[data-dashboard-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.dashboardMode = btn.dataset.dashboardMode;
      renderDashboard();
    });
  });
  container.querySelector("#dashboard-filter-from").addEventListener("change", (e) => {
    state.dashboardDateFrom = e.target.value;
    renderDashboard();
  });
  container.querySelector("#dashboard-filter-to").addEventListener("change", (e) => {
    state.dashboardDateTo = e.target.value;
    renderDashboard();
  });
  container.querySelector("#dashboard-coaching-toggle").addEventListener("change", (e) => {
    state.showCoachingOnDashboard = e.target.checked;
    renderDashboard();
  });
  container.querySelector("#dashboard-open-coaching").addEventListener("click", () => navigate("coaching"));
  const clearBtn = container.querySelector("#dashboard-filter-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.dashboardClientFilter = "";
      state.dashboardDateFrom = "";
      state.dashboardDateTo = "";
      renderDashboard();
    });
  }
}

function renderDashboard() {
  const target = document.getElementById("dashboard-content");
  syncOwnerRecordsFromSupabase();
  syncOwnerCoachingFromSupabase();
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") {
    return renderErrorState(target, {
      message: "We had trouble loading data across your clients. Please try again in a moment.",
      onRetry: () => setDemoState("normal"),
    });
  }

  target.innerHTML = dashboardSkeletonHTML();

  renderDashboardFilterBar(document.getElementById("dashboard-filter-bar"));

  const filterActive = isDashboardFilterActive();
  const filteredPlacements = getDashboardPlacements();
  const metrics = filterActive ? computeFilteredMetrics(filteredPlacements) : getAggregateMetrics();

  renderOwnerMetrics(document.getElementById("dashboard-metrics"), metrics);

  const filterSummaryEl = document.getElementById("dashboard-filter-summary");
  const coachingRows = getDashboardCoachingRows();
  filterSummaryEl.textContent =
    state.dashboardMode === "coaching"
      ? `Showing ${state.dashboardClientFilter || "all coaching clients"}${state.dashboardDateFrom || state.dashboardDateTo ? " — date range does not apply to coaching program setup yet" : ""} — ${coachingRows.length} coaching program${coachingRows.length === 1 ? "" : "s"} match.`
      : filterActive
        ? `Showing ${state.dashboardClientFilter || "all clients"}${state.dashboardDateFrom || state.dashboardDateTo ? `, ${state.dashboardDateFrom || "any date"} to ${state.dashboardDateTo || "any date"}` : ""} — ${filteredPlacements.length} placement${filteredPlacements.length === 1 ? "" : "s"} match.`
        : "";

  const basePlacements = filterActive ? filteredPlacements : getAllPlacements();
  const recentPlacements = filterPlacements(basePlacements, state.searchTerm)
    .slice()
    .sort((a, b) => (a.publicationDate < b.publicationDate ? 1 : -1))
    .slice(0, 4);
  const primaryTitle = document.getElementById("dashboard-primary-title");
  const primaryAction = document.getElementById("dashboard-primary-action");
  if (state.dashboardMode === "coaching") {
    primaryTitle.textContent = "Coaching Program";
    primaryAction.textContent = "Go to Coaching Hub";
    primaryAction.dataset.goto = "coaching";
    renderDashboardCoachingState(document.getElementById("dashboard-placements"), coachingRows);
  } else {
    primaryTitle.textContent = "Recent Press Placements";
    primaryAction.textContent = "View All";
    primaryAction.dataset.goto = "placements";
    renderCompactPlacementsTable(document.getElementById("dashboard-placements"), recentPlacements);
  }
  renderCoachingOverview(document.getElementById("dashboard-coaching-overview"));
  renderDashboardRollup(document.getElementById("dashboard-rollup-strip"), metrics);

  const filteredCampaigns = state.dashboardClientFilter
    ? getAllCampaigns().filter((c) => c.clientName === state.dashboardClientFilter)
    : getAllCampaigns();
  renderCampaignsGrid(document.getElementById("dashboard-campaigns"), filteredCampaigns, {
    onViewCampaign: () => navigate("campaigns"),
  });

  // A client/date filter replaces the 30d/90d/1y preset chart entirely
  // with an honest month-by-month breakdown of exactly what's in the
  // filtered set — those presets are aggregate-shaped and don't have a
  // meaningful reading once the underlying data is a client- or
  // date-bounded subset.
  if (filterActive) {
    renderPerformanceChart(document.getElementById("dashboard-chart"), {
      series: groupPlacementsByMonth(filteredPlacements).length ? groupPlacementsByMonth(filteredPlacements) : [{ label: "No dates in range", ave: 0, placements: 0 }],
      range: null,
      onRangeChange: () => {},
      rangeLabel: "By month (filtered)",
    });
  } else {
    renderPerformanceChart(document.getElementById("dashboard-chart"), {
      series: getAggregateChartSeries(state.chartRange),
      range: state.chartRange,
      onRangeChange: (range) => {
        state.chartRange = range;
        renderDashboard();
      },
    });
  }

  // The aggregate insight text is written for "across all clients" and
  // doesn't have a meaningful equivalent for an arbitrary filtered slice —
  // hide it rather than show real narrative copy next to data it wasn't
  // describing, per the same "never let a real-sounding label attach to
  // data it doesn't actually match" rule this build applies everywhere.
  if (filterActive) {
    document.getElementById("dashboard-insight-wrap").innerHTML = "";
  } else {
    renderInsightCard(document.getElementById("dashboard-insight-wrap"), getAggregateInsight());
  }

  // Was hardcoded to the mock CLIENTS array's length regardless of data
  // source — harmless-looking in mock mode (matches by coincidence) but
  // wrong the moment real client count differs, which it always will.
  const reportCount = state.demoState === "empty" ? 0 : state.dataSource === "real" ? getRealClients().length : CLIENTS.length;
  document.getElementById("dashboard-reports-summary").innerHTML = `
    <div class="card">
      <p style="margin:0;">${reportCount} client report${reportCount === 1 ? "" : "s"} available.
        <button class="link-btn" data-goto="reports">View All Reports</button>
      </p>
    </div>
  `;

  target.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.goto));
  });
}

// ---------------------------------------------------------------------------
// Other views
// ---------------------------------------------------------------------------

/**
 * POSTs to owner-api's invite route. Real clients only — mock demo clients
 * have no Supabase-side row to invite, so ClientsListCard is told to hide
 * the button entirely in that mode (see renderClientsView below) rather
 * than let this get called with a fake id.
 */
/**
 * Content-Type plus a real Authorization: Bearer header when a real
 * Supabase session exists (see src/supabaseAuthClient.js) — owner-api's
 * requireOwner() needs a real JWT, not this app's mock localStorage
 * session, to ever return anything other than 401. Omitting the header
 * entirely (rather than sending a fake/empty one) when no real session
 * exists is the honest failure mode: a normal 401, not a confusing 400.
 */
async function authedJsonHeaders() {
  const token = await getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Headers for a route that also accepts the local demo session. Identical
 * to authedJsonHeaders() when really signed in; adds the demo marker only
 * when there's no token to send.
 *
 * The server ignores that marker unless ALLOW_LOCAL_DEMO_AUTH is on AND
 * the request looks local, so this is a request to be let in, not a
 * credential — sending it from a deployed page achieves nothing.
 */
async function demoCapableJsonHeaders() {
  const headers = await authedJsonHeaders();
  if (!headers.Authorization) headers["X-VC-Demo-AI"] = "true";
  return headers;
}

/**
 * Every "real" client the owner UI knows about (getClientsWithMetrics(),
 * getRealClients()) is keyed by a slug generated from placement.client text
 * — localStorage never had a reason to know Supabase's real clients.id
 * (uuid). Any route that takes a clientId owner-api can actually look up
 * (invite, discovery-scan) needs that real uuid, not the local slug — this
 * resolves one by name against owner-api's real clients table. Returns
 * `{ ok: false }` with an honest message rather than guessing when there's
 * no matching row yet (e.g. Supabase not configured, or this client was
 * never created there).
 */
async function resolveRealClientId(clientName) {
  try {
    // Demo-capable, not authedJsonHeaders() — this lookup is a read-only
    // stepping stone that discovery-scan (already demo-capable) depends on.
    // Gating it more strictly than the action it feeds made Scan for
    // Mentions unreachable in preview mode even though the server intended
    // it to work there.
    const res = await fetch(`${OWNER_API_BASE}/api/clients`, { headers: await demoCapableJsonHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: body.message || "Client records are not available in this preview." };
    }
    const match = (Array.isArray(body) ? body : []).find((c) => c.name === clientName);
    if (!match) {
      return { ok: false, message: `${clientName} is ready for the demo preview; add the live client record before sending real invites.` };
    }
    return { ok: true, id: match.id };
  } catch (err) {
    return { ok: false, message: "Live client tools are unavailable in this preview." };
  }
}

async function saveRealClient({ raw, existingRecord }) {
  const method = existingRecord ? "PATCH" : "POST";
  let clientId = existingRecord?.id;
  if (existingRecord) {
    const resolved = await resolveRealClientId(existingRecord.name);
    if (resolved.ok) clientId = resolved.id;
  }
  const url = existingRecord ? `${OWNER_API_BASE}/api/clients/${encodeURIComponent(clientId)}` : `${OWNER_API_BASE}/api/clients`;

  const res = await fetch(url, {
    method,
    headers: await authedJsonHeaders(),
    body: JSON.stringify(raw),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `Couldn't save client in Supabase (${res.status}).`);
  }
  return body;
}

async function syncRealClientsFromSupabase() {
  if (!shouldUseOwnerApi() || state.realClientsSync === "loading" || state.realClientsSync === "loaded") return;
  state.realClientsSync = "loading";
  state.realClientsSyncMessage = "";
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/clients`, { headers: await authedJsonHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.message || `Couldn't load Supabase clients (${res.status}).`);
    }
    (Array.isArray(body) ? body : []).forEach((client) => upsertClientByName(createClient(client)));
    state.realClientsSync = "loaded";
    if (state.view === "clients") renderClientsView();
  } catch (err) {
    state.realClientsSync = "error";
    state.realClientsSyncMessage = err.message;
    if (state.view === "clients") renderClientsView();
  }
}

async function ownerApi(path, options = {}) {
  const res = await fetch(`${OWNER_API_BASE}${path}`, {
    ...options,
    headers: { ...(await authedJsonHeaders()), ...(options.headers || {}) },
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `Owner API request failed (${res.status}).`);
  }
  return body;
}

async function syncOwnerRecordsFromSupabase({ force = false } = {}) {
  if (!shouldUseOwnerApi()) return;
  if (state.realRecordsSync === "loading") return;
  if (!force && ["loaded", "error"].includes(state.realRecordsSync)) return;

  state.realRecordsSync = "loading";
  try {
    const [campaigns, placements] = await Promise.all([
      ownerApi("/api/campaigns"),
      ownerApi("/api/placements"),
    ]);
    (Array.isArray(campaigns) ? campaigns : []).forEach((campaign) => upsertCampaign(createCampaign(campaign)));
    (Array.isArray(placements) ? placements : []).forEach((placement) => upsertPlacement(createPlacement(placement)));
    state.realRecordsSync = "loaded";
    state.realRecordsSyncMessage = "";
    if (["dashboard", "campaigns", "placements"].includes(state.view)) renderCurrentView();
  } catch (err) {
    state.realRecordsSync = "error";
    state.realRecordsSyncMessage = err.message;
    if (["campaigns", "placements"].includes(state.view)) renderCurrentView();
  }
}

function coachingDataForClient(clientName) {
  const data = state.realCoachingData || { phases: [], opportunities: [], resources: [] };
  return {
    phases: (data.phases || []).filter((phase) => phase.client === clientName).sort((a, b) => a.phaseNumber - b.phaseNumber),
    opportunities: (data.opportunities || []).filter((opportunity) => opportunity.client === clientName),
    resources: (data.resources || []).filter((resource) => resource.client === clientName),
  };
}

/**
 * Preview-mode counterpart to coachingDataForClient() above — reads the
 * SAME local storage the seed data was already written into
 * (loadPhasesForClient etc.), rather than state.realCoachingData, which
 * only ever populates via a real Supabase sync. Discovered mid-session:
 * seedGreyzBistroCoachingData() already runs and writes real content
 * into local storage in preview mode, but nothing ever read it back —
 * coachingDataForClient was passed as null unless signed in, so the
 * admin view had no function to call at all and showed empty regardless
 * of what was actually sitting in localStorage.
 */
function localCoachingDataForClient(clientName) {
  return {
    phases: loadPhasesForClient(clientName).sort((a, b) => a.phaseNumber - b.phaseNumber),
    opportunities: loadOpportunitiesForClient(clientName),
    resources: loadResourcesForClient(clientName),
  };
}

// --- Local (preview-mode) coaching write handlers -------------------------
// Mirror the real Supabase-backed ones above field-for-field, writing to
// local storage instead. Never touches Supabase — a demo/preview session
// editing coaching content stays entirely on this machine, the same
// boundary already drawn for placements and campaigns this session.

function saveLocalCoachingPhase(phase) {
  const existing = loadPhasesForClient(phase.client).find((p) => p.id === phase.id);
  updateLocalPhase(existing ? applyPhaseEdit(existing, phase) : phase);
  return localCoachingDataForClient(phase.client);
}

// loadPhasesForClient() needs a client name; a phase id or homework id
// alone doesn't carry one, so both lookups below search across every
// real client's phases rather than requiring the caller to already know
// which client owns the phase.
function findLocalPhaseById(phaseId) {
  for (const c of getRealClients()) {
    const found = loadPhasesForClient(c.name).find((p) => p.id === phaseId);
    if (found) return found;
  }
  return null;
}

function createLocalHomework(phaseId, raw) {
  const phase = findLocalPhaseById(phaseId);
  if (!phase) throw new Error("Phase not found.");
  updateLocalPhase(addHomeworkItem(phase, raw));
  return localCoachingDataForClient(phase.client);
}

function saveLocalHomework(homeworkId, patch) {
  const phase = findPhaseOwningHomework(homeworkId);
  if (!phase) throw new Error("Homework item not found.");
  const item = (phase.homework || []).find((h) => h.id === homeworkId);
  const updatedPhase =
    "status" in patch && item?.type !== "reflection"
      ? updateHomeworkStatus(phase, homeworkId, patch.status)
      : "response" in patch
        ? respondToReflection(phase, homeworkId, patch.response)
        : { ...phase, homework: (phase.homework || []).map((h) => (h.id === homeworkId ? { ...h, ...patch } : h)) };
  updateLocalPhase(updatedPhase);
  return localCoachingDataForClient(phase.client);
}

function findPhaseOwningHomework(homeworkId) {
  for (const c of getRealClients()) {
    const found = loadPhasesForClient(c.name).find((p) => (p.homework || []).some((h) => h.id === homeworkId));
    if (found) return found;
  }
  return null;
}

function removeLocalHomework(homeworkId) {
  const phase = findPhaseOwningHomework(homeworkId);
  if (!phase) throw new Error("Homework item not found.");
  updateLocalPhase(removeHomeworkItem(phase, homeworkId));
  return localCoachingDataForClient(phase.client);
}

function saveLocalOpportunity(clientName, raw, existing = null) {
  if (existing) {
    updateLocalOpportunity(applyOpportunityEdit(existing, raw));
  } else {
    addLocalOpportunity(createOpportunity({ ...raw, client: clientName }));
  }
  return localCoachingDataForClient(clientName);
}

function removeLocalOpportunity(opportunityId) {
  const owner = getRealClients().map((c) => c.name).find((name) => loadOpportunitiesForClient(name).some((o) => o.id === opportunityId));
  deleteLocalOpportunity(opportunityId);
  return localCoachingDataForClient(owner || "");
}

function saveLocalResource(clientName, raw, existing = null) {
  if (existing) {
    updateLocalResource(applyResourceEdit(existing, raw));
  } else {
    addLocalResource(createResource({ ...raw, client: clientName }));
  }
  return localCoachingDataForClient(clientName);
}

function removeLocalResource(resourceId) {
  const owner = getRealClients().map((c) => c.name).find((name) => loadResourcesForClient(name).some((r) => r.id === resourceId));
  deleteLocalResource(resourceId);
  return localCoachingDataForClient(owner || "");
}

async function syncOwnerCoachingFromSupabase({ force = false } = {}) {
  if (!shouldUseOwnerApi()) return;
  if (state.realCoachingSync === "loading") return;
  if (!force && ["loaded", "error"].includes(state.realCoachingSync)) return;

  state.realCoachingSync = "loading";
  try {
    state.realCoachingData = await ownerApi("/api/coaching");
    state.realCoachingSync = "loaded";
    state.realCoachingSyncMessage = "";
    if (["dashboard", "coaching"].includes(state.view)) renderCurrentView();
  } catch (err) {
    state.realCoachingSync = "error";
    state.realCoachingSyncMessage = err.message;
    if (state.view === "coaching") renderCurrentView();
  }
}

async function createRealCoachingPhase(clientName, raw) {
  const resolved = await resolveRealClientId(clientName);
  if (!resolved.ok) throw new Error(resolved.message);
  await ownerApi(`/api/clients/${encodeURIComponent(resolved.id)}/coaching/phases`, {
    method: "POST",
    body: JSON.stringify(raw),
  });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(clientName);
}

async function saveRealCoachingPhase(phase) {
  await ownerApi(`/api/coaching/phases/${encodeURIComponent(phase.id)}`, {
    method: "PATCH",
    body: JSON.stringify(phase),
  });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(phase.client);
}

async function createRealHomework(phaseId, raw) {
  const phase = (state.realCoachingData?.phases || []).find((item) => item.id === phaseId);
  await ownerApi(`/api/coaching/phases/${encodeURIComponent(phaseId)}/homework`, {
    method: "POST",
    body: JSON.stringify(raw),
  });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(phase?.client || "");
}

async function saveRealHomework(homeworkId, patch) {
  const phase = (state.realCoachingData?.phases || []).find((item) => (item.homework || []).some((homework) => homework.id === homeworkId));
  await ownerApi(`/api/coaching/homework/${encodeURIComponent(homeworkId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(phase?.client || "");
}

async function removeRealHomework(homeworkId) {
  const phase = (state.realCoachingData?.phases || []).find((item) => (item.homework || []).some((homework) => homework.id === homeworkId));
  await ownerApi(`/api/coaching/homework/${encodeURIComponent(homeworkId)}`, { method: "DELETE" });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(phase?.client || "");
}

async function saveRealOpportunity(clientName, raw, existing = null) {
  const body = JSON.stringify(raw);
  if (existing) {
    await ownerApi(`/api/coaching/opportunities/${encodeURIComponent(existing.id)}`, { method: "PATCH", body });
  } else {
    const resolved = await resolveRealClientId(clientName);
    if (!resolved.ok) throw new Error(resolved.message);
    await ownerApi(`/api/clients/${encodeURIComponent(resolved.id)}/coaching/opportunities`, { method: "POST", body });
  }
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(clientName);
}

async function removeRealOpportunity(opportunityId) {
  const opportunity = (state.realCoachingData?.opportunities || []).find((item) => item.id === opportunityId);
  await ownerApi(`/api/coaching/opportunities/${encodeURIComponent(opportunityId)}`, { method: "DELETE" });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(opportunity?.client || "");
}

async function saveRealResource(clientName, raw, existing = null) {
  const body = JSON.stringify(raw);
  if (existing) {
    await ownerApi(`/api/coaching/resources/${encodeURIComponent(existing.id)}`, { method: "PATCH", body });
  } else {
    const resolved = await resolveRealClientId(clientName);
    if (!resolved.ok) throw new Error(resolved.message);
    await ownerApi(`/api/clients/${encodeURIComponent(resolved.id)}/coaching/resources`, { method: "POST", body });
  }
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(clientName);
}

async function removeRealResource(resourceId) {
  const resource = (state.realCoachingData?.resources || []).find((item) => item.id === resourceId);
  await ownerApi(`/api/coaching/resources/${encodeURIComponent(resourceId)}`, { method: "DELETE" });
  await syncOwnerCoachingFromSupabase({ force: true });
  return coachingDataForClient(resource?.client || "");
}

async function saveRealCampaign({ raw, existingRecord }) {
  const body = JSON.stringify(raw);
  const saved = existingRecord
    ? await ownerApi(`/api/campaigns/${encodeURIComponent(existingRecord.id)}`, { method: "PATCH", body })
    : await ownerApi("/api/campaigns", { method: "POST", body });
  return createCampaign(saved);
}

async function deleteRealCampaign(id) {
  await ownerApi(`/api/campaigns/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function addRealCampaignMilestone(campaignId, text) {
  await ownerApi(`/api/campaigns/${encodeURIComponent(campaignId)}/milestones`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  await syncOwnerRecordsFromSupabase({ force: true });
}

async function toggleRealCampaignMilestone(campaign, milestoneId) {
  const milestone = (campaign.milestones || []).find((m) => m.id === milestoneId);
  await ownerApi(`/api/campaign-milestones/${encodeURIComponent(milestoneId)}`, {
    method: "PATCH",
    body: JSON.stringify({ done: !milestone?.done }),
  });
  await syncOwnerRecordsFromSupabase({ force: true });
}

async function removeRealCampaignMilestone(milestoneId) {
  await ownerApi(`/api/campaign-milestones/${encodeURIComponent(milestoneId)}`, { method: "DELETE" });
  await syncOwnerRecordsFromSupabase({ force: true });
}

async function saveRealPlacement({ raw, existingRecord }) {
  const body = JSON.stringify(raw);
  const saved = existingRecord
    ? await ownerApi(`/api/placements/${encodeURIComponent(existingRecord.id)}`, { method: "PATCH", body })
    : await ownerApi("/api/placements", { method: "POST", body });
  return createPlacement(saved);
}

async function deleteRealPlacement(id) {
  await ownerApi(`/api/placements/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function inviteClient({ clientId, clientName, email }) {
  const resolved = clientId ? { ok: true, id: clientId } : await resolveRealClientId(clientName);
  if (!resolved.ok) return resolved;
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/clients/${encodeURIComponent(resolved.id)}/invite`, {
      method: "POST",
      headers: await authedJsonHeaders(),
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: "Live invite sending is planned for handoff." };
    }
    return { ok: true, invitedEmail: body.invitedEmail };
  } catch (err) {
    return { ok: false, message: "Live invite sending is planned for handoff." };
  }
}

async function discoveryScanClient({ clientName }) {
  const resolved = await resolveRealClientId(clientName);
  if (!resolved.ok) return resolved;
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/clients/${encodeURIComponent(resolved.id)}/discovery-scan`, {
      method: "POST",
      headers: await demoCapableJsonHeaders(),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: body.message || "Scan could not complete. Check search setup and try again." };
    }
    return { ok: true, ...body };
  } catch (err) {
    return { ok: false, message: "Scan could not complete. Check search setup and try again." };
  }
}

/**
 * POSTs to owner-api's Perplexity-backed research route. Same honest
 * failure posture as inviteClient() above — a network/config failure comes
 * back as { available: false }, never a fabricated suggestion.
 */
/**
 * Calls owner-api's shared /api/generate/:type route (see server/owner-api/
 * index.js's PROMPT_BUILDERS) — one entry point for all five AI writing
 * functions. Always a SUGGESTION: nothing here saves anything, every
 * caller below is responsible for putting the result somewhere the owner
 * still has to explicitly save/approve, matching the locked "AI drafts,
 * owner approves" rule this whole build follows.
 */
async function generateAIText(type, data) {
  try {
    const headers = await authedJsonHeaders();
    if (!headers.Authorization) headers["X-VC-Demo-AI"] = "true";
    const res = await fetch(`${OWNER_API_BASE}/api/generate/${type}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: "Use the saved Demo Day draft for this section." };
    }
    return { ok: true, text: body.text, providerUsed: body.providerUsed };
  } catch (err) {
    return { ok: false, message: "Use the saved Demo Day draft for this section." };
  }
}

async function suggestHeadline(headline) {
  return generateAIText("language-suggestions", { mode: "headline", headline });
}

async function analyzeSentiment({ publication, headline }) {
  return generateAIText("sentiment-analysis", { publication, headline });
}

async function researchOutletRate(outletName) {
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/research-outlet-rate`, {
      method: "POST",
      headers: await demoCapableJsonHeaders(),
      body: JSON.stringify({ outletName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { available: false, error: "Using the saved Demo Day estimate for this outlet." };
    }
    return body;
  } catch (err) {
    return { available: false, error: "Using the saved Demo Day estimate for this outlet." };
  }
}

async function findPitchDateInGmail({ clientName, publication, headline }) {
  try {
    const result = await ownerApi("/api/google/gmail/pitch-search", {
      method: "POST",
      body: JSON.stringify({ clientName, publication, headline }),
    });
    if (result.available === false) return { ok: false, ...result };
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function scheduleClientMeeting({ clientName, contactEmail, notes, startDate, startTime }) {
  if (!shouldUseOwnerApi()) {
    return {
      ok: true,
      demo: true,
      message: `Demo meeting scheduled for ${clientName || "this client"} on ${startDate} at ${startTime}. Google Calendar connection is deferred until after Demo Day.`,
    };
  }

  try {
    const result = await ownerApi("/api/google/calendar/events", {
      method: "POST",
      body: JSON.stringify({ clientName, contactEmail, notes, startDate, startTime, durationMinutes: 30 }),
    });
    if (result.available === false) return { ok: false, ...result };
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function loadClientCommunicationPanel({ type, clientId, clientName }) {
  state.clientCommsPanel = { type, clientId, clientName };
  state.clientCommsStatus = "loading";
  state.clientCommsData = null;
  renderClientsView();

  if (!shouldUseOwnerApi()) {
    state.clientCommsStatus = "preview";
    state.clientCommsData = [];
    renderClientsView();
    return;
  }

  try {
    const path = `/api/clients/${encodeURIComponent(clientId)}/${type === "files" ? "files" : "messages"}`;
    state.clientCommsData = await ownerApi(path);
    state.clientCommsStatus = "loaded";
  } catch (err) {
    state.clientCommsStatus = "error";
    state.clientCommsData = { message: err.message };
  }
  renderClientsView();
}

async function saveClientReportDraft({ clientName, executiveSummary, narrative = "", periodLabel = "Demo Day Report" }) {
  if (!shouldUseOwnerApi()) return { ok: false, message: "Preview draft saved locally." };
  const resolved = await resolveRealClientId(clientName);
  if (!resolved.ok) return resolved;
  try {
    const result = await ownerApi(`/api/clients/${encodeURIComponent(resolved.id)}/reports`, {
      method: "POST",
      body: JSON.stringify({
        title: `${clientName} Coverage Report`,
        periodLabel,
        executiveSummary,
        narrative,
      }),
    });
    return { ok: true, report: result };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function approveClientReport({ clientName, executiveSummary, narrative = "", periodLabel = "Demo Day Report" }) {
  const saved = await saveClientReportDraft({ clientName, executiveSummary, narrative, periodLabel });
  if (!saved.ok || !saved.report?.id || !shouldUseOwnerApi()) return saved;
  try {
    const approved = await ownerApi(`/api/reports/${encodeURIComponent(saved.report.id)}/approve`, { method: "POST" });
    return { ok: true, report: approved };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

function renderClientCommunicationPanel() {
  if (!state.clientCommsPanel) return "";
  const { type, clientName } = state.clientCommsPanel;
  const title = type === "files" ? "Shared Files" : "Client Messages";
  const body = renderClientCommunicationPanelBody();
  return `
    <section class="card" style="margin-bottom:18px;" id="client-communications-panel">
      <div class="section-heading">
        <h2>${escapeHtml(title)} — ${escapeHtml(clientName || "Client")}</h2>
        <button type="button" class="link-btn" id="client-comms-close">Close</button>
      </div>
      ${body}
    </section>
  `;
}

function renderClientCommunicationPanelBody() {
  const panel = state.clientCommsPanel;
  if (!panel) return "";
  if (state.clientCommsStatus === "loading") return `<p class="hint">Loading ${panel.type === "files" ? "files" : "messages"}...</p>`;
  if (state.clientCommsStatus === "preview") {
    return `<div class="state-panel compact"><h3>Live owner account needed</h3><p>Client ${panel.type === "files" ? "file history" : "message history"} is saved in the backend for real client logins. Sign in with Tenyse's owner account to view it here.</p></div>`;
  }
  if (state.clientCommsStatus === "error") {
    return `<div class="state-panel compact"><h3>Could not load this yet</h3><p>${escapeHtml(state.clientCommsData?.message || "Try again from the live owner account.")}</p></div>`;
  }
  const rows = Array.isArray(state.clientCommsData) ? state.clientCommsData : [];
  if (!rows.length) {
    return `<div class="state-panel compact"><h3>No ${panel.type === "files" ? "files" : "messages"} yet</h3><p>Once the client ${panel.type === "files" ? "uploads shared materials" : "sends a message"}, it will appear here.</p></div>`;
  }
  if (panel.type === "files") {
    return `
      <div class="review-queue-list">
        ${rows
          .map(
            (file) => `
          <article class="review-queue-item">
            <div class="rq-info">
              <p class="rq-headline">${escapeHtml(file.fileName)}</p>
              <p class="rq-meta">${escapeHtml(formatFileSize(file.sizeBytes))}${file.notes ? ` · ${escapeHtml(file.notes)}` : ""}</p>
            </div>
            <div class="review-queue-actions">
              ${file.downloadUrl ? `<a class="btn-secondary" href="${escapeHtml(file.downloadUrl)}" target="_blank" rel="noreferrer">Open</a>` : ""}
            </div>
          </article>`
          )
          .join("")}
      </div>
    `;
  }
  return `
    <div class="review-queue-list">
      ${rows
        .map(
          (message) => `
        <article class="review-queue-item">
          <div class="rq-info">
            <p class="rq-headline">${escapeHtml(message.subject)}</p>
            <p class="rq-meta">${escapeHtml(message.body)} · ${escapeHtml((message.createdAt || "").slice(0, 10))}</p>
          </div>
        </article>`
        )
        .join("")}
    </div>
  `;
}

async function loadGoogleWorkspaceStatus() {
  const statusEl = document.getElementById("google-workspace-status");
  if (!statusEl) return;

  if (!shouldUseOwnerApi()) {
    statusEl.textContent = "Deferred for Demo Day. Gmail, Calendar, and automated lead-time tracking will be connected after the presentation; sample lead-time data is active now.";
    return;
  }

  try {
    const status = await ownerApi("/api/google/status");
    if (status.configured) {
      statusEl.innerHTML =
        "<strong>Connected:</strong> Gmail search, Gmail note notifications, and Calendar scheduling can use the configured Google OAuth account.";
      return;
    }
    statusEl.innerHTML =
      "<strong>Deferred until after Demo Day:</strong> sample lead-time data is active now. Add Google OAuth credentials later for Gmail search, note notifications, and Calendar scheduling.";
  } catch (err) {
    statusEl.textContent = `Could not check Google Workspace status: ${err.message}`;
  }
}

function renderClientsView() {
  const target = document.getElementById("clients-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  syncRealClientsFromSupabase();

  const canManageClients = shouldUseOwnerApi();
  const isEditing = canManageClients && state.editingClient;
  const editingRecord = isEditing && state.editingClient !== true ? findClientByName(state.editingClient) : null;

  target.innerHTML = `
    <div class="section-heading"><h2>Clients ${sectionInfoButton({ title: "Clients", body: "Every client on file, real and status-tracked. “Unconfirmed” means Tenyse hasn't verified that client relationship or its figures yet — it is not a data error, and it should stay that way until she confirms it. Click a client to see their profile, campaigns, and placements, or use Scan for Mentions to run the Discovery Agent for them." })}</h2></div>
    ${ownerApiAuthHint()}
    ${isEditing ? `<div class="card" id="client-detail-form-wrap" style="margin-bottom:24px;"></div>` : ""}
    ${
      state.dataSource === "real" && state.realClientsSync === "error"
        ? `<p class="hint" style="margin-bottom:12px;">Using demo-ready client data for this walkthrough.</p>`
        : ""
    }
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label for="client-status-filter" style="font-size:0.82rem; font-weight:600; color:var(--color-navy);">Show</label>
      <select id="client-status-filter" style="max-width:220px;">
        <option value="all" ${state.clientStatusFilter === "all" ? "selected" : ""}>All clients</option>
        <option value="active" ${state.clientStatusFilter === "active" ? "selected" : ""}>Current (Active)</option>
        <option value="past" ${state.clientStatusFilter === "past" ? "selected" : ""}>Previous (Past / Portfolio)</option>
        <option value="unconfirmed" ${state.clientStatusFilter === "unconfirmed" ? "selected" : ""}>Needs confirmation</option>
      </select>
    </div>
    ${renderClientCommunicationPanel()}
    <div class="clients-grid" id="clients-full-grid"></div>
  `;

  document.getElementById("client-status-filter").addEventListener("change", (e) => {
    state.clientStatusFilter = e.target.value;
    renderClientsView();
  });
  document.getElementById("client-comms-close")?.addEventListener("click", () => {
    state.clientCommsPanel = null;
    state.clientCommsStatus = "idle";
    state.clientCommsData = null;
    renderClientsView();
  });

  if (isEditing) {
    renderClientDetailForm(document.getElementById("client-detail-form-wrap"), {
      initialData: editingRecord || (state.editingClient !== true ? { name: state.editingClient } : null),
      onSubmit: async (raw) => {
        try {
          if (editingRecord) {
            const saved = await saveRealClient({ raw, existingRecord: editingRecord });
            updateClient(applyClientEdit(editingRecord, saved));
          } else {
            const saved = await saveRealClient({ raw });
            addClient(createClient(saved));
          }
          state.editingClient = null;
          renderClientsView();
        } catch (err) {
          alert(err.message);
        }
      },
      onCancel: () => {
        state.editingClient = null;
        renderClientsView();
      },
    });
  }

  const filteredClients =
    state.clientStatusFilter === "all"
      ? getClientsWithMetrics()
      : getClientsWithMetrics().filter((c) => c.profile?.status === state.clientStatusFilter);

  renderClientsList(document.getElementById("clients-full-grid"), filteredClients, {
    onInvite: shouldUseOwnerApi() ? inviteClient : undefined,
    onViewDashboard: (clientName) => {
      state.dashboardClientFilter = clientName;
      state.dashboardDateFrom = "";
      state.dashboardDateTo = "";
      navigate("dashboard");
    },
    onEditInfo: canManageClients
      ? (clientName) => {
          state.editingClient = clientName;
          renderClientsView();
        }
      : undefined,
    onAddCampaign:
      shouldUseOwnerApi()
        ? (clientName) => {
            state.addCampaignForClient = clientName;
            state.editingCampaignId = null;
            navigate("campaigns");
          }
        : undefined,
    onDiscoveryScan: discoveryScanClient,
    onScheduleMeeting: scheduleClientMeeting,
    onViewMessages: ({ clientId, clientName }) => loadClientCommunicationPanel({ type: "messages", clientId, clientName }),
    onViewFiles: ({ clientId, clientName }) => loadClientCommunicationPanel({ type: "files", clientId, clientName }),
    onViewCoaching: (clientName) => {
      state.coachingSelectedClient = clientName;
      navigate("coaching");
    },
  });
}

/**
 * Cross-client campaigns overview: four metric cards and a filterable,
 * searchable table (matching the tabs shown in the target design — All /
 * Active / Planning / Paused / Completed). Renders above the existing
 * campaign grid + add/edit form (kept exactly as-is below — real, working
 * campaign management, not replaced).
 *
 * "Planning" isn't one of this schema's three statuses (active/completed/
 * paused — see db/schema.sql) — mapped from a campaign with a startDate
 * in the future, rather than adding a status this app doesn't track.
 */
function renderCampaignsOverview(container) {
  const { metrics, rows } = getCampaignsOverviewSummary();
  const filter = state.campaignsFilter || "all";
  const search = (state.campaignsSearch || "").toLowerCase();

  const today = new Date().toISOString().slice(0, 10);
  const rowStatus = (r) => (r.status === "Active" && r.startDate && r.startDate > today ? "Planning" : r.status);

  const filtered = rows.filter((r) => {
    const st = rowStatus(r);
    const matchesFilter = filter === "all" || st.toLowerCase() === filter;
    const matchesSearch = !search || r.name.toLowerCase().includes(search) || r.clientName.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  const tabCounts = { all: rows.length };
  for (const r of rows) {
    const st = rowStatus(r).toLowerCase();
    tabCounts[st] = (tabCounts[st] || 0) + 1;
  }
  const TABS = [
    ["all", "All Campaigns"],
    ["active", "Active"],
    ["planning", "Planning"],
    ["paused", "Paused"],
    ["completed", "Completed"],
  ];

  container.innerHTML = `
    <div class="section-heading"><h2>Campaigns Overview ${sectionInfoButton({ title: "Campaigns Overview", body: "Every PR campaign across every client, its status (active/planning/paused/completed), and the publicity value (AVE) earned from that campaign's own landed placements — not a client-wide total. Progress is completed placements divided by the campaign's total planned placements. Use the filter chips and search below to narrow this down, and Manage Campaigns further down to add or edit one." })}</h2></div>
    <p class="hint" style="margin:-8px 0 20px;">Every real campaign across all clients, with publicity value and progress in one place.</p>
    <div class="owner-metrics-grid" style="margin-bottom:24px;">
      ${reportsMetricCard({
        label: "Active Campaigns",
        value: String(metrics.activeCampaigns),
        delta: null,
        icon: "\u25b6",
        iconBg: "#fbe2da",
        tooltip: "Campaigns currently in motion, separated from completed or paused work so Tenyse can see where follow-up still matters.",
        target: "campaigns",
        actionLabel: "Filter campaign work",
      })}
      ${reportsMetricCard({
        label: "Total Placements",
        value: String(metrics.totalPlacements),
        delta: null,
        icon: "\u25a6",
        iconBg: "#e1f2f0",
        tooltip: "All placements connected to campaign records. These feed campaign progress, reports, and client-facing proof.",
        target: "placements",
        actionLabel: "Open placements",
      })}
      ${reportsMetricCard({
        label: "Total Publicity Value",
        value: formatCompactCurrency(metrics.totalAVE),
        delta: null,
        icon: "$",
        iconBg: "#fdf0d8",
        tooltip: "Estimated publicity value earned by campaign placements. This gives Tenyse a quick value story before opening a campaign detail.",
        target: "reports",
        actionLabel: "Open value reports",
      })}
      ${reportsMetricCard({
        label: "Clients with Active Campaigns",
        value: `${metrics.clientsWithActive} of ${metrics.totalClients}`,
        delta: null,
        icon: "\u25ce",
        iconBg: "#e9ecff",
        tooltip: "How many clients currently have PR campaigns in motion, useful for prioritizing client follow-up.",
        target: "clients",
        actionLabel: "Open clients",
      })}
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-bottom:16px;">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${TABS.map(
            ([key, label]) =>
              `<button type="button" class="chip-filter ${filter === key ? "active" : ""}" data-campaign-filter="${key}">${escapeHtml(label)} ${tabCounts[key] ? `<span class="chip-count">${tabCounts[key]}</span>` : ""}</button>`
          ).join("")}
        </div>
        <input type="search" id="campaigns-search-input" placeholder="Search campaigns or clients..." value="${escapeHtml(state.campaignsSearch || "")}" style="max-width:220px;" />
      </div>
      <div class="table-scroll">
        <table class="placements-table">
          <thead><tr><th>Campaign</th><th>Client</th><th>Status</th><th>Placements</th><th>AVE</th><th>Start Date</th><th>Progress</th></tr></thead>
          <tbody>
            ${
              filtered.length
                ? filtered
                    .map(
                      (r) => `
              <tr>
                <td><strong>${escapeHtml(r.name)}</strong></td>
                <td>${escapeHtml(r.clientName)}</td>
                <td><span class="status-badge ${rowStatus(r).toLowerCase()}">${escapeHtml(rowStatus(r))}</span></td>
                <td class="numeric">${r.completedPlacements} / ${r.totalPlacements}</td>
                <td class="numeric">${formatCurrency(r.ave)}</td>
                <td>${r.startDate ? escapeHtml(r.startDate) : "—"}</td>
                <td>${
                  r.progressPercent == null
                    ? `<span class="hint">Not yet tracked</span>`
                    : `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${r.progressPercent}%;"></div></div><span class="hint">${r.progressPercent}%</span>`
                }</td>
              </tr>`
                    )
                    .join("")
                : `<tr><td colspan="7"><p class="hint" style="margin:12px 0;">No campaigns match this filter.</p></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-campaign-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.campaignsFilter = btn.dataset.campaignFilter;
      renderCampaignsOverview(container);
    });
  });
  const searchInput = container.querySelector("#campaigns-search-input");
  searchInput.addEventListener("input", (e) => {
    state.campaignsSearch = e.target.value;
    renderCampaignsOverview(container);
  });
  wireMetricCardNavigation(container);
  // Keep focus + caret position across the re-render triggered by typing.
  if (document.activeElement !== searchInput) searchInput.focus();
}

function renderCampaignsView() {
  const target = document.getElementById("campaigns-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  syncOwnerRecordsFromSupabase();

  // Matches canManagePlacements below. This used to require a real signed-in
  // session, while the message underneath told the owner to switch the data
  // source to "Real" — which she already had. Following the instruction could
  // never clear the gate, because the gate was about something else entirely.
  //
  // Safe to relax: the submit handler already branches on shouldUseOwnerApi()
  // and writes locally when there is no session, exactly as placements do.
  const canManageCampaigns = state.dataSource === "real";
  const editingCampaign = canManageCampaigns && state.editingCampaignId ? loadCampaigns().find((c) => c.id === state.editingCampaignId) : null;
  const lockClient = !editingCampaign ? state.addCampaignForClient : "";

  target.innerHTML = `
    ${state.dataSource === "real" ? `<div id="campaigns-overview-wrap" style="margin-bottom:32px;"></div>` : ""}
    <div class="section-heading"><h2>Manage Campaigns</h2></div>
    ${ownerApiAuthHint()}
    ${
      state.dataSource === "real" && state.realRecordsSync === "error"
        ? `<p class="hint" style="margin-bottom:12px;">Using demo-ready campaign and placement data for this walkthrough.</p>`
        : ""
    }
    <div class="dashboard-split">
      <section class="section" style="margin-bottom:0;">
        <h3 style="color:var(--color-navy); font-size:0.95rem; margin-bottom:8px;">Overview</h3>
        <div class="campaigns-grid" id="campaigns-full-grid"></div>
      </section>
      <section class="section" style="margin-bottom:0;">
        ${
          canManageCampaigns
            ? `<h3 style="color:var(--color-navy); font-size:0.95rem; margin-bottom:8px;">${
                editingCampaign ? "Edit Campaign" : lockClient ? `Add Campaign for ${escapeHtml(lockClient)}` : "Add Campaign"
              }</h3>
               <div class="card" id="campaign-form-wrap"></div>`
            : `<p style="color:var(--text-secondary); font-size:0.85rem;">
                 Switch the sidebar's data source to "Real" to create and manage campaigns — adding one while
                 previewing the mock dataset wouldn't show up in it.
               </p>`
        }
      </section>
    </div>
    ${canManageCampaigns ? `<div class="section-heading" style="margin-top:8px;"><h2>Manage Campaigns</h2></div><div id="campaign-manage-list"></div>` : ""}
  `;

  if (state.dataSource === "real") renderCampaignsOverview(document.getElementById("campaigns-overview-wrap"));

  renderCampaignsGrid(document.getElementById("campaigns-full-grid"), getAllCampaigns(), {
    onViewCampaign: (id) => showCampaignDetail(id),
  });

  if (!canManageCampaigns) return;

  renderCampaignForm(document.getElementById("campaign-form-wrap"), {
    initialData: editingCampaign,
    lockClient,
    onSubmit: async (rawData) => {
      try {
        if (editingCampaign) {
          const saved = shouldUseOwnerApi() ? await saveRealCampaign({ raw: rawData, existingRecord: editingCampaign }) : applyCampaignEdit(editingCampaign, rawData);
          updateCampaignRecord(saved);
          state.editingCampaignId = null;
        } else {
          const saved = shouldUseOwnerApi() ? await saveRealCampaign({ raw: rawData }) : createCampaign(rawData);
          addCampaign(saved);
        }
        state.addCampaignForClient = "";
        if (shouldUseOwnerApi()) await syncOwnerRecordsFromSupabase({ force: true });
        renderCampaignsView();
        return true;
      } catch (err) {
        alert(err.message);
        return false;
      }
    },
    onCancel: editingCampaign || lockClient
      ? () => {
          state.editingCampaignId = null;
          state.addCampaignForClient = "";
          renderCampaignsView();
        }
      : undefined,
  });

  renderCampaignManageList(document.getElementById("campaign-manage-list"), loadCampaigns(), {
    onEdit: (id) => {
      state.editingCampaignId = id;
      renderCampaignsView();
    },
    onDelete: (id) => {
      if (confirm("Delete this campaign? This can't be undone. Placements that reference it by name are unaffected.")) {
        (shouldUseOwnerApi() ? deleteRealCampaign(id) : Promise.resolve())
          .then(() => {
            deleteCampaign(id);
            if (state.editingCampaignId === id) state.editingCampaignId = null;
            renderCampaignsView();
          })
          .catch((err) => alert(err.message));
      }
    },
    onAddMilestone: async (campaignId, text) => {
      try {
        if (shouldUseOwnerApi()) await addRealCampaignMilestone(campaignId, text);
        else updateCampaignRecord(addMilestone(loadCampaigns().find((c) => c.id === campaignId), text));
        renderCampaignsView();
      } catch (err) {
        alert(err.message);
      }
    },
    onToggleMilestone: async (campaignId, milestoneId) => {
      try {
        const campaign = loadCampaigns().find((c) => c.id === campaignId);
        if (shouldUseOwnerApi()) await toggleRealCampaignMilestone(campaign, milestoneId);
        else updateCampaignRecord(toggleMilestone(campaign, milestoneId));
        renderCampaignsView();
      } catch (err) {
        alert(err.message);
      }
    },
    onRemoveMilestone: async (campaignId, milestoneId) => {
      try {
        if (shouldUseOwnerApi()) await removeRealCampaignMilestone(milestoneId);
        else updateCampaignRecord(removeMilestone(loadCampaigns().find((c) => c.id === campaignId), milestoneId));
        renderCampaignsView();
      } catch (err) {
        alert(err.message);
      }
    },
  });
}

function renderPlacementsView() {
  const target = document.getElementById("placements-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  syncOwnerRecordsFromSupabase();

  const canManagePlacements = state.dataSource === "real";
  // Matches the campaign fix earlier this session: local save/edit/delete
  // works in preview mode, real Supabase save only when actually signed in.
  // onSubmit and onDelete below already branch on shouldUseOwnerApi()
  // internally for the real-vs-local write; this only controls whether the
  // form/actions render at all.
  const canSavePlacements = state.dataSource === "real";
  const editingPlacement =
    canManagePlacements && state.editingPlacementId ? getAllRealPlacements().find((p) => p.id === state.editingPlacementId) : null;

  target.innerHTML = `
    <div class="section-heading"><h2>Press Placements ${sectionInfoButton({ title: "Press Placements", body: "Every piece of confirmed press coverage Tenyse has landed, across all clients — the source-of-truth records that every AVE total, chart, and report elsewhere in this app is calculated from. AVE (advertising value equivalent) on a placement is either a figure Tenyse entered herself, or one auto-calculated from a saved outlet rate — auto-calculated and estimated figures are always labeled as such, never shown as if confirmed." })}</h2></div>
    ${ownerApiAuthHint()}
    ${
      state.dataSource === "real" && state.realRecordsSync === "error"
        ? `<p class="hint" style="margin-bottom:12px;">Using demo-ready campaign and placement data for this walkthrough.</p>`
        : ""
    }
    ${
      canManagePlacements
        ? `<div class="card" id="placement-form-wrap" style="margin-bottom:24px;"></div>`
        : `<p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
             Switch the sidebar's data source to "Real" to add or edit a placement — doing so while previewing
             the mock demo dataset wouldn't show up in it, which would just be confusing.
           </p>`
    }
    <div class="card" id="placements-full-table"></div>
  `;

  if (canManagePlacements) {
    renderPlacementForm(document.getElementById("placement-form-wrap"), {
      initialData: editingPlacement,
      onResearchRate: researchOutletRate,
      onSuggestHeadline: suggestHeadline,
      onAnalyzeSentiment: analyzeSentiment,
      onFindPitchDate: findPitchDateInGmail,
      // onSubmit above already saves locally when not signed in — this
      // used to disable the button with "Sign in to Save Placement"
      // regardless, left over from before that fix. The button now only
      // needs canSavePlacements (dataSource === "real"), matching what
      // actually gates the form's existence a few lines up.
      submitDisabledReason: "",
      knownClients: getRealClients().map((c) => c.name),
      onSubmit: async (rawData) => {
        try {
          if (shouldUseOwnerApi()) {
            if (editingPlacement) {
              const saved = await saveRealPlacement({ raw: rawData, existingRecord: editingPlacement });
              updatePlacement(saved);
            } else {
              const saved = await saveRealPlacement({ raw: rawData });
              addPlacement(saved);
            }
            await syncOwnerRecordsFromSupabase({ force: true });
          } else {
            // Preview mode: same local-write path seedRealCaseStudyData.js
            // and the campaign form already use — no Supabase round-trip.
            if (editingPlacement) {
              updatePlacement(applyPlacementEdit(editingPlacement, rawData));
            } else {
              addPlacement(createPlacement(rawData));
            }
          }
          state.editingPlacementId = null;
          renderPlacementsView();
          return true;
        } catch (err) {
          alert(err.message);
          return false;
        }
      },
      onCancel: () => {
        state.editingPlacementId = null;
        renderPlacementsView();
      },
    });
  }

  renderPlacementsTable(document.getElementById("placements-full-table"), filterPlacements(getAllPlacements(), state.searchTerm), {
    showClient: true,
    showDataQuality: false,
    onEdit: canSavePlacements
      ? (id) => {
          state.editingPlacementId = id;
          renderPlacementsView();
        }
      : undefined,
    onDelete: canSavePlacements
        ? (id) => {
          if (confirm("Delete this placement? This can't be undone.")) {
            (shouldUseOwnerApi() ? deleteRealPlacement(id) : Promise.resolve())
              .then(() => {
                deletePlacement(id);
                if (state.editingPlacementId === id) state.editingPlacementId = null;
                renderPlacementsView();
              })
              .catch((err) => alert(err.message));
          }
        }
      : undefined,
  });
}

function renderReviewQueueView() {
  const target = document.getElementById("reviewqueue-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });

  if (state.dataSource !== "real") {
    target.innerHTML = `
      <div class="section-heading"><h2>Review Queue</h2></div>
      <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
        Preview only — these rows show the confirm/reject workflow, including a same-name false positive
        to reject. Sign in with the live owner account to run the Discovery Agent.
      </p>
      <div class="card" id="review-queue-list"></div>
    `;
    renderMockReviewQueueSection();
    return;
  }

  target.innerHTML = `
    <div class="section-heading"><h2>Review Queue ${sectionInfoButton({ title: "Review Queue", body: "Candidate press mentions the Discovery Agent found while scanning for a client, waiting for Tenyse to confirm before they count as a real placement. Nothing here affects AVE totals, reports, or client dashboards until it's approved — this is a human checkpoint between an automated find and a figure a client would see." })}</h2></div>
    <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
      Real candidate mentions found by the Discovery Agent (Clients → Scan for Mentions) — the outlet,
      headline, article link, and which client it matched are all shown per row below. Reject a false
      positive here directly; turning one into a real placement${shouldUseOwnerApi() ? "" : " needs the live owner account signed in"}.
    </p>
    <div class="card" id="review-queue-list"><p class="hint">Loading…</p></div>
  `;
  loadRealReviewQueue();
}

function renderMockReviewQueueSection() {
  renderReviewQueue(document.getElementById("review-queue-list"), state.reviewQueue, {
    onConfirm: (id) => {
      state.reviewQueue = state.reviewQueue.filter((item) => item.id !== id);
      renderMockReviewQueueSection();
    },
    onReject: (id) => {
      state.reviewQueue = state.reviewQueue.filter((item) => item.id !== id);
      renderMockReviewQueueSection();
    },
  });
}

/**
 * Fetches the real review_queue rows plus owner-api's real clients list (to
 * resolve client_id -> a display name — see resolveRealClientId's comment
 * on why localStorage's client ids can't do this) and renders them through
 * the same ReviewQueueCard component the mock preview uses. Any failure
 * (Supabase not configured, no real auth session yet, network) renders as
 * an honest inline message, never a silently empty "all caught up" state.
 */
async function loadRealReviewQueue() {
  const listEl = document.getElementById("review-queue-list");
  try {
    // Demo-capable — a real scan (already demo-capable) can run before the
    // owner ever signs in, and its results need to be visible right here,
    // not only once real auth is added.
    const headers = await demoCapableJsonHeaders();
    const [queueRes, clientsRes] = await Promise.all([
      fetch(`${OWNER_API_BASE}/api/review-queue`, { headers }),
      fetch(`${OWNER_API_BASE}/api/clients`, { headers }),
    ]);
    const queueBody = await queueRes.json().catch(() => ({}));
    if (!queueRes.ok) {
      listEl.innerHTML = `<p class="hint">Review Queue preview is ready once mention scanning has results.</p>`;
      return;
    }
    const clientsBody = clientsRes.ok ? await clientsRes.json().catch(() => []) : [];
    const clientNameById = new Map((Array.isArray(clientsBody) ? clientsBody : []).map((c) => [c.id, c.name]));

    const items = (Array.isArray(queueBody) ? queueBody : []).map((row) => ({
      id: row.id,
      headline: row.headline || "(no headline)",
      publication: row.publication || "Unknown",
      articleUrl: row.article_url || "",
      clientId: row.client_id,
      client: clientNameById.get(row.client_id) || "Unknown client",
      matchedOn: row.matched_on || "",
      discoveredDate: row.discovered_at ? row.discovered_at.slice(0, 10) : "",
    }));

    renderReviewQueue(listEl, items, {
      confirmLabel: "Create Placement",
      showPlacementDetails: true,
      onConfirm: (id, details) => createPlacementFromReviewQueueItem(id, details),
      onReject: (id) => resolveRealReviewQueueItem(id, "rejected"),
    });
  } catch (err) {
    listEl.innerHTML = `<p class="hint">Review Queue preview is ready once mention scanning has results.</p>`;
  }
}

async function resolveRealReviewQueueItem(id, status) {
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/review-queue/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: await demoCapableJsonHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      alert("Review Queue preview is ready once mention scanning has results.");
      return;
    }
  } catch (err) {
    alert("Review Queue preview is ready once mention scanning has results.");
    return;
  }
  loadRealReviewQueue();
}

async function createPlacementFromReviewQueueItem(id, details = {}) {
  // Deliberately real-auth only, unlike the rest of this view — turning a
  // candidate into a real placement is the one write here a client could
  // eventually see, so a demo session can review and reject but not finalize.
  if (!shouldUseOwnerApi()) {
    alert("Creating a real placement needs the live owner account signed in — you can still review the details and reject false positives here.");
    return;
  }
  try {
    const result = await ownerApi(`/api/review-queue/${encodeURIComponent(id)}/create-placement`, {
      method: "POST",
      body: JSON.stringify(details),
    });
    if (result?.placement) upsertPlacement(createPlacement(result.placement));
    await syncOwnerRecordsFromSupabase({ force: true });
    loadRealReviewQueue();
  } catch (err) {
    alert(err.message);
  }
}

/**
 * Executive summary draft — the "owner approves" half of the PRD's AI
 * writing pattern, without the "AI drafts" half (no API key/model chosen
 * yet, Phase 7 is Planned). Tenyse writes it herself for now; the field
 * lives in the same spot a real "Generate" button will fill in later.
 */
/**
 * Real data for a client's writing-function prompts — confirmed
 * (landed) placements only, matching the same "confirmed" definition
 * getRealMetrics() uses for Total Publicity Value, plus that client's
 * real active campaign names as context. No invented figures reach the
 * prompt: an unconfirmed placement or a client with zero real campaigns
 * just means a shorter/emptier input, never a guessed stand-in.
 */
/**
 * Everything the AI writing prompts can honestly be told about a client.
 *
 * This used to hand over three fields — placements, totalAVE and a campaign
 * name — and hardcode `totalReach: "not tracked in this build"`, which was
 * simply untrue: audienceReach is a real schema field, populated on the
 * seeded placements. `notableDetails` was always an empty array even though
 * campaign milestones and placement notes were sitting right there. The
 * drafts read thin because the model was being starved, not because it
 * couldn't write.
 *
 * Everything below is real data already in the system. Nothing is invented
 * to pad a report — where a figure genuinely isn't known, the prompt is
 * told that plainly so it says so rather than writing around the gap.
 */
function realWritingContextFor(clientName) {
  const placements = getRealPlacements(clientName).filter((p) => Boolean(p.landedDate));
  const metrics = getRealMetrics(clientName);
  const campaigns = loadCampaigns().filter((c) => c.client === clientName);
  const activeCampaignNames = campaigns.filter((c) => c.status === "active").map((c) => c.name);
  const profile = getClientProfile(clientName) || {};

  // Reach is per-placement; sum what exists rather than claiming it isn't
  // tracked. Null (not 0) when no placement carries one — same unknown-is-
  // not-zero rule used for AVE.
  const withReach = placements.filter((p) => p.audienceReach != null);
  const totalReach = withReach.length ? withReach.reduce((sum, p) => sum + p.audienceReach, 0) : null;

  // Real specifics worth naming in a narrative, drawn from records that
  // already exist: campaign milestones the owner actually ticked off, and
  // the sourced detail captured on each placement.
  const notableDetails = [
    ...campaigns.flatMap((c) => (c.milestones || []).filter((m) => m.done).map((m) => `${c.name}: ${m.text}`)),
    ...placements
      .filter((p) => p.notes && !/recording-date placeholder/i.test(p.notes))
      .map((p) => `${p.publication}: ${String(p.notes).split(/\.\s/)[0]}.`),
  ].slice(0, 8);

  // A real date range beats "the current reporting period".
  const dates = placements.map((p) => p.publicationDate || p.landedDate).filter(Boolean).sort();
  const periodLabel = dates.length
    ? dates[0] === dates[dates.length - 1]
      ? dates[0]
      : `${dates[0]} to ${dates[dates.length - 1]}`
    : "the current reporting period";

  return {
    placements,
    totalAVE: metrics.totalAVE,
    totalReach,
    periodLabel,
    notableDetails,
    clientIndustry: profile.industry || "",
    engagementType: profile.engagementType || "",
    campaignContext: activeCampaignNames.length
      ? activeCampaignNames.join(", ")
      : campaigns.length
        ? `${campaigns.map((c) => c.name).join(", ")} (none currently marked active)`
        : "no campaign on file for this client",
  };
}

function renderSummaryForm(container, clientName) {
  const existing = loadSummary(clientName);
  const statusLine = existing?.approvedAt
    ? `<p class="hint" style="margin:0 0 10px; color:var(--color-teal); font-weight:600;">✓ Approved ${escapeHtml(existing.approvedAt.slice(0, 10))} — eligible for inclusion in a Canva export.</p>`
    : existing
      ? `<p class="hint" style="margin:0 0 10px;">Saved as a draft, not yet approved — won't be included in a Canva export until it is.</p>`
      : `<p class="hint" style="margin:0 0 10px;">No draft saved yet.</p>`;

  container.innerHTML = `
    <p style="margin:0 0 8px; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Executive Summary</p>
    <p class="hint" style="margin:0 0 10px;">"Generate" drafts from ${escapeHtml(clientName)}'s real confirmed placements below — always a starting point to edit, never saved automatically. It shows up on ${escapeHtml(clientName)}'s report above and on their own dashboard once you save it.</p>
    <p class="hint" style="margin:0 0 10px;">Tenyse's own case studies follow Problem → Solution → Results — worth keeping that shape here too.</p>
    ${statusLine}
    <div class="entry-form">
      <div class="field-row" style="margin-bottom:10px;">
        <textarea id="summary-text-${cssId(clientName)}" class="report-ai-textarea" rows="10" placeholder="e.g. [Problem] Coverage was limited to local outlets. [Solution] We pitched an industry-specific angle to trade press. [Results] Landed 3 placements reaching 200K+ readers, building toward national pickup next period.">${existing ? existing.text : ""}</textarea>
      </div>
      <div class="form-actions" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button type="button" class="btn-primary" id="summary-save-${cssId(clientName)}">Save Draft</button>
        <button type="button" class="btn-secondary" id="summary-approve-${cssId(clientName)}" ${!existing ? "disabled" : ""} title="${!existing ? "Save a draft first" : "Approves the saved draft above — not unsaved edits in the box"}">Approve</button>
        <button type="button" class="btn-secondary" id="summary-generate-${cssId(clientName)}">Generate with AI</button>
        <span id="summary-generate-status-${cssId(clientName)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>
    </div>
  `;

  container.querySelector(`#summary-save-${cssId(clientName)}`).addEventListener("click", () => {
    const text = container.querySelector(`#summary-text-${cssId(clientName)}`).value;
    saveSummary(clientName, text);
    saveClientReportDraft({ clientName, executiveSummary: text });
    renderReportsView();
  });

  const approveBtn = container.querySelector(`#summary-approve-${cssId(clientName)}`);
  if (approveBtn && !approveBtn.disabled) {
    approveBtn.addEventListener("click", () => {
      const summary = loadSummary(clientName);
      approveSummary(clientName);
      if (summary?.text) approveClientReport({ clientName, executiveSummary: summary.text });
      renderReportsView();
    });
  }

  const generateBtn = container.querySelector(`#summary-generate-${cssId(clientName)}`);
  const generateStatus = container.querySelector(`#summary-generate-status-${cssId(clientName)}`);
  if (!generateBtn) return;
  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    generateStatus.textContent = "Drafting an executive summary...";
    const ctx = realWritingContextFor(clientName);
    const result = await generateAIText("executive-summary", {
      client: clientName,
      periodLabel: ctx.periodLabel,
      placements: ctx.placements,
      totalAVE: ctx.totalAVE,
      totalReach: ctx.totalReach,
      campaignContext: ctx.campaignContext,
      clientIndustry: ctx.clientIndustry,
      notableDetails: ctx.notableDetails,
    });
    generateBtn.disabled = false;
    if (result.ok) {
      container.querySelector(`#summary-text-${cssId(clientName)}`).value = result.text;
      generateStatus.textContent = "Draft ready — review, then Save Draft.";
    } else {
      generateStatus.textContent = result.message;
    }
  });
}

/**
 * Report narrative — the fuller campaign-story writing function
 * (docs/reportNarrativePrompt.js), distinct from the short executive
 * summary card above. No storage exists for this one: it's meant to be
 * generated, reviewed, and copied into the actual report document/Canva
 * hand-off by hand, not saved/approved in this app — there's nowhere in
 * the data model for a "report narrative" to live yet, and inventing one
 * just to hold AI output would be exactly the kind of unreviewed
 * auto-final path this build avoids everywhere else.
 */
function renderReportNarrativeForm(container, clientName) {
  container.innerHTML = `
    <p style="margin:0 0 8px; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Report Narrative</p>
    <p class="hint" style="margin:0 0 10px;">The fuller campaign story for the report document — longer and more scene-setting than the Executive Summary card above. Generate it from the same placement data, review it, then copy it into Tenyse's final client-facing report.</p>
    <div class="entry-form">
      <div class="field-row" style="margin-bottom:10px;">
        <textarea id="narrative-text-${cssId(clientName)}" class="report-ai-textarea report-narrative-textarea" rows="12" placeholder="Click Generate to draft this from ${escapeHtml(clientName)}'s real confirmed placements." readonly></textarea>
      </div>
      <div class="form-actions" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button type="button" class="btn-secondary" id="narrative-generate-${cssId(clientName)}">Generate</button>
        <button type="button" class="btn-secondary" id="narrative-copy-${cssId(clientName)}" disabled>Copy Narrative</button>
        <span id="narrative-generate-status-${cssId(clientName)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>
    </div>
  `;

  const generateBtn = container.querySelector(`#narrative-generate-${cssId(clientName)}`);
  const copyBtn = container.querySelector(`#narrative-copy-${cssId(clientName)}`);
  const statusEl = container.querySelector(`#narrative-generate-status-${cssId(clientName)}`);
  if (!generateBtn) return;
  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    statusEl.textContent = "Drafting the report narrative...";
    const ctx = realWritingContextFor(clientName);
    const result = await generateAIText("report-narrative", {
      client: clientName,
      periodLabel: ctx.periodLabel,
      placements: ctx.placements,
      campaignContext: ctx.campaignContext,
      notableDetails: ctx.notableDetails,
      totalAVE: ctx.totalAVE,
      totalReach: ctx.totalReach,
      clientIndustry: ctx.clientIndustry,
    });
    generateBtn.disabled = false;
    const textarea = container.querySelector(`#narrative-text-${cssId(clientName)}`);
    if (result.ok) {
      textarea.value = result.text;
      copyBtn.disabled = false;
      statusEl.textContent = "Draft ready — review, then copy into the final report.";
    } else {
      statusEl.textContent = result.message;
    }
  });

  copyBtn?.addEventListener("click", async () => {
    const textarea = container.querySelector(`#narrative-text-${cssId(clientName)}`);
    if (!textarea.value.trim()) return;
    try {
      await navigator.clipboard.writeText(textarea.value);
      statusEl.textContent = "Narrative copied.";
    } catch {
      textarea.select();
      document.execCommand("copy");
      statusEl.textContent = "Narrative copied.";
    }
  });
}

function cssId(str) {
  return String(str).replace(/[^a-zA-Z0-9]+/g, "-");
}

function reportsMetricCard({ label, value, delta, icon, iconBg, tooltip, target, actionLabel }) {
  const deltaHtml =
    delta == null
      ? `<p class="metric-delta" style="color:var(--text-secondary);">No prior-period comparison yet</p>`
      : `<p class="metric-delta ${delta >= 0 ? "positive" : "negative"}">${delta >= 0 ? "\u2191" : "\u2193"} ${Math.abs(delta)}% vs previous period</p>`;
  const interactiveClass = target ? " is-interactive" : "";
  const interactionAttrs = target ? ` role="button" tabindex="0" data-metric-goto="${escapeHtml(target)}"` : "";
  return `
    <div class="card metric-card owner-metric-card${interactiveClass}"${interactionAttrs}>
      <div class="metric-top">
        <span class="metric-label">${escapeHtml(label)}${tooltip ? ` <span class="info-icon metric-info-icon" aria-hidden="true">i</span>` : ""}</span>
        <span class="metric-icon" style="background:${iconBg}">${icon}</span>
      </div>
      <p class="metric-value">${escapeHtml(value)}</p>
      ${deltaHtml}
      ${
        tooltip
          ? `<div class="metric-hover-panel" role="tooltip">
        <strong>${escapeHtml(label)}</strong>
        <p>${escapeHtml(tooltip)}</p>
        ${actionLabel ? `<span>${escapeHtml(actionLabel)}</span>` : ""}
      </div>`
          : ""
      }
    </div>
  `;
}

/**
 * The cross-client "Reports & Results" overview: filters, four headline
 * metrics, a weekly trend chart, a media-type donut, per-client
 * performance, and recently approved summaries as "reports." Renders
 * above the existing per-client executive-summary/narrative/Canva-export
 * cards (renderReportsView below) rather than replacing them — those are
 * real, working generation tools and stay exactly where they are.
 *
 * "vs previous period" deltas are computed for real (see
 * getReportsOverviewSummary's own comment on the split-sample method) and
 * show "No prior-period comparison yet" rather than an invented
 * percentage when there isn't enough data to compare — a trend arrow
 * with no basis behind it would be indistinguishable from a real one on
 * screen, unlike a flagged dollar estimate.
 *
 * Media type is a name-based classification (mediaType.js), not
 * confirmed per-placement data — labelled as such in the card heading.
 */
function renderReportsOverview(container) {
  const summary = getReportsOverviewSummary();
  const { metrics, weeklyTrend, mediaTypeBreakdown, clientPerformance } = summary;

  const approvedSummaries = getRealClients()
    .map((c) => ({ client: c.name, summary: loadSummary(c.name) }))
    .filter((r) => r.summary?.approvedAt)
    .sort((a, b) => (a.summary.approvedAt < b.summary.approvedAt ? 1 : -1));

  container.innerHTML = `
    <div class="section-heading"><h2>Reports &amp; Results</h2></div>
    <p class="hint" style="margin:-8px 0 20px;">Cross-client performance from every real placement on file.</p>

    <div class="owner-metrics-grid" style="margin-bottom:24px;">
      ${reportsMetricCard({
        label: "Total Publicity Value (AVE)",
        value: formatCompactCurrency(metrics.totalAVE),
        delta: metrics.aveDelta,
        icon: "$",
        iconBg: "#fbe2da",
        tooltip: "The estimated paid-media equivalent of visible press coverage. Hovering here gives context; opening it takes you to the report builder where this becomes client-ready copy.",
        target: "reports",
        actionLabel: "Build a client report",
      })}
      ${reportsMetricCard({
        label: "Total Press Placements",
        value: String(metrics.totalPlacements),
        delta: metrics.placementsDelta,
        icon: "\u25a6",
        iconBg: "#e1f2f0",
        tooltip: "The confirmed press wins currently feeding reports, analytics, and campaign value. Click through to inspect the source placements.",
        target: "placements",
        actionLabel: "Inspect placement sources",
      })}
      ${reportsMetricCard({
        label: "Active Clients",
        value: String(metrics.activeClients),
        delta: null,
        icon: "\u25ce",
        iconBg: "#e9ecff",
        tooltip: "Clients currently represented in the reporting set. This helps Tenyse see who has enough tracked activity for a meaningful client update.",
        target: "clients",
        actionLabel: "Open client list",
      })}
      ${reportsMetricCard({
        label: "Avg. Audience Reach",
        value: metrics.avgReach ? metrics.avgReach.toLocaleString() : "—",
        delta: metrics.reachDelta,
        icon: "\u25c8",
        iconBg: "#fdf0d8",
        tooltip: "Average outlet audience size across placements with reach data. It is a visibility signal, not a guarantee of individual article readers.",
        target: "analytics",
        actionLabel: "Explore analytics",
      })}
    </div>

    <div class="analytics-grid" style="margin-bottom:24px;">
      <div class="card">
        <h3 style="margin-top:0;">Placement Trends ${sectionInfoButton({ title: "Placement Trends", body: "Press placements landed and their estimated reach, grouped by week across every visible client. Reach here means audience size at the outlet, not confirmed readers of this specific piece — it's the same sourced-or-flagged figure used everywhere else in this app." })}</h3>
        <div id="reports-weekly-trend"></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Placements by Media Type ${sectionInfoButton({ title: "Placements by Media Type", body: "Every confirmed placement classified as Online, TV, Radio, or Other. Classified automatically from the outlet's name (e.g. Forbes = Online, PIX11 = TV) — this is a lookup, not something Tenyse confirmed per placement, so treat it as a helpful grouping rather than an audited breakdown." })}</h3>
        <p class="hint" style="margin:0 0 12px;">Classified from outlet name, not confirmed per placement — see Press Placements for the source outlet.</p>
        <div id="reports-media-type"></div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <h3 style="margin-top:0;">Client Performance ${sectionInfoButton({ title: "Client Performance", body: "One row per client: total confirmed placements, total AVE, estimated combined reach, and the outlets that ran the most coverage. Status (active/past/unconfirmed) mirrors what's set on the Clients page. A client showing 0 placements and — simply has no confirmed placements yet, not a data error." })}</h3>
      <div class="table-scroll">
        <table class="placements-table">
          <thead><tr><th>Client</th><th>Placements</th><th>AVE</th><th>Est. Reach</th><th>Top Outlets</th><th>Status</th></tr></thead>
          <tbody>
            ${clientPerformance
              .map(
                (r) => `
              <tr>
                <td><strong>${escapeHtml(r.client)}</strong></td>
                <td class="numeric">${r.totalPlacements}</td>
                <td class="numeric">${formatCurrency(r.totalAVE)}</td>
                <td class="numeric">${r.totalReach ? r.totalReach.toLocaleString() : "—"}</td>
                <td>${r.topOutlets.map((o) => escapeHtml(o)).join(", ") || "—"}</td>
                <td><span class="status-badge">${escapeHtml(r.status)}</span></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <h3 style="margin-top:0;">Approved Reports ${sectionInfoButton({ title: "Approved Reports", body: "Lists every client whose Executive Summary has been approved below (not just saved as a draft). Approval is what makes a summary eligible for inclusion in a Canva export — a saved-but-unapproved draft is treated as if no summary exists yet. Click View to jump to that client's report section." })}</h3>
      ${
        approvedSummaries.length
          ? `<div class="table-scroll"><table class="placements-table">
               <thead><tr><th>Client</th><th>Approved</th><th></th></tr></thead>
               <tbody>${approvedSummaries
                 .map(
                   (r) => `<tr><td><strong>${escapeHtml(r.client)}</strong></td><td>${escapeHtml(r.summary.approvedAt.slice(0, 10))}</td><td><button type="button" class="link-btn" data-view-report="${escapeHtml(r.client)}">View</button></td></tr>`
                 )
                 .join("")}</tbody>
             </table></div>`
          : `<p class="hint" style="margin:0;">No executive summaries approved yet — approve one below to see it listed here.</p>`
      }
    </div>
  `;
  wireMetricCardNavigation(container);

  renderWeeklyTrendChart(document.getElementById("reports-weekly-trend"), weeklyTrend);
  renderDonutChart(document.getElementById("reports-media-type"), {
    data: mediaTypeBreakdown,
    centerLabel: "Placements",
    centerValue: metrics.totalPlacements,
  });
  container.querySelectorAll("[data-view-report]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(`report-${slugifyClientId(btn.dataset.viewReport)}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function slugifyClientId(name) {
  return getRealClients().find((c) => c.name === name)?.id || "";
}

function renderReportsView() {
  const target = document.getElementById("reports-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });

  if (state.demoState === "empty") {
    target.innerHTML = `<div class="section-heading"><h2>Reports</h2></div><div id="reports-empty"></div>`;
    renderReportCard(document.getElementById("reports-empty"), null);
    return;
  }

  const clients = state.dataSource === "real" ? getRealClients() : CLIENTS;
  const getApprovedSummary = (clientName) => {
    const summary = loadSummary(clientName);
    return summary?.approvedAt ? summary : null;
  };
  const getExportDateRangeForClient = (clientName) => {
    const dates = getAllRealPlacements()
      .filter((p) => (p.client || p.clientName) === clientName && p.landedDate)
      .map((p) => p.publicationDate || p.landedDate)
      .filter(Boolean)
      .sort();
    if (!dates.length) return null;
    return { startDate: dates[0], endDate: dates[dates.length - 1] };
  };
  const downloadCanvaCsvForClient = (clientName, { startDate = "", endDate = "" } = {}) => {
    const result = generateCanvaExport(getAllRealPlacements(), {
      clientName,
      startDate,
      endDate,
      approvedSummary: getApprovedSummary(clientName),
    });
    if (result.ok) downloadCsv(result.csv, result.filename);
    return result;
  };
  target.innerHTML = `
    ${state.dataSource === "real" ? `<div id="reports-overview-wrap" style="margin-bottom:32px;"></div>` : ""}
    <div class="section-heading"><h2>Report Builder ${sectionInfoButton({ title: "Report Builder", body: "A guided path from tracked placements to client-ready report assets: generate an executive summary, save and approve it, draft the longer narrative, download a PDF preview, and export the CSV for Canva Bulk Create. The AI drafts from placement data already in the system; Tenyse still reviews and approves what goes to the client." })}</h2></div>
    <p class="hint" style="margin:-8px 0 20px;">Turn confirmed placements into a reviewed client report package: summary, narrative, PDF preview, and Canva CSV export.</p>
    <div class="report-builder-steps" aria-label="Report builder workflow">
      <div><span>1</span><strong>Choose client</strong><small>Select the client and reporting window.</small></div>
      <div><span>2</span><strong>Draft with AI</strong><small>Generate summary and full narrative from placements.</small></div>
      <div><span>3</span><strong>Review + approve</strong><small>Tenyse edits before anything becomes client-facing.</small></div>
      <div><span>4</span><strong>Export</strong><small>Download PDF preview and Canva-ready CSV.</small></div>
    </div>
    <div class="section" id="canva-export-wrap"></div>
    ${clients
      .map(
        (c) => `
      <div class="section report-builder-client-section">
        <div class="report-builder-client-heading">
          <div>
            <p class="eyebrow">Client Report</p>
            <h3>${c.name}</h3>
          </div>
          <button type="button" class="link-btn" data-export-client="${escapeHtml(c.name)}">Export CSV</button>
        </div>
        <div class="report-builder-grid">
          <div>
            ${state.dataSource === "real" ? `<div class="card report-work-card" id="summary-form-${c.id}"></div>` : ""}
            ${state.dataSource === "real" ? `<div class="card report-work-card" id="report-narrative-${c.id}"></div>` : ""}
          </div>
          <div id="report-${c.id}"></div>
        </div>
      </div>`
      )
      .join("")}
  `;
  if (state.dataSource === "real") renderReportsOverview(document.getElementById("reports-overview-wrap"));

  clients.forEach((c) => {
    const report = state.dataSource === "real" ? getRealReport(c.name) : REPORTS[c.id] || null;
    renderReportCard(document.getElementById(`report-${c.id}`), report);

    if (state.dataSource === "real") {
      renderSummaryForm(document.getElementById(`summary-form-${c.id}`), c.name);
      renderReportNarrativeForm(document.getElementById(`report-narrative-${c.id}`), c.name);
    }
  });

  target.querySelectorAll("[data-export-client]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const clientName = btn.dataset.exportClient;
      const range = getExportDateRangeForClient(clientName) || {};
      const result = downloadCanvaCsvForClient(clientName, range);
      if (!result.ok) {
        alert(result.message || "This client does not have export-ready report data yet.");
      }
      document.getElementById("canva-export-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const exportWrap = document.getElementById("canva-export-wrap");
  if (state.dataSource === "real") {
    // Only ever returns a summary that's actually approved — a saved-but-
    // unapproved draft must read as "no summary" to the export panel, the
    // same way generateCanvaExport treats it. Keeps the "never leak a
    // draft into a client-facing export" rule enforced at every layer that
    // touches this data, not just the one closest to the CSV itself.
    renderCanvaExportPanel(exportWrap, {
      clients: getRealClients(),
      getSummaryStatus: getApprovedSummary,
      getDateRangeForClient: getExportDateRangeForClient,
      onGenerate: ({ clientName, startDate, endDate }) => {
        if (!clientName) return { ok: false, reason: "no_placements", message: "Choose a client first." };
        return downloadCanvaCsvForClient(clientName, { startDate, endDate });
      },
    });
  } else {
    // Correction: this used to read "Sign in with the live owner account"
    // — wrong diagnosis. The panel was never gated on sign-in; it's gated
    // on dataSource === "real" (false only in Mock mode), so the message
    // has to say what actually unblocks it.
    exportWrap.innerHTML = `
      <p style="color:var(--text-secondary); font-size:0.85rem;">
        Switch the sidebar's data source to "Real" to generate a Canva export from confirmed placement data.
      </p>
    `;
  }
}

function renderAnalyticsView() {
  const container = document.getElementById("analytics-content");
  if (state.dataSource !== "real") {
    container.innerHTML = `
      <div class="section-heading"><h2>Analytics</h2></div>
      <div class="card"><p>Switch the sidebar's data source to "Real" to see cross-client analytics.</p></div>
    `;
    return;
  }
  const summary = getAnalyticsSummary();
  container.innerHTML = `
    <div class="section-heading"><h2>Analytics ${sectionInfoButton({ title: "Analytics", body: "Cross-client breakdowns built from every real placement and client record on file — AVE by client, placement status, sentiment, and lead time. Where a real value isn't known (no sentiment set, no pitch date on record), that shows as its own honest category rather than being folded into an average or guessed at — see each card below for specifics." })}</h2></div>
    <p class="hint" style="margin:-4px 0 20px;">Cross-client breakdowns from every real placement and client record on file. Where a real value is not known, that is shown explicitly rather than guessed — see each card for what that means here.</p>
    <div class="analytics-grid">
      <div class="card">
        <h3 style="margin-top:0;">Publicity Value by Client</h3>
        <div id="analytics-ave-by-client"></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Client Status</h3>
        <div id="analytics-status"></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Coverage Sentiment</h3>
        <div id="analytics-sentiment"></div>
      </div>
      <div class="card">
        <h3 style="margin-top:0;">Average Lead Time</h3>
        <div id="analytics-lead-time"></div>
      </div>
    </div>
  `;
  renderAveByClientChart(document.getElementById("analytics-ave-by-client"), summary.aveByClient);
  renderStatusBreakdownChart(document.getElementById("analytics-status"), summary.statusBreakdown);
  renderSentimentChart(document.getElementById("analytics-sentiment"), summary.sentimentBreakdown);
  renderLeadTimeSection(document.getElementById("analytics-lead-time"), summary.leadTime);

  const openAnalyticsDrilldown = (el) => {
    const action = el.dataset.analyticsAction;
    const value = el.dataset.analyticsValue;
    if (action === "client") {
      state.dashboardClientFilter = value;
      state.dashboardDateFrom = "";
      state.dashboardDateTo = "";
      navigate("dashboard");
      return;
    }
    if (action === "status") {
      state.clientStatusFilter = value === "past" || value === "active" || value === "unconfirmed" ? value : "all";
      navigate("clients");
      return;
    }
    if (action === "sentiment") {
      navigate("placements");
    }
  };

  container.querySelectorAll("[data-analytics-action]").forEach((el) => {
    el.addEventListener("click", () => openAnalyticsDrilldown(el));
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openAnalyticsDrilldown(el);
    });
  });
}

function renderSettingsView() {
  const devTools = showDevTools();
  document.getElementById("settings-content").innerHTML = `
    <div class="section-heading"><h2>Settings</h2></div>
    <div class="card">
      <p>Platform preferences and connected services live here. Google Workspace is intentionally deferred until after Demo Day; the build uses sample lead-time data for the walkthrough.</p>
    </div>
    <div class="section-heading" style="margin-top:24px;"><h2>Outlet Rates</h2></div>
    <div class="card">
      <div id="outlet-rates-wrap"></div>
    </div>
    ${
      devTools
        ? `<div class="section-heading" style="margin-top:24px;"><h2>Error Log</h2></div>
          <div class="card">
            <p class="hint" style="margin:0 0 12px;">
              Client-side failures and calculation errors land here during testing.
            </p>
            <div id="error-log-wrap"></div>
          </div>`
        : ""
    }
    <div class="section-heading" style="margin-top:24px;"><h2>Google Workspace</h2></div>
    <div class="card">
      <p style="margin:0 0 10px;">Google Workspace connection is on hold until after Demo Day.</p>
      <p class="hint" style="margin:0 0 10px;">For the demo, lead time uses sample values and meeting scheduling shows a walkthrough confirmation instead of creating a real Calendar event.</p>
      <p id="google-workspace-status" class="hint" style="margin:0 0 10px;">Google Workspace deferred; sample data active.</p>
      <ul style="margin:0; padding-left:18px; color:var(--text-secondary); font-size:0.86rem;">
        <li>Client note notifications: post-demo Gmail connection.</li>
        <li>Client meeting scheduling: demo confirmation now, real Google Calendar event post-demo.</li>
        <li>Lead time support: sample values now, Gmail pitch-date lookup post-demo.</li>
      </ul>
    </div>
    ${
      devTools
        ? `<div class="section-heading" style="margin-top:24px;"><h2>Data Seeding Tools</h2></div>
          <div class="card">
            <p class="hint" style="margin:0 0 12px;">Testing-only tools for loading case-study and coaching records into the local dataset.</p>
            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
              <button class="btn-secondary" id="seed-real-case-study-btn">Load Real Case Study Data</button>
              <button class="btn-secondary" id="seed-greyz-coaching-btn">Load Greyz Bistro Coaching Data</button>
              <button class="btn-secondary" id="seed-sample-data-btn">Load Sample Placements</button>
            </div>
            <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px; font-size:0.85rem; color:var(--text-secondary);">
              <span id="seed-real-case-study-result"></span>
              <span id="seed-greyz-coaching-result"></span>
              <span id="seed-sample-data-result"></span>
            </div>
          </div>`
        : ""
    }
  `;

  renderOutletRatesView(document.getElementById("outlet-rates-wrap"));
  if (devTools) renderErrorLogPanel(document.getElementById("error-log-wrap"));
  loadGoogleWorkspaceStatus();

  document.getElementById("seed-real-case-study-btn")?.addEventListener("click", () => {
    const { placementsAdded, campaignsAdded, summariesApproved, clientsAdded } = seedRealCaseStudyData();
    document.getElementById("seed-real-case-study-result").textContent =
      placementsAdded > 0 || campaignsAdded > 0 || clientsAdded > 0
        ? `Added ${placementsAdded} placement(s), ${campaignsAdded} campaign(s), ${clientsAdded} client profile(s), approved ${summariesApproved} executive summar${summariesApproved === 1 ? "y" : "ies"}.`
        : `Already loaded — refreshed ${summariesApproved} executive summar${summariesApproved === 1 ? "y" : "ies"}.`;
  });

  document.getElementById("seed-greyz-coaching-btn")?.addEventListener("click", () => {
    if (!findClientByName("Greyz Bistro")) {
      alert('Load "Real Case Study Data" first (adds Greyz Bistro as a client) before loading its coaching program data.');
      return;
    }
    const { phasesAdded, opportunitiesAdded, resourcesAdded } = seedGreyzBistroCoachingData();
    document.getElementById("seed-greyz-coaching-result").textContent =
      phasesAdded > 0 || opportunitiesAdded > 0 || resourcesAdded > 0
        ? `Added ${phasesAdded} phase(s), ${opportunitiesAdded} opportunit${opportunitiesAdded === 1 ? "y" : "ies"}, ${resourcesAdded} resource/checklist item(s).`
        : "Already loaded — nothing new to add.";
  });

  document.getElementById("seed-sample-data-btn")?.addEventListener("click", () => {
    if (!confirm("This adds 5 sample placements to your real placement data. Continue?")) return;
    const count = seedSamplePlacements();
    document.getElementById("seed-sample-data-result").textContent = `Added ${count} sample placements.`;
  });
}

function renderCurrentView() {
  switch (state.view) {
    case "dashboard":
      return renderDashboard();
    case "clients":
      return renderClientsView();
    case "campaigns":
      return renderCampaignsView();
    case "placements":
      return renderPlacementsView();
    case "reviewqueue":
      return renderReviewQueueView();
    case "reports":
      return renderReportsView();
    case "analytics":
      return renderAnalyticsView();
    case "coaching":
      return renderCoachingView();
    case "settings":
      return renderSettingsView();
    case "campaign-detail":
      return renderCampaignDetailView();
  }
}

function renderCoachingView() {
  syncOwnerCoachingFromSupabase();
  const greyzProfile = findClientByName("Greyz Bistro");
  if (state.dataSource === "real" && greyzProfile && loadPhasesForClient("Greyz Bistro").length === 0) {
    seedGreyzBistroCoachingData();
  }
  const coachingClients =
    state.dataSource === "real"
      ? getClientsWithMetrics()
          .map((c) => c.profile)
          .filter((profile) => profile && (profile.engagementType === "coaching" || profile.engagementType === "pr_and_coaching"))
      : [];
  const initialClient = state.coachingSelectedClient || null;
  state.coachingSelectedClient = "";
  renderCoachingAdminView(document.getElementById("coaching-content"), {
    coachingClients,
    initialClient,
    // Preview mode reads/writes local storage (localCoachingDataForClient
    // + the saveLocal*/removeLocal* handlers below) instead of null — the
    // seed data was already there, nothing was ever passed a function to
    // read it back.
    coachingDataForClient: shouldUseOwnerApi() ? coachingDataForClient : localCoachingDataForClient,
    syncStatus: shouldUseOwnerApi() ? state.realCoachingSync : "local",
    syncMessage: state.realCoachingSyncMessage,
    onLoadTemplate: shouldUseOwnerApi()
      ? async (clientName, template) => {
          let nextData = null;
          for (const phase of template.phases) {
            nextData = await createRealCoachingPhase(clientName, {
              phaseNumber: phase.phaseNumber,
              name: phase.name,
              weeks: phase.weeks,
              vaam: phase.vaam,
              deliverables: phase.defaultDeliverables,
              goal: template.placeholderGoal || "",
            });
          }
          return nextData;
        }
      : null,
    onSavePhase: shouldUseOwnerApi() ? saveRealCoachingPhase : saveLocalCoachingPhase,
    onAddHomework: shouldUseOwnerApi() ? createRealHomework : createLocalHomework,
    onSaveHomework: shouldUseOwnerApi() ? saveRealHomework : saveLocalHomework,
    onRemoveHomework: shouldUseOwnerApi() ? removeRealHomework : removeLocalHomework,
    onSaveOpportunity: shouldUseOwnerApi() ? saveRealOpportunity : saveLocalOpportunity,
    onRemoveOpportunity: shouldUseOwnerApi() ? removeRealOpportunity : removeLocalOpportunity,
    onSaveResource: shouldUseOwnerApi() ? saveRealResource : saveLocalResource,
    onRemoveResource: shouldUseOwnerApi() ? removeRealResource : removeLocalResource,
  });
}

function showCampaignDetail(id) {
  state.selectedCampaignId = id;
  navigate("campaign-detail");
}

function renderCampaignDetailView() {
  const target = document.getElementById("campaign-detail-content");
  const campaign = getAllCampaigns().find((c) => c.id === state.selectedCampaignId);

  if (!campaign) {
    target.innerHTML = `<p>Campaign not found.</p><button class="link-btn" id="campaign-detail-back">&larr; Back to Campaigns</button>`;
    document.getElementById("campaign-detail-back").addEventListener("click", () => navigate("campaigns"));
    return;
  }

  const placements = getAllPlacements().filter((p) => p.campaign === campaign.name && p.clientName === campaign.clientName);

  renderCampaignDetail(target, {
    campaign,
    placements,
    notes: loadNotesForCampaign(campaign.id),
    currentUser: { role: "owner", name: "Tenyse Williams" },
    showClient: true,
    onBack: () => navigate("campaigns"),
    onAddNote: (body, currentUser) => {
      try {
        addNote({ campaignId: campaign.id, authorRole: currentUser.role, authorName: currentUser.name, body });
        renderCampaignDetailView();
      } catch (err) {
        alert(err.message);
      }
    },
    onGenerateActivitySummary: ({ campaign: camp, placements: campPlacements, notes }) => {
      // "Since" the campaign's own start date if known, otherwise a
      // rolling 7 days — either way, real placements/notes are filtered
      // by an actual date, never just "everything ever," matching the
      // prompt's own "near-real-time check-in" framing.
      const sinceDate = camp.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const newPlacements = campPlacements.filter((p) => p.landedDate && p.landedDate >= sinceDate);
      return generateAIText("campaign-activity-summary", {
        client: camp.clientName,
        campaignName: camp.name,
        sinceDate,
        newPlacements,
        milestonesUpdated: [], // no per-milestone timestamp exists yet to say which changed "since" a date
        recentNotes: notes,
      });
    },
    onGeneratePitchSuggestions: ({ campaign: camp, placements: campPlacements, targetOutlet }) =>
      generateAIText("language-suggestions", {
        mode: "pitch",
        client: camp.clientName,
        targetOutlet,
        campaignAngle: camp.name,
        existingCoverage: campPlacements.filter((p) => p.landedDate),
      }),
  });
}

// ---------------------------------------------------------------------------
// Chrome (sidebar/header) + navigation
// ---------------------------------------------------------------------------

function renderSidebarComponent() {
  renderOwnerSidebar(document.getElementById("owner-sidebar"), {
    ownerName: "Tenyse Williams",
    sessionEmail: session ? session.email : null,
    // Only a real Supabase sign-in sets session.real (loginApp.js). The
    // ?demo=owner link loads a mock account carrying the same name and
    // email, which is why the sidebar could claim to be logged in while
    // every live feature was gated.
    isRealSession: Boolean(session?.real),
    currentView: state.view,
    demoState: state.demoState,
    dataSource: state.dataSource,
    showDevControls: new URLSearchParams(location.search).get("dev") === "1",
    onNavigate: navigate,
    onDemoStateChange: setDemoState,
    onDataSourceChange: setDataSource,
    onLogout: async () => {
      await signOutReal();
      logout();
      window.location.href = "login.html";
    },
    onClose: closeSidebarMobile,
  });
}

const OWNER_HEADER_CONTEXT = {
  dashboard: {
    contextLabel: "Owner Dashboard",
    greeting: "Welcome back, Tenyse!",
    subtitle: "Here's what's happening across all clients.",
  },
  clients: {
    contextLabel: "Owner Dashboard / Clients",
    greeting: "Clients",
    subtitle: "Manage client profiles, contacts, campaign status, and portal access.",
  },
  campaigns: {
    contextLabel: "Owner Dashboard / Campaigns (PR)",
    greeting: "Campaigns (PR)",
    subtitle: "Track PR campaigns, placements, lead time, and progress across clients.",
  },
  coaching: {
    contextLabel: "Owner Dashboard / Coaching Program",
    greeting: "Coaching Program",
    subtitle: "Manage phases, homework, resources, opportunities, and client progress.",
  },
  placements: {
    contextLabel: "Owner Dashboard / Press Placements",
    greeting: "Press Placements",
    subtitle: "Review coverage, AVE, lead time, sentiment, and publication details.",
  },
  reviewqueue: {
    contextLabel: "Owner Dashboard / Review Queue",
    greeting: "Review Queue",
    subtitle: "Review discovered coverage before adding it to a client record.",
  },
  reports: {
    contextLabel: "Owner Dashboard / Reports",
    greeting: "Reports",
    subtitle: "Draft, review, and publish client-facing PR summaries.",
  },
  analytics: {
    contextLabel: "Owner Dashboard / Analytics",
    greeting: "Analytics",
    subtitle: "Explore performance trends, media mix, reach, and client outcomes.",
  },
  settings: {
    contextLabel: "Owner Dashboard / Settings",
    greeting: "Settings",
    subtitle: "Review portal configuration and demo-day readiness.",
  },
};

function getOwnerHeaderContext() {
  if (state.view === "campaign-detail") {
    const campaign = getAllCampaigns().find((c) => c.id === state.selectedCampaignId);
    return {
      contextLabel: `Owner Dashboard / Campaigns (PR) / ${campaign?.name || "Campaign Detail"}`,
      greeting: campaign?.name || "Campaign Detail",
      subtitle: campaign?.clientName
        ? `${campaign.clientName} campaign workspace: placements, value, lead time, and notes.`
        : "Campaign workspace: placements, value, lead time, and notes.",
    };
  }

  return OWNER_HEADER_CONTEXT[state.view] || OWNER_HEADER_CONTEXT.dashboard;
}

function renderHeaderComponent() {
  const headerContext = getOwnerHeaderContext();
  renderHeader(document.getElementById("owner-header"), {
    client: { name: "Tenyse Williams", avatarInitials: "T" },
    dataSource: state.dataSource,
    contextLabel: headerContext.contextLabel,
    greeting: headerContext.greeting,
    subtitle: headerContext.subtitle,
    searchPlaceholder: "Search clients, campaigns, or programs...",
    extraAction: {
      label: "+ New Client",
      onClick: () => {
        if (!shouldUseOwnerApi()) {
          alert("Sign in with Tenyse's live owner account to add a client.");
          return;
        }
        state.editingClient = true;
        navigate("clients");
      },
    },
    onSearch: (term) => {
      state.searchTerm = term;
      if (state.view === "dashboard" || state.view === "placements") renderCurrentView();
    },
    onHamburgerClick: openSidebarMobile,
  });
}

function navigate(view) {
  state.view = view;
  document.querySelectorAll(".client-view").forEach((el) => el.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
  closeSidebarMobile();
}

function setDemoState(demoState) {
  state.demoState = demoState;
  renderSidebarComponent();
  renderCurrentView();
}

function setDataSource(dataSource) {
  state.dataSource = dataSource;
  autoSeedRealCaseStudyDataOnce();
  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}

function openSidebarMobile() {
  document.getElementById("owner-sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("visible");
}

function closeSidebarMobile() {
  document.getElementById("owner-sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("visible");
}

document.getElementById("sidebar-overlay").addEventListener("click", closeSidebarMobile);

// Runs the same seed functions Settings' "Load Real Case Study Data" /
// "Load Greyz Bistro Coaching Data" buttons trigger manually, but once,
// automatically, on this browser's first-ever visit to the real data
// source — so real clients/placements/campaigns are there the moment the
// Dashboard/Clients pages first load, not only after finding and clicking
// two buttons in Settings. Gated by a one-time flag (not re-checked every
// load) so it never fights with Tenyse's own edits later — deleting a
// case-study client or placement she doesn't want stays deleted, it won't
// silently reappear on the next page load. Both seed functions are
// already idempotent on their own (checked by name/headline, not id), so
// this is also safe if it somehow ran twice.
//
// This only covers what's in seedRealCaseStudyData.js as of when this
// flag was first set — a future screenshot batch that adds more real data
// to that file still needs the Settings buttons clicked manually once to
// reach a browser that already has this flag set, same as it always has.
const AUTO_SEED_FLAG_KEY = "vc_auto_seeded_real_case_study_data_v1";

function autoSeedRealCaseStudyDataOnce() {
  if (state.dataSource !== "real") return;
  if (localStorage.getItem(AUTO_SEED_FLAG_KEY)) return;
  seedRealCaseStudyData();
  if (findClientByName("Greyz Bistro")) {
    seedGreyzBistroCoachingData();
  }
  localStorage.setItem(AUTO_SEED_FLAG_KEY, "1");
}

installInfoPopoverDelegate();

if (session) {
  const demoParam = new URLSearchParams(location.search).get("demo");
  if (["loading", "empty", "error"].includes(demoParam)) {
    state.demoState = demoParam;
  }
  const dataParam = new URLSearchParams(location.search).get("data");
  if (["real", "mock"].includes(dataParam)) {
    state.dataSource = dataParam;
  }

  autoSeedRealCaseStudyDataOnce();
  if (state.dataSource === "real" && findClientByName("Greyz Bistro")) {
    seedGreyzBistroCoachingData();
  }
  // Runs every load, unlike the seed above — it only attaches warnings to
  // rows that already exist, never creates them, so there's nothing for it
  // to resurrect. See backfillAveDataQuality()'s own comment for why it
  // can't live inside the once-only seed.
  if (state.dataSource === "real") backfillAveDataQuality();
  // Same discovery as inventDemoDayGapsForPreview below: this session's
  // outlet-rate-derived AVE for SNAP Co. and Houston Housing Authority
  // reached Supabase only. Mirrors it into the preview's separate store.
  if (state.dataSource === "real") applyOutletRatesToPreviewPlacements();
  // Preview-mode ("?demo=owner") counterpart to
  // scripts/invent-demo-day-gaps.mjs — the local, localStorage-backed data
  // this preview reads is a separate store from the real Supabase database
  // that script updated, so fixing one was never going to change the
  // other. Owner's explicit, twice-stated direction: invent for Demo Day,
  // revert once real values exist. See that function's own comment.
  if (state.dataSource === "real") inventDemoDayGapsForPreview();
  // Same reasoning, different data: the seeded executive summaries were
  // written in Markdown, and a browser that already seeded keeps that copy
  // until it's rewritten in place. Runs every load; a summary with no
  // Markdown is left alone.
  normalizeStoredSummaryFormatting();

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}
