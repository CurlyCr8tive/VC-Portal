import { CLIENTS, METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, AGGREGATE_INSIGHT, REPORTS } from "../client/mockData.js";
import {
  getRealClients,
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
import { computeLeadTimeDays } from "../calculations.js";
import { requireSession, logout } from "../auth.js";
import { getAccessToken, signOutReal } from "../supabaseAuthClient.js";
import { createPlacement, applyPlacementEdit } from "../schema.js";
import { addPlacement, updatePlacement, deletePlacement } from "../storage.js";
import { createCampaign, applyCampaignEdit, addMilestone, toggleMilestone, removeMilestone } from "../campaignSchema.js";
import { loadCampaigns, addCampaign, updateCampaign as updateCampaignRecord, deleteCampaign } from "../campaignStorage.js";
import { createClient, applyClientEdit } from "../clientSchema.js";
import { addClient, updateClient, findClientByName } from "../clientStorage.js";
import { renderHeader } from "../client/components/DashboardHeader.js";
import { renderMetricsGrid } from "../client/components/MetricCard.js";
import { renderPlacementsTable } from "../client/components/PressPlacementTable.js";
import { renderCampaignsGrid } from "../client/components/CampaignProgressCard.js";
import { renderPerformanceChart } from "../client/components/PerformanceChart.js";
import { renderInsightCard } from "../client/components/CampaignInsightCard.js";
import { renderReportCard } from "../client/components/LatestReportCard.js";
import { renderLoadingState } from "../client/components/LoadingState.js";
import { renderErrorState } from "../client/components/ErrorState.js";
import { renderOwnerSidebar } from "./components/OwnerSidebar.js";
import { renderClientsList } from "./components/ClientsListCard.js";
import { renderReviewQueue } from "./components/ReviewQueueCard.js";
import { renderPlacementForm } from "./components/PlacementForm.js";
import { renderCampaignForm } from "./components/CampaignForm.js";
import { renderCampaignManageList } from "./components/CampaignManageList.js";
import { renderCanvaExportPanel } from "./components/CanvaExportPanel.js";
import { renderClientDetailForm } from "./components/ClientDetailForm.js";
import { renderCoachingAdminView } from "./components/CoachingAdminView.js";
import { renderErrorLogPanel } from "./components/ErrorLogPanel.js";
import { renderOutletRatesView } from "./components/OutletRatesView.js";
import { renderCampaignDetail } from "../client/components/CampaignDetailView.js";
import { loadNotesForCampaign, addNote } from "../notesStorage.js";
import { loadSummary, saveSummary, approveSummary } from "../summaryStorage.js";
import { escapeHtml } from "../client/utils.js";
import { generateCanvaExport, downloadCsv } from "./canvaExport.js";
import { seedSamplePlacements } from "./seedSampleData.js";
import { seedRealCaseStudyData } from "./seedRealCaseStudyData.js";

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
// No Authorization header is attached below: this app's session (src/auth.js)
// is still mock auth, not a real Supabase Auth JWT, so calls here will 401
// once Supabase is configured but before real login exists — that's the
// correct honest failure, not a bug to paper over.
const OWNER_API_BASE = window.OWNER_API_BASE_URL || "http://localhost:4001";

const state = {
  view: "dashboard",
  demoState: "normal", // normal | loading | empty | error
  dataSource: "real", // real | mock — real reads storage.js placements across all clients
  chartRange: "30d",
  searchTerm: "",
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
  // Client info form: null = not showing, true = "add new client," or a
  // client name string = editing that client's existing profile.
  editingClient: null,
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
      <div class="card" id="dashboard-filter-bar" style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-end; margin-bottom:16px;"></div>
      <div class="metrics-grid" id="dashboard-metrics"></div>
      <p id="dashboard-filter-summary" class="hint" style="margin:8px 0 0;"></p>
    </section>
    <section class="section">
      <div class="section-heading">
        <h2>Recent Press Placements</h2>
        <button class="link-btn" data-goto="placements">View All</button>
      </div>
      <div class="card" id="dashboard-placements"></div>
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

/**
 * Client dropdown + date-range inputs that drive getDashboardPlacements()
 * above. Every control re-renders the whole dashboard on change rather
 * than trying to patch individual sections — this view has five sections
 * reading the same filtered set, and keeping them in sync piecemeal is a
 * worse bet than one cheap full re-render.
 */
function renderDashboardFilterBar(container) {
  const clientNames = [...new Set(getAllPlacements().map((p) => p.clientName).filter(Boolean))].sort();

  container.innerHTML = `
    <div class="field-row" style="margin:0;">
      <label for="dashboard-filter-client">Client</label>
      <select id="dashboard-filter-client">
        <option value="">All clients</option>
        ${clientNames.map((name) => `<option value="${escapeHtml(name)}" ${state.dashboardClientFilter === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}
      </select>
    </div>
    <div class="field-row" style="margin:0;">
      <label for="dashboard-filter-from">From</label>
      <input type="date" id="dashboard-filter-from" value="${escapeHtml(state.dashboardDateFrom)}" />
    </div>
    <div class="field-row" style="margin:0;">
      <label for="dashboard-filter-to">To</label>
      <input type="date" id="dashboard-filter-to" value="${escapeHtml(state.dashboardDateTo)}" />
    </div>
    ${isDashboardFilterActive() ? `<button type="button" class="btn-secondary" id="dashboard-filter-clear">Clear filter</button>` : ""}
  `;

  container.querySelector("#dashboard-filter-client").addEventListener("change", (e) => {
    state.dashboardClientFilter = e.target.value;
    renderDashboard();
  });
  container.querySelector("#dashboard-filter-from").addEventListener("change", (e) => {
    state.dashboardDateFrom = e.target.value;
    renderDashboard();
  });
  container.querySelector("#dashboard-filter-to").addEventListener("change", (e) => {
    state.dashboardDateTo = e.target.value;
    renderDashboard();
  });
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

  renderMetricsGrid(document.getElementById("dashboard-metrics"), filterActive ? computeFilteredMetrics(filteredPlacements) : getAggregateMetrics());

  const filterSummaryEl = document.getElementById("dashboard-filter-summary");
  filterSummaryEl.textContent = filterActive
    ? `Showing ${state.dashboardClientFilter || "all clients"}${state.dashboardDateFrom || state.dashboardDateTo ? `, ${state.dashboardDateFrom || "any date"} to ${state.dashboardDateTo || "any date"}` : ""} — ${filteredPlacements.length} placement${filteredPlacements.length === 1 ? "" : "s"} match.`
    : "";

  const basePlacements = filterActive ? filteredPlacements : getAllPlacements();
  const recentPlacements = filterPlacements(basePlacements, state.searchTerm)
    .slice()
    .sort((a, b) => (a.publicationDate < b.publicationDate ? 1 : -1))
    .slice(0, 5);
  renderPlacementsTable(document.getElementById("dashboard-placements"), recentPlacements, { showClient: true });

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

async function inviteClient({ clientId, email }) {
  try {
    const res = await fetch(`${OWNER_API_BASE}/api/clients/${encodeURIComponent(clientId)}/invite`, {
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
    const res = await fetch(`${OWNER_API_BASE}/api/generate/${type}`, {
      method: "POST",
      headers: await authedJsonHeaders(),
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
      headers: await authedJsonHeaders(),
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

function renderClientsView() {
  const target = document.getElementById("clients-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });

  const canManageClients = state.dataSource === "real";
  const isEditing = canManageClients && state.editingClient;
  const editingRecord = isEditing && state.editingClient !== true ? findClientByName(state.editingClient) : null;

  target.innerHTML = `
    <div class="section-heading"><h2>Clients</h2></div>
    ${isEditing ? `<div class="card" id="client-detail-form-wrap" style="margin-bottom:24px;"></div>` : ""}
    <div class="clients-grid" id="clients-full-grid"></div>
  `;

  if (isEditing) {
    renderClientDetailForm(document.getElementById("client-detail-form-wrap"), {
      initialData: editingRecord || (state.editingClient !== true ? { name: state.editingClient } : null),
      onSubmit: (raw) => {
        try {
          if (editingRecord) {
            updateClient(applyClientEdit(editingRecord, raw));
          } else {
            addClient(createClient(raw));
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

  renderClientsList(document.getElementById("clients-full-grid"), getClientsWithMetrics(), {
    onInvite: state.dataSource === "real" ? inviteClient : undefined,
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
  });
}

function renderCampaignsView() {
  const target = document.getElementById("campaigns-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });

  const canManageCampaigns = state.dataSource === "real";
  const editingCampaign = canManageCampaigns && state.editingCampaignId ? loadCampaigns().find((c) => c.id === state.editingCampaignId) : null;

  target.innerHTML = `
    <div class="section-heading"><h2>Campaigns</h2></div>
    <div class="dashboard-split">
      <section class="section" style="margin-bottom:0;">
        <h3 style="color:var(--color-navy); font-size:0.95rem; margin-bottom:8px;">Overview</h3>
        <div class="campaigns-grid" id="campaigns-full-grid"></div>
      </section>
      <section class="section" style="margin-bottom:0;">
        ${
          canManageCampaigns
            ? `<h3 style="color:var(--color-navy); font-size:0.95rem; margin-bottom:8px;">${editingCampaign ? "Edit Campaign" : "Add Campaign"}</h3>
               <div class="card" id="campaign-form-wrap"></div>`
            : `<p style="color:var(--text-secondary); font-size:0.85rem;">
                 Switch the sidebar's data source to "Real" to create and manage campaigns.
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
    onSubmit: (rawData) => {
      try {
        if (editingCampaign) {
          updateCampaignRecord(applyCampaignEdit(editingCampaign, rawData));
          state.editingCampaignId = null;
        } else {
          addCampaign(createCampaign(rawData));
        }
        renderCampaignsView();
        return true;
      } catch (err) {
        alert(err.message);
        return false;
      }
    },
    onCancel: () => {
      state.editingCampaignId = null;
      renderCampaignsView();
    },
  });

  renderCampaignManageList(document.getElementById("campaign-manage-list"), loadCampaigns(), {
    onEdit: (id) => {
      state.editingCampaignId = id;
      renderCampaignsView();
    },
    onDelete: (id) => {
      if (confirm("Delete this campaign? This can't be undone. Placements that reference it by name are unaffected.")) {
        deleteCampaign(id);
        if (state.editingCampaignId === id) state.editingCampaignId = null;
        renderCampaignsView();
      }
    },
    onAddMilestone: (campaignId, text) => {
      try {
        updateCampaignRecord(addMilestone(loadCampaigns().find((c) => c.id === campaignId), text));
        renderCampaignsView();
      } catch (err) {
        alert(err.message);
      }
    },
    onToggleMilestone: (campaignId, milestoneId) => {
      updateCampaignRecord(toggleMilestone(loadCampaigns().find((c) => c.id === campaignId), milestoneId));
      renderCampaignsView();
    },
    onRemoveMilestone: (campaignId, milestoneId) => {
      updateCampaignRecord(removeMilestone(loadCampaigns().find((c) => c.id === campaignId), milestoneId));
      renderCampaignsView();
    },
  });
}

function renderPlacementsView() {
  const target = document.getElementById("placements-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });

  const canManagePlacements = state.dataSource === "real";
  const editingPlacement =
    canManagePlacements && state.editingPlacementId ? getAllRealPlacements().find((p) => p.id === state.editingPlacementId) : null;

  target.innerHTML = `
    <div class="section-heading"><h2>Press Placements</h2></div>
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
      knownClients: getRealClients().map((c) => c.name),
      onSubmit: (rawData) => {
        try {
          if (editingPlacement) {
            updatePlacement(applyPlacementEdit(editingPlacement, rawData));
            state.editingPlacementId = null;
          } else {
            addPlacement(createPlacement(rawData));
          }
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
    onEdit: canManagePlacements
      ? (id) => {
          state.editingPlacementId = id;
          renderPlacementsView();
        }
      : undefined,
    onDelete: canManagePlacements
      ? (id) => {
          if (confirm("Delete this placement? This can't be undone.")) {
            deletePlacement(id);
            if (state.editingPlacementId === id) state.editingPlacementId = null;
            renderPlacementsView();
          }
        }
      : undefined,
  });
}

function renderReviewQueueView() {
  const target = document.getElementById("reviewqueue-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  target.innerHTML = `
    <div class="section-heading"><h2>Review Queue</h2></div>
    <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
      Preview only — there is no discovery agent behind this yet. These rows are hand-authored to show
      the confirm/reject workflow described in the PRD, including a same-name false positive to reject.
    </p>
    <div class="card" id="review-queue-list"></div>
  `;
  renderReviewQueueSection();
}

function renderReviewQueueSection() {
  renderReviewQueue(document.getElementById("review-queue-list"), state.reviewQueue, {
    onConfirm: (id) => {
      state.reviewQueue = state.reviewQueue.filter((item) => item.id !== id);
      renderReviewQueueSection();
    },
    onReject: (id) => {
      state.reviewQueue = state.reviewQueue.filter((item) => item.id !== id);
      renderReviewQueueSection();
    },
  });
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
function realWritingContextFor(clientName) {
  const placements = getRealPlacements(clientName).filter((p) => Boolean(p.landedDate));
  const totalAVE = getRealMetrics(clientName).totalAVE;
  const activeCampaignNames = loadCampaigns()
    .filter((c) => c.client === clientName && c.status === "active")
    .map((c) => c.name);
  return {
    placements,
    totalAVE,
    campaignContext: activeCampaignNames.length ? activeCampaignNames.join(", ") : "no active campaign on file for this client",
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
        <button type="button" class="btn-secondary" id="summary-generate-${cssId(clientName)}">✨ Generate with AI</button>
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
  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    generateStatus.textContent = "Generating…";
    const { placements, totalAVE, campaignContext } = realWritingContextFor(clientName);
    const result = await generateAIText("executive-summary", {
      client: clientName,
      periodLabel: "the current reporting period",
      placements,
      totalAVE,
      totalReach: "not tracked in this build",
      campaignContext,
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
        <button type="button" class="btn-secondary" id="narrative-generate-${cssId(clientName)}">✨ Generate</button>
        <span id="narrative-generate-status-${cssId(clientName)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>
    </div>
  `;

  const generateBtn = container.querySelector(`#narrative-generate-${cssId(clientName)}`);
  const statusEl = container.querySelector(`#narrative-generate-status-${cssId(clientName)}`);
  generateBtn.addEventListener("click", async () => {
    generateBtn.disabled = true;
    statusEl.textContent = "Generating…";
    const { placements, campaignContext } = realWritingContextFor(clientName);
    const result = await generateAIText("report-narrative", {
      client: clientName,
      periodLabel: "the current reporting period",
      placements,
      campaignContext,
      notableDetails: [],
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
        Switch the sidebar's data source to "Real" to generate a Canva export — the mock demo data isn't
        real coverage, so exporting it wouldn't produce anything you'd actually send to a client.
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
  document.getElementById("settings-content").innerHTML = `
    <div class="section-heading"><h2>Settings</h2></div>
    <div class="card">
      <p>Contractor permissions, brand template defaults, and notification preferences will live here. Nothing on this page is wired up yet.</p>
    </div>
    <div class="section-heading" style="margin-top:24px;"><h2>Outlet Rates</h2></div>
    <div class="card">
      <div id="outlet-rates-wrap"></div>
    </div>
    <div class="section-heading" style="margin-top:24px;"><h2>Error Log</h2></div>
    <div class="card">
      <p class="hint" style="margin:0 0 12px;">
        Client-side failures (corrupted local data, a failed calculation) land here today. Once Supabase is live, the
        <code>errors</code> table (in <code>db/schema.sql</code>) becomes the production version of this same log —
        same relationship every other real/localStorage pair in this app already has.
      </p>
      <div id="error-log-wrap"></div>
    </div>
    <div class="section-heading" style="margin-top:24px;"><h2>Real Case Study Data</h2></div>
    <div class="card">
      <p style="margin:0 0 12px;">Not a demo/mock fixture — these are Tenyse's own real numbers, sent directly by her: PR
        clients VeganHood, SNAP Co., and Vegan Dining Month (placements, a completed Campaign record, and a reviewed +
        approved AI-generated executive summary each), plus a real Client profile for every one of them — status,
        engagement type, contact, industry. VeganHood is marked <strong>Past / Portfolio</strong> (confirmed closed by
        Tenyse directly); SNAP Co. and Vegan Dining Month are marked <strong>Unconfirmed</strong> rather than guessed
        either way, since she named other past clients but not these two specifically. Also adds <strong>Greyz Bistro</strong>
        (Chef Garth) as a real Active coaching client — her first genuine active engagement.</p>
      <p class="hint" style="margin:0 0 12px;">Two honest gaps, disclosed on each row's Notes field: none of the source
        material gives an exact landing/campaign-start date, so dates shown are recording-date placeholders, not sourced
        facts — and Audience Reach / Tone &amp; Sentiment aren't tracked in this build, called out directly in each summary
        rather than smoothed over.</p>
      <button class="btn-secondary" id="seed-real-case-study-btn">Load Real Case Study Data</button>
      <span id="seed-real-case-study-result" style="margin-left:10px; font-size:0.85rem; color:var(--text-secondary);"></span>
    </div>
    <div class="section-heading" style="margin-top:24px;"><h2>Developer Tools</h2></div>
    <div class="card">
      <p style="margin:0 0 12px;">Not a real product feature — a shortcut for testing. Adds 5 fictional but complete placements
        across two clients (via the same Add Placement path the form uses), so there's something to try the
        Press Placements table, campaigns, and Canva export against without typing them in by hand.</p>
      <button class="btn-secondary" id="seed-sample-data-btn">Load Sample Placements</button>
      <span id="seed-sample-data-result" style="margin-left:10px; font-size:0.85rem; color:var(--text-secondary);"></span>
    </div>
  `;

  renderOutletRatesView(document.getElementById("outlet-rates-wrap"));
  renderErrorLogPanel(document.getElementById("error-log-wrap"));

  document.getElementById("seed-real-case-study-btn").addEventListener("click", () => {
    const { placementsAdded, campaignsAdded, summariesApproved, clientsAdded } = seedRealCaseStudyData();
    document.getElementById("seed-real-case-study-result").textContent =
      placementsAdded > 0 || campaignsAdded > 0 || clientsAdded > 0
        ? `Added ${placementsAdded} placement(s), ${campaignsAdded} campaign(s), ${clientsAdded} client profile(s), approved ${summariesApproved} executive summar${summariesApproved === 1 ? "y" : "ies"}.`
        : `Already loaded — refreshed ${summariesApproved} executive summar${summariesApproved === 1 ? "y" : "ies"}.`;
  });

  document.getElementById("seed-sample-data-btn").addEventListener("click", () => {
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
  const coachingClients =
    state.dataSource === "real"
      ? getClientsWithMetrics()
          .map((c) => c.profile)
          .filter((profile) => profile && (profile.engagementType === "coaching" || profile.engagementType === "pr_and_coaching"))
      : [];
  renderCoachingAdminView(document.getElementById("coaching-content"), { coachingClients });
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
    currentView: state.view,
    demoState: state.demoState,
    dataSource: state.dataSource,
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
    searchPlaceholder: "Search clients, campaigns, placements…",
    extraAction: {
      label: "+ New Client",
      onClick: () => {
        if (state.dataSource !== "real") {
          alert('Switch the sidebar\'s Data source to "Real" to add a client — adding one while previewing demo data wouldn\'t show up in it.');
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

if (session) {
  const demoParam = new URLSearchParams(location.search).get("demo");
  if (["loading", "empty", "error"].includes(demoParam)) {
    state.demoState = demoParam;
  }
  const dataParam = new URLSearchParams(location.search).get("data");
  if (["real", "mock"].includes(dataParam)) {
    state.dataSource = dataParam;
  }

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}
