import { METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, INSIGHTS, REPORTS, getClientById } from "./mockData.js";
import { getRealMetrics, getRealPlacements, getRealCampaigns, getRealChartSeries, getRealInsight, getRealReport } from "../realDataSource.js";
import { requireSession, logout, landingPageFor } from "../auth.js";
import { renderSidebar } from "./components/ClientSidebar.js";
import { renderHeader } from "./components/DashboardHeader.js";
import { renderMetricsGrid } from "./components/MetricCard.js";
import { renderPlacementsTable } from "./components/PressPlacementTable.js";
import { renderCampaignsGrid } from "./components/CampaignProgressCard.js";
import { renderPerformanceChart } from "./components/PerformanceChart.js";
import { renderInsightCard } from "./components/CampaignInsightCard.js";
import { renderReportCard } from "./components/LatestReportCard.js";
import { renderLoadingState } from "./components/LoadingState.js";
import { renderErrorState } from "./components/ErrorState.js";
import { renderCampaignDetail } from "./components/CampaignDetailView.js";
import { loadNotesForCampaign, addNote } from "../notesStorage.js";
import { renderCoachingProgramView } from "./components/CoachingProgramView.js";

// ---------------------------------------------------------------------------
// This is a mock, client-scoped view. `state.clientId` stands in for "the
// currently authenticated client account" and now comes from the mock login
// session (see src/auth.js) rather than a hardcoded default. Every data
// getter below reads ONLY that client's slice of mockData — there is no
// code path here that can reach another client's records, which is what
// "scoped to their own data only" needs to mean even before real auth
// exists.
//
// This is still NOT real access control. Nothing here is enforced by a
// server or a database — it's enforced by which mock object this JS file
// happens to read, gated by a login check that itself only checks
// localStorage. Real per-client isolation has to be enforced server-side
// once an API/database exists; swapping these getters for real fetches,
// scoped by a server-verified session, is the actual remaining work.
// ---------------------------------------------------------------------------

const session = requireSession("pr_client");

const state = {
  clientId: session ? session.clientId : "veganhood",
  view: "dashboard",
  demoState: "normal", // normal | loading | empty | error
  dataSource: "real", // real | mock — real reads storage.js placements filtered by session.name
  chartRange: "30d",
  searchTerm: "",
  selectedCampaignId: null,
};

// Real-data mode matches on the logged-in client's display NAME (whatever
// was typed into the "Client" field on the owner's manual entry form) — the
// mock clientId slugs (e.g. "veganhood") only exist for the mock accounts,
// not for real placements.
const clientName = session ? session.name : "";

function getMetrics(clientId) {
  if (state.demoState === "empty") {
    return { totalAVE: 0, totalPlacements: 0, avgLeadTime: 0, activeCampaigns: 0, aveDelta: null, placementsDelta: null, leadTimeDelta: null };
  }
  if (state.dataSource === "real") return getRealMetrics(clientName);
  return METRICS[clientId]["1y"];
}

function getPlacements(clientId) {
  if (state.demoState === "empty") return [];
  if (state.dataSource === "real") return getRealPlacements(clientName);
  return PLACEMENTS[clientId] || [];
}

function getCampaigns(clientId) {
  if (state.demoState === "empty") return [];
  if (state.dataSource === "real") return getRealCampaigns(clientName);
  return CAMPAIGNS[clientId] || [];
}

function getChartSeries(clientId, range) {
  if (state.demoState === "empty") return [{ label: "—", ave: 0, placements: 0 }];
  if (state.dataSource === "real") return getRealChartSeries(clientName, range);
  return (CHART_SERIES[clientId] && CHART_SERIES[clientId][range]) || [];
}

function getInsight(clientId) {
  if (state.demoState === "empty") return null;
  if (state.dataSource === "real") return getRealInsight();
  return INSIGHTS[clientId] || null;
}

function getReport(clientId) {
  if (state.demoState === "empty") return null;
  if (state.dataSource === "real") return getRealReport(clientName);
  return REPORTS[clientId] || null;
}

function filterPlacements(placements, term) {
  if (!term) return placements;
  const t = term.toLowerCase();
  return placements.filter(
    (p) =>
      (p.publication || "").toLowerCase().includes(t) ||
      (p.headline || "").toLowerCase().includes(t) ||
      (p.campaign || "").toLowerCase().includes(t)
  );
}

// ---------------------------------------------------------------------------
// View skeletons — each view's container is rebuilt from scratch on every
// render so switching out of loading/error (which replace innerHTML wholesale)
// always leaves real sub-containers behind for the component renderers.
// ---------------------------------------------------------------------------

function dashboardSkeletonHTML() {
  return `
    <section class="section">
      <div class="metrics-grid" id="dashboard-metrics"></div>
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
        <h2>Latest Report</h2>
        <button class="link-btn" data-goto="reports">View All</button>
      </div>
      <div id="dashboard-report"></div>
    </section>
  `;
}

function renderDashboard() {
  const target = document.getElementById("dashboard-content");
  if (state.demoState === "loading") {
    renderLoadingState(target);
    return;
  }
  if (state.demoState === "error") {
    renderErrorState(target, {
      message: "We had trouble loading your latest campaign data. Please try again in a moment.",
      onRetry: () => setDemoState("normal"),
    });
    return;
  }

  target.innerHTML = dashboardSkeletonHTML();

  renderMetricsGrid(document.getElementById("dashboard-metrics"), getMetrics(state.clientId));

  const recentPlacements = filterPlacements(getPlacements(state.clientId), state.searchTerm).slice(0, 5);
  renderPlacementsTable(document.getElementById("dashboard-placements"), recentPlacements);

  renderCampaignsGrid(document.getElementById("dashboard-campaigns"), getCampaigns(state.clientId), {
    onViewCampaign: (id) => showCampaignDetail(id),
  });

  renderPerformanceChart(document.getElementById("dashboard-chart"), {
    series: getChartSeries(state.clientId, state.chartRange),
    range: state.chartRange,
    onRangeChange: (range) => {
      state.chartRange = range;
      renderDashboard();
    },
  });

  renderInsightCard(document.getElementById("dashboard-insight-wrap"), getInsight(state.clientId));
  renderReportCard(document.getElementById("dashboard-report"), getReport(state.clientId));

  target.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.goto));
  });
}

function renderCampaignsView() {
  const target = document.getElementById("campaigns-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") {
    return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  }
  target.innerHTML = `
    <div class="section-heading"><h2>My Campaigns</h2></div>
    <div class="campaigns-grid" id="campaigns-full-grid"></div>
  `;
  renderCampaignsGrid(document.getElementById("campaigns-full-grid"), getCampaigns(state.clientId), {
    onViewCampaign: (id) => showCampaignDetail(id),
  });
}

function renderPlacementsView() {
  const target = document.getElementById("placements-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") {
    return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  }
  target.innerHTML = `
    <div class="section-heading"><h2>Press Placements</h2></div>
    <div class="card" id="placements-full-table"></div>
  `;
  renderPlacementsTable(document.getElementById("placements-full-table"), filterPlacements(getPlacements(state.clientId), state.searchTerm));
}

function renderReportsView() {
  const target = document.getElementById("reports-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") {
    return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  }
  target.innerHTML = `
    <div class="section-heading"><h2>Reports</h2></div>
    <div id="reports-full-card"></div>
  `;
  renderReportCard(document.getElementById("reports-full-card"), getReport(state.clientId));
}

function renderAnalyticsView() {
  document.getElementById("analytics-content").innerHTML = `
    <div class="section-heading"><h2>Analytics</h2></div>
    <div class="card">
      <p>Deeper analytics are coming soon. For now, the Performance chart on your Dashboard shows value and placement trends over time.</p>
    </div>
  `;
}

function renderResourcesView() {
  document.getElementById("resources-content").innerHTML = `
    <div class="section-heading"><h2>Resources</h2></div>
    <div class="card">
      <p>Brand assets, guides, and helpful links from Verified Consulting will live here.</p>
    </div>
  `;
}

function renderCoachingView() {
  renderCoachingProgramView(document.getElementById("coaching-content"));
}

function renderCurrentView() {
  switch (state.view) {
    case "dashboard":
      return renderDashboard();
    case "campaigns":
      return renderCampaignsView();
    case "placements":
      return renderPlacementsView();
    case "reports":
      return renderReportsView();
    case "analytics":
      return renderAnalyticsView();
    case "resources":
      return renderResourcesView();
    case "coaching":
      return renderCoachingView();
    case "campaign-detail":
      return renderCampaignDetailView();
  }
}

function showCampaignDetail(id) {
  state.selectedCampaignId = id;
  navigate("campaign-detail");
}

function renderCampaignDetailView() {
  const target = document.getElementById("campaign-detail-content");
  const campaign = getCampaigns(state.clientId).find((c) => c.id === state.selectedCampaignId);

  if (!campaign) {
    target.innerHTML = `<p>Campaign not found.</p><button class="link-btn" id="campaign-detail-back">&larr; Back to My Campaigns</button>`;
    document.getElementById("campaign-detail-back").addEventListener("click", () => navigate("campaigns"));
    return;
  }

  const placements = getPlacements(state.clientId).filter((p) => p.campaign === campaign.name);

  renderCampaignDetail(target, {
    campaign,
    placements,
    notes: loadNotesForCampaign(campaign.id),
    currentUser: { role: "pr_client", name: session ? session.name : "Client" },
    showClient: false,
    onBack: () => navigate("campaigns"),
    onAddNote: (body, currentUser) => {
      try {
        addNote({ campaignId: campaign.id, authorRole: currentUser.role, authorName: currentUser.name, body });
        renderCampaignDetailView();
      } catch (err) {
        alert(err.message);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Chrome (sidebar/header) + navigation
// ---------------------------------------------------------------------------

function renderSidebarComponent() {
  renderSidebar(document.getElementById("client-sidebar"), {
    client: getClientById(state.clientId),
    sessionEmail: session ? session.email : null,
    currentView: state.view,
    demoState: state.demoState,
    dataSource: state.dataSource,
    onNavigate: navigate,
    onDemoStateChange: setDemoState,
    onDataSourceChange: setDataSource,
    onLogout: () => {
      logout();
      window.location.href = "login.html";
    },
    onClose: closeSidebarMobile,
  });
}

function renderHeaderComponent() {
  renderHeader(document.getElementById("client-header"), {
    client: getClientById(state.clientId),
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
  renderCurrentView();
}

function openSidebarMobile() {
  document.getElementById("client-sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("visible");
}

function closeSidebarMobile() {
  document.getElementById("client-sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("visible");
}

document.getElementById("sidebar-overlay").addEventListener("click", closeSidebarMobile);

// requireSession() already redirected if there's no valid client session —
// only render the dashboard when it's safe to.
if (session) {
  // `?demo=loading|empty|error` lets you preview those states without a backend.
  const demoParam = new URLSearchParams(location.search).get("demo");
  if (["loading", "empty", "error"].includes(demoParam)) {
    state.demoState = demoParam;
  }
  // `?data=mock` shows the polished demo dataset instead of real placements.
  const dataParam = new URLSearchParams(location.search).get("data");
  if (["real", "mock"].includes(dataParam)) {
    state.dataSource = dataParam;
  }

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}
