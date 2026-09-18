import { CLIENTS, METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, AGGREGATE_INSIGHT, REPORTS } from "../client/mockData.js";
import {
  getRealClients,
  getClientProfile,
  getRealMetrics,
  getRealPlacements,
  getRealCampaigns,
  getAllRealPlacements,
  getAllRealCampaigns,
  getAggregateRealMetrics,
  getAggregateRealChartSeries,
  getAggregateRealInsight,
  getRealReport,
} from "../realDataSource.js";
import { computeLeadTimeDays, formatCurrency } from "../calculations.js";
import { requireSession, logout } from "../auth.js?v=20260916-demo-route-2";
import { getAccessToken, signOutReal } from "../supabaseAuthClient.js";
import { createPlacement, applyPlacementEdit } from "../schema.js";
import { addPlacement, updatePlacement, deletePlacement, upsertPlacement } from "../storage.js";
import { createCampaign, applyCampaignEdit, addMilestone, toggleMilestone, removeMilestone } from "../campaignSchema.js";
import { loadCampaigns, addCampaign, updateCampaign as updateCampaignRecord, deleteCampaign, upsertCampaign } from "../campaignStorage.js";
import { createClient, applyClientEdit } from "../clientSchema.js";
import { addClient, updateClient, upsertClientByName, findClientByName } from "../clientStorage.js";
import { renderHeader } from "../client/components/DashboardHeader.js";
import { renderMetricsGrid } from "../client/components/MetricCard.js";
import { renderPlacementsTable } from "../client/components/PressPlacementTable.js";
import { renderCampaignsGrid } from "../client/components/CampaignProgressCard.js";
import { renderPerformanceChart } from "../client/components/PerformanceChart.js";
import { renderInsightCard } from "../client/components/CampaignInsightCard.js";
import { renderReportCard } from "../client/components/LatestReportCard.js";
import { renderLoadingState } from "../client/components/LoadingState.js";
import { renderErrorState } from "../client/components/ErrorState.js";
import { renderOwnerSidebar } from "./components/OwnerSidebar.js?v=20260916-polish";
import { renderClientsList } from "./components/ClientsListCard.js";
import { renderReviewQueue } from "./components/ReviewQueueCard.js";
import { renderPlacementForm } from "./components/PlacementForm.js";
import { renderCampaignForm } from "./components/CampaignForm.js";
import { renderCampaignManageList } from "./components/CampaignManageList.js";
import { renderCanvaExportPanel } from "./components/CanvaExportPanel.js?v=20260917-demo-qa-1";
import { renderClientDetailForm } from "./components/ClientDetailForm.js";
import { renderCoachingAdminView } from "./components/CoachingAdminView.js?v=20260917-client-name-fix-1";
import { renderErrorLogPanel } from "./components/ErrorLogPanel.js";
import { renderOutletRatesView } from "./components/OutletRatesView.js";
import { renderCampaignDetail } from "../client/components/CampaignDetailView.js";
import { loadPhasesForClient } from "../coachingPhaseStorage.js";
import { loadResourcesForClient } from "../coachingResourceStorage.js";
import { loadOpportunitiesForClient } from "../opportunityStorage.js";
import { calculateCoachingProgress } from "../coachingProgress.js";
import { loadNotesForCampaign, addNote } from "../notesStorage.js";
import { loadSummary, saveSummary, approveSummary, normalizeStoredSummaryFormatting } from "../summaryStorage.js";
import { escapeHtml } from "../client/utils.js";
import { generateCanvaExport, downloadCsv } from "./canvaExport.js?v=20260917-demo-qa-1";
import { seedSamplePlacements } from "./seedSampleData.js";
import { seedRealCaseStudyData, backfillAveDataQuality } from "./seedRealCaseStudyData.js?v=20260916-ave-quality";
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
  chartRange: "30d",
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
  if (state.dataSource === "real") return getAggregateRealMetrics();
  const perClient = CLIENTS.map((c) => METRICS[c.id]["1y"]);
  const totalAVE = perClient.reduce((sum, m) => sum + (m.totalAVE || 0), 0);
  const totalPlacements = perClient.reduce((sum, m) => sum + (m.totalPlacements || 0), 0);
  const activeCampaigns = perClient.reduce((sum, m) => sum + m.activeCampaigns, 0);
  // Real case-study source material (see mockData.js) doesn't report a lead
  // time for several clients — `avgLeadTime: null` there means "unknown,"
  // not "zero days." Weighting null as 0 here would fabricate a false
  // signal (dragging the aggregate toward "0 days" in proportion to real
  // placement counts), so those clients are excluded from this average
  // entirely rather than silently counted as instant turnaround.
  const clientsWithLeadTime = perClient.filter((m) => m.avgLeadTime != null);
  const leadTimeWeight = clientsWithLeadTime.reduce((sum, m) => sum + m.totalPlacements, 0);
  const weightedLeadTime = leadTimeWeight
    ? clientsWithLeadTime.reduce((sum, m) => sum + m.avgLeadTime * m.totalPlacements, 0) / leadTimeWeight
    : null;
  const avg = (key) => perClient.reduce((sum, m) => sum + m[key], 0) / perClient.length;
  return {
    totalAVE,
    totalPlacements,
    avgLeadTime: weightedLeadTime != null ? Math.round(weightedLeadTime) : null,
    activeCampaigns,
    aveDelta: Math.round(avg("aveDelta")),
    placementsDelta: Math.round(avg("placementsDelta")),
    leadTimeDelta: Math.round(avg("leadTimeDelta")),
  };
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
  const totalAVE = confirmed.reduce((sum, p) => sum + (p.aveValue || 0), 0);
  const leadTimes = placements.map((p) => computeLeadTimeDays(p.pitchSentDate, p.landedDate)).filter((lt) => lt != null);
  const avgLeadTime = leadTimes.length ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) : null;

  const activeCampaigns = getAllCampaigns().filter((c) => {
    if (state.dashboardClientFilter && c.clientName !== state.dashboardClientFilter) return false;
    return c.status === "active";
  }).length;

  return {
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
  };
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
    <section class="section">
      <div class="owner-dashboard-control-card" id="dashboard-filter-bar"></div>
      <p id="dashboard-filter-summary" class="hint" style="margin:8px 0 0;"></p>
    </section>
    <section class="section">
      <div class="metrics-grid" id="dashboard-metrics"></div>
    </section>
    <div class="owner-dashboard-split">
      <section class="section" style="margin-bottom:0;">
        <div class="owner-panel-card">
          <div class="section-heading">
            <h2 id="dashboard-primary-title">Recent Press Placements</h2>
            <button class="link-btn" id="dashboard-primary-action" data-goto="placements">View All</button>
          </div>
          <div id="dashboard-placements"></div>
        </div>
      </section>
      <section class="section" id="dashboard-coaching-overview" style="margin-bottom:0;"></section>
    </div>
    <section class="section">
      <div id="dashboard-rollup-strip"></div>
    </section>
    <div class="dashboard-split">
      <section class="section" style="margin-bottom:0;">
        <div class="section-heading">
          <h2>Campaign Progress</h2>
          <button class="link-btn" data-goto="campaigns">View All</button>
        </div>
        <div class="campaigns-grid" id="dashboard-campaigns"></div>
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

function ownerMetricCard({ label, value, note, icon, iconBg, tooltip }) {
  return `
    <div class="card metric-card owner-metric-card">
      <div class="metric-top">
        <span class="metric-label">${escapeHtml(label)}${tooltip ? ` <span class="info-icon" title="${escapeHtml(tooltip)}">i</span>` : ""}</span>
        <span class="metric-icon" style="background:${iconBg}">${icon}</span>
      </div>
      <p class="metric-value">${escapeHtml(String(value))}</p>
      ${note ? `<p class="metric-delta positive">${escapeHtml(note)}</p>` : ""}
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
      tooltip: "Estimated equivalent paid-media value for confirmed coverage.",
    })}
    ${ownerMetricCard({
      label: "Total Press Placements",
      value: metrics.totalPlacements != null ? metrics.totalPlacements : "—",
      note: metrics.placementsDelta != null ? `${metrics.placementsDelta > 0 ? "+" : ""}${metrics.placementsDelta} vs prior period` : "Across visible clients",
      icon: "▦",
      iconBg: "#e1f2f0",
    })}
    ${ownerMetricCard({
      label: "Avg. Lead Time",
      value: metrics.avgLeadTime != null ? `${metrics.avgLeadTime} days` : "—",
      note: metrics.leadTimeDelta != null ? `${metrics.leadTimeDelta < 0 ? "" : "+"}${metrics.leadTimeDelta} days vs prior period` : "Needs pitch + landed dates",
      icon: "◷",
      iconBg: "#fdf0d8",
      tooltip: "Days between pitch sent date and landed date.",
    })}
    ${ownerMetricCard({
      label: "Active Campaigns (PR)",
      value: metrics.activeCampaigns,
      note: "Active",
      icon: "□",
      iconBg: "#efe9f5",
    })}
    ${ownerMetricCard({
      label: "Active Coaching Programs",
      value: coachingCount,
      note: coachingCount === 1 ? "Client enrolled" : "Clients enrolled",
      icon: "◎",
      iconBg: "#e9ecff",
    })}
  `;
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
        <span><small>Total Revenue Impact Est.</small><strong>${formatCompactCurrency(metrics.totalAVE)}</strong><em>YTD (AVE)</em></span>
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
    const res = await fetch(`${OWNER_API_BASE}/api/clients`, { headers: await authedJsonHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: body.message || `Couldn't look up clients in Supabase (${res.status}).` };
    }
    const match = (Array.isArray(body) ? body : []).find((c) => c.name === clientName);
    if (!match) {
      return { ok: false, message: `${clientName} doesn't have a matching row in Supabase yet — add it there first.` };
    }
    return { ok: true, id: match.id };
  } catch (err) {
    return { ok: false, message: `Couldn't reach owner-api at ${OWNER_API_BASE} — ${err.message}` };
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
      return { ok: false, message: body.message || `Invite failed (${res.status}).` };
    }
    return { ok: true, invitedEmail: body.invitedEmail };
  } catch (err) {
    return { ok: false, message: `Couldn't reach owner-api at ${OWNER_API_BASE} — ${err.message}` };
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
      return { ok: false, message: body.message || `Scan failed (${res.status}).` };
    }
    return { ok: true, ...body };
  } catch (err) {
    return { ok: false, message: `Couldn't reach owner-api at ${OWNER_API_BASE} — ${err.message}` };
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
      return { ok: false, message: body.message || `Request failed (${res.status}).` };
    }
    return { ok: true, text: body.text, providerUsed: body.providerUsed };
  } catch (err) {
    return { ok: false, message: `Couldn't reach owner-api at ${OWNER_API_BASE} — ${err.message}` };
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
      return { available: false, error: body.message || `Request failed (${res.status}).` };
    }
    return body;
  } catch (err) {
    return { available: false, error: `Couldn't reach owner-api at ${OWNER_API_BASE} — ${err.message}` };
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

async function loadGoogleWorkspaceStatus() {
  const statusEl = document.getElementById("google-workspace-status");
  if (!statusEl) return;

  if (!shouldUseOwnerApi()) {
    statusEl.textContent = "Sign in with Tenyse's owner account to check the live Google Workspace connection.";
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
      "<strong>Not connected:</strong> add Google OAuth credentials with Gmail read, Gmail send, and Calendar event scopes before using Gmail search or scheduling.";
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
    <div class="section-heading"><h2>Clients</h2></div>
    ${ownerApiAuthHint()}
    ${isEditing ? `<div class="card" id="client-detail-form-wrap" style="margin-bottom:24px;"></div>` : ""}
    ${
      state.dataSource === "real" && state.realClientsSync === "error"
        ? `<p class="hint" style="margin-bottom:12px;">Couldn't sync Supabase clients: ${escapeHtml(state.realClientsSyncMessage)}</p>`
        : ""
    }
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
      <label for="client-status-filter" style="font-size:0.82rem; font-weight:600; color:var(--color-navy);">Show</label>
      <select id="client-status-filter" style="max-width:220px;">
        <option value="all" ${state.clientStatusFilter === "all" ? "selected" : ""}>All clients</option>
        <option value="active" ${state.clientStatusFilter === "active" ? "selected" : ""}>Current (Active)</option>
        <option value="past" ${state.clientStatusFilter === "past" ? "selected" : ""}>Previous (Past / Portfolio)</option>
      </select>
    </div>
    <div class="clients-grid" id="clients-full-grid"></div>
  `;

  document.getElementById("client-status-filter").addEventListener("change", (e) => {
    state.clientStatusFilter = e.target.value;
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
    onDiscoveryScan: shouldUseOwnerApi() ? discoveryScanClient : undefined,
    onScheduleMeeting: shouldUseOwnerApi() ? scheduleClientMeeting : undefined,
    onViewCoaching: (clientName) => {
      state.coachingSelectedClient = clientName;
      navigate("coaching");
    },
  });
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
    <div class="section-heading"><h2>Campaigns</h2></div>
    ${ownerApiAuthHint()}
    ${
      state.dataSource === "real" && state.realRecordsSync === "error"
        ? `<p class="hint" style="margin-bottom:12px;">Couldn't sync Supabase campaigns/placements: ${escapeHtml(state.realRecordsSyncMessage)}</p>`
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
  const canSavePlacements = shouldUseOwnerApi();
  const editingPlacement =
    canManagePlacements && state.editingPlacementId ? getAllRealPlacements().find((p) => p.id === state.editingPlacementId) : null;

  target.innerHTML = `
    <div class="section-heading"><h2>Press Placements</h2></div>
    ${ownerApiAuthHint()}
    ${
      state.dataSource === "real" && state.realRecordsSync === "error"
        ? `<p class="hint" style="margin-bottom:12px;">Couldn't sync Supabase campaigns/placements: ${escapeHtml(state.realRecordsSyncMessage)}</p>`
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
      onResearchRate: shouldUseOwnerApi() ? researchOutletRate : undefined,
      onSuggestHeadline: shouldUseOwnerApi() ? suggestHeadline : undefined,
      onAnalyzeSentiment: shouldUseOwnerApi() ? analyzeSentiment : undefined,
      onFindPitchDate: shouldUseOwnerApi() ? findPitchDateInGmail : undefined,
      submitDisabledReason: shouldUseOwnerApi() ? "" : "Sign in with the live owner account to save placements.",
      knownClients: getRealClients().map((c) => c.name),
      onSubmit: async (rawData) => {
        if (!canSavePlacements) {
          alert("Sign in with the live owner account to save placements.");
          return false;
        }
        try {
          if (editingPlacement) {
            const saved = await saveRealPlacement({ raw: rawData, existingRecord: editingPlacement });
            updatePlacement(saved);
            state.editingPlacementId = null;
          } else {
            const saved = await saveRealPlacement({ raw: rawData });
            addPlacement(saved);
          }
          await syncOwnerRecordsFromSupabase({ force: true });
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

  if (!shouldUseOwnerApi()) {
    target.innerHTML = `
      <div class="section-heading"><h2>Review Queue</h2></div>
      ${ownerApiAuthHint()}
      <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
        The live Review Queue is fed by the Discovery Agent. The preview below shows the confirm/reject
        workflow without making live changes.
      </p>
      <div class="card" id="review-queue-list"></div>
    `;
    renderMockReviewQueueSection();
    return;
  }

  target.innerHTML = `
    <div class="section-heading"><h2>Review Queue</h2></div>
    <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
      Real candidate mentions found by the Discovery Agent (Clients → Scan for Mentions), waiting for you
      to turn into a placement or reject. Creating a placement keeps the article details and marks the
      queue item confirmed.
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
    const headers = await authedJsonHeaders();
    const [queueRes, clientsRes] = await Promise.all([
      fetch(`${OWNER_API_BASE}/api/review-queue`, { headers }),
      fetch(`${OWNER_API_BASE}/api/clients`, { headers }),
    ]);
    const queueBody = await queueRes.json().catch(() => ({}));
    if (!queueRes.ok) {
      listEl.innerHTML = `<p class="hint">⚠ ${escapeHtml(queueBody.message || `Couldn't load the review queue (${queueRes.status}).`)}</p>`;
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
    listEl.innerHTML = `<p class="hint">⚠ Couldn't reach owner-api at ${escapeHtml(OWNER_API_BASE)} — ${escapeHtml(err.message)}</p>`;
  }
}

async function resolveRealReviewQueueItem(id, status) {
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/review-queue/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: await authedJsonHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.message || `Couldn't update this item (${res.status}).`);
      return;
    }
  } catch (err) {
    alert(`Couldn't reach owner-api — ${err.message}`);
    return;
  }
  loadRealReviewQueue();
}

async function createPlacementFromReviewQueueItem(id, details = {}) {
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
        <textarea id="summary-text-${cssId(clientName)}" rows="4" placeholder="e.g. [Problem] Coverage was limited to local outlets. [Solution] We pitched an industry-specific angle to trade press. [Results] Landed 3 placements reaching 200K+ readers, building toward national pickup next period.">${existing ? existing.text : ""}</textarea>
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
    renderReportsView();
  });

  const approveBtn = container.querySelector(`#summary-approve-${cssId(clientName)}`);
  if (approveBtn && !approveBtn.disabled) {
    approveBtn.addEventListener("click", () => {
      approveSummary(clientName);
      renderReportsView();
    });
  }

  const generateBtn = container.querySelector(`#summary-generate-${cssId(clientName)}`);
  const generateStatus = container.querySelector(`#summary-generate-status-${cssId(clientName)}`);
  if (!generateBtn) return;
  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    generateStatus.textContent = "Generating…";
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
      generateStatus.textContent = `Drafted via ${result.providerUsed} — review, then Save Draft.`;
    } else {
      generateStatus.textContent = `⚠ ${result.message}`;
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
    <p class="hint" style="margin:0 0 10px;">The fuller campaign story for the actual report document — longer and more scene-setting than the Executive Summary card above. Generated fresh each time, nothing here is saved; copy it into the report by hand once it reads right.</p>
    <div class="entry-form">
      <div class="field-row" style="margin-bottom:10px;">
        <textarea id="narrative-text-${cssId(clientName)}" rows="4" placeholder="Click Generate to draft this from ${escapeHtml(clientName)}'s real confirmed placements." readonly></textarea>
      </div>
      <div class="form-actions" style="display:flex; gap:10px; align-items:center;">
        <button type="button" class="btn-secondary" id="narrative-generate-${cssId(clientName)}">Generate</button>
        <span id="narrative-generate-status-${cssId(clientName)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>
    </div>
  `;

  const generateBtn = container.querySelector(`#narrative-generate-${cssId(clientName)}`);
  const statusEl = container.querySelector(`#narrative-generate-status-${cssId(clientName)}`);
  if (!generateBtn) return;
  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    statusEl.textContent = "Generating…";
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
      statusEl.textContent = `Drafted via ${result.providerUsed} — copy into the report once reviewed.`;
    } else {
      statusEl.textContent = `⚠ ${result.message}`;
    }
  });
}

function cssId(str) {
  return String(str).replace(/[^a-zA-Z0-9]+/g, "-");
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
  target.innerHTML = `
    <div class="section-heading"><h2>Reports</h2></div>
    <div class="section" id="canva-export-wrap"></div>
    ${clients
      .map(
        (c) => `
      <div class="section">
        <h3 style="color:var(--color-navy); font-size:0.95rem; margin-bottom:8px;">${c.name}</h3>
        ${state.dataSource === "real" ? `<div class="card" id="summary-form-${c.id}" style="margin-bottom:14px;"></div>` : ""}
        ${state.dataSource === "real" ? `<div class="card" id="report-narrative-${c.id}" style="margin-bottom:14px;"></div>` : ""}
        <div id="report-${c.id}"></div>
      </div>`
      )
      .join("")}
  `;
  clients.forEach((c) => {
    const report = state.dataSource === "real" ? getRealReport(c.name) : REPORTS[c.id] || null;
    renderReportCard(document.getElementById(`report-${c.id}`), report);

    if (state.dataSource === "real") {
      renderSummaryForm(document.getElementById(`summary-form-${c.id}`), c.name);
      renderReportNarrativeForm(document.getElementById(`report-narrative-${c.id}`), c.name);
    }
  });

  const exportWrap = document.getElementById("canva-export-wrap");
  if (state.dataSource === "real") {
    // Only ever returns a summary that's actually approved — a saved-but-
    // unapproved draft must read as "no summary" to the export panel, the
    // same way generateCanvaExport treats it. Keeps the "never leak a
    // draft into a client-facing export" rule enforced at every layer that
    // touches this data, not just the one closest to the CSV itself.
    const getApprovedSummary = (clientName) => {
      const summary = loadSummary(clientName);
      return summary?.approvedAt ? summary : null;
    };

    renderCanvaExportPanel(exportWrap, {
      clients: getRealClients(),
      getSummaryStatus: getApprovedSummary,
      onGenerate: ({ clientName, startDate, endDate }) => {
        if (!clientName) return { ok: false, reason: "no_placements", message: "Choose a client first." };
        const result = generateCanvaExport(getAllRealPlacements(), {
          clientName,
          startDate,
          endDate,
          approvedSummary: getApprovedSummary(clientName),
        });
        if (result.ok) downloadCsv(result.csv, result.filename);
        return result;
      },
    });
  } else {
    exportWrap.innerHTML = `
      <p style="color:var(--text-secondary); font-size:0.85rem;">
        Sign in with the live owner account to generate a Canva export from confirmed placement data.
      </p>
    `;
  }
}

function renderAnalyticsView() {
  document.getElementById("analytics-content").innerHTML = `
    <div class="section-heading"><h2>Analytics</h2></div>
    <div class="card">
      <p>Cross-client analytics and trend comparisons are coming soon. The Performance chart on your Dashboard shows combined value and placement trends for now.</p>
    </div>
  `;
}

function renderSettingsView() {
  const devTools = showDevTools();
  document.getElementById("settings-content").innerHTML = `
    <div class="section-heading"><h2>Settings</h2></div>
    <div class="card">
      <p>Platform preferences and connected services live here. Google Workspace status appears below once the owner is signed in with the live owner account.</p>
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
      <p style="margin:0 0 10px;">Connect Tenyse's Google Workspace account to support Gmail-based pitch-date lookup, client note notifications, and Calendar scheduling.</p>
      <p class="hint" style="margin:0 0 10px;">If Google Workspace is not connected yet, the portal will show a clear connection status before anyone tries to search Gmail or schedule a meeting.</p>
      <p id="google-workspace-status" class="hint" style="margin:0 0 10px;">Checking Google Workspace connection...</p>
      <ul style="margin:0; padding-left:18px; color:var(--text-secondary); font-size:0.86rem;">
        <li>Client note notifications: sends Tenyse an email when a client leaves a campaign note.</li>
        <li>Client meeting scheduling: creates a Google Calendar event and invites the saved client contact.</li>
        <li>Lead time support: searches Gmail for pitch evidence and fills the placement's Pitch Sent Date when a match is found.</li>
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
    coachingDataForClient: shouldUseOwnerApi() ? coachingDataForClient : null,
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
    onSavePhase: shouldUseOwnerApi() ? saveRealCoachingPhase : null,
    onAddHomework: shouldUseOwnerApi() ? createRealHomework : null,
    onSaveHomework: shouldUseOwnerApi() ? saveRealHomework : null,
    onRemoveHomework: shouldUseOwnerApi() ? removeRealHomework : null,
    onSaveOpportunity: shouldUseOwnerApi() ? saveRealOpportunity : null,
    onRemoveOpportunity: shouldUseOwnerApi() ? removeRealOpportunity : null,
    onSaveResource: shouldUseOwnerApi() ? saveRealResource : null,
    onRemoveResource: shouldUseOwnerApi() ? removeRealResource : null,
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
    onGenerateActivitySummary: shouldUseOwnerApi()
      ? ({ campaign: camp, placements: campPlacements, notes }) => {
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
        }
      : undefined,
    onGeneratePitchSuggestions: shouldUseOwnerApi()
      ? ({ campaign: camp, placements: campPlacements, targetOutlet }) =>
          generateAIText("language-suggestions", {
            mode: "pitch",
            client: camp.clientName,
            targetOutlet,
            campaignAngle: camp.name,
            existingCoverage: campPlacements.filter((p) => p.landedDate),
          })
      : undefined,
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

function renderHeaderComponent() {
  renderHeader(document.getElementById("owner-header"), {
    client: { name: "Tenyse Williams", avatarInitials: "T" },
    dataSource: state.dataSource,
    greeting: "Welcome back, Tenyse!",
    subtitle: "Here's what's happening across all clients.",
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
  // Same reasoning, different data: the seeded executive summaries were
  // written in Markdown, and a browser that already seeded keeps that copy
  // until it's rewritten in place. Runs every load; a summary with no
  // Markdown is left alone.
  normalizeStoredSummaryFormatting();

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}
