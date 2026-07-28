import { CLIENTS, METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, AGGREGATE_INSIGHT, REPORTS } from "../client/mockData.js";
import { requireSession, logout } from "../auth.js";
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

const state = {
  view: "dashboard",
  demoState: "normal", // normal | loading | empty | error
  chartRange: "30d",
  searchTerm: "",
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
  return CLIENTS.flatMap((c) => (PLACEMENTS[c.id] || []).map((p) => ({ ...p, clientName: c.name })));
}

function getAllCampaigns() {
  if (state.demoState === "empty") return [];
  return CLIENTS.flatMap((c) => (CAMPAIGNS[c.id] || []).map((camp) => ({ ...camp, clientName: c.name })));
}

function getAggregateMetrics() {
  if (state.demoState === "empty") {
    return { totalAVE: 0, totalPlacements: 0, avgLeadTime: 0, activeCampaigns: 0, aveDelta: 0, placementsDelta: 0, leadTimeDelta: 0 };
  }
  const perClient = CLIENTS.map((c) => METRICS[c.id]["1y"]);
  const totalAVE = perClient.reduce((sum, m) => sum + m.totalAVE, 0);
  const totalPlacements = perClient.reduce((sum, m) => sum + m.totalPlacements, 0);
  const activeCampaigns = perClient.reduce((sum, m) => sum + m.activeCampaigns, 0);
  const weightedLeadTime = totalPlacements
    ? perClient.reduce((sum, m) => sum + m.avgLeadTime * m.totalPlacements, 0) / totalPlacements
    : 0;
  const avg = (key) => perClient.reduce((sum, m) => sum + m[key], 0) / perClient.length;
  return {
    totalAVE,
    totalPlacements,
    avgLeadTime: Math.round(weightedLeadTime),
    activeCampaigns,
    aveDelta: Math.round(avg("aveDelta")),
    placementsDelta: Math.round(avg("placementsDelta")),
    leadTimeDelta: Math.round(avg("leadTimeDelta")),
  };
}

function getAggregateChartSeries(range) {
  if (state.demoState === "empty") return [{ label: "—", ave: 0, placements: 0 }];
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
  return state.demoState === "empty" ? null : AGGREGATE_INSIGHT;
}

function getClientsWithMetrics() {
  if (state.demoState === "empty") return [];
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
// Dashboard (overview) view
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
        <h2>Reports</h2>
        <button class="link-btn" data-goto="reports">View All</button>
      </div>
      <div id="dashboard-reports-summary"></div>
    </section>
  `;
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

  renderMetricsGrid(document.getElementById("dashboard-metrics"), getAggregateMetrics());

  const recentPlacements = filterPlacements(getAllPlacements(), state.searchTerm)
    .slice()
    .sort((a, b) => (a.publicationDate < b.publicationDate ? 1 : -1))
    .slice(0, 5);
  renderPlacementsTable(document.getElementById("dashboard-placements"), recentPlacements, { showClient: true });

  renderCampaignsGrid(document.getElementById("dashboard-campaigns"), getAllCampaigns(), {
    onViewCampaign: () => navigate("campaigns"),
  });

  renderPerformanceChart(document.getElementById("dashboard-chart"), {
    series: getAggregateChartSeries(state.chartRange),
    range: state.chartRange,
    onRangeChange: (range) => {
      state.chartRange = range;
      renderDashboard();
    },
  });

  renderInsightCard(document.getElementById("dashboard-insight-wrap"), getAggregateInsight());

  const reportCount = state.demoState === "empty" ? 0 : CLIENTS.length;
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

function renderClientsView() {
  const target = document.getElementById("clients-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  target.innerHTML = `
    <div class="section-heading"><h2>Clients</h2></div>
    <div class="clients-grid" id="clients-full-grid"></div>
  `;
  renderClientsList(document.getElementById("clients-full-grid"), getClientsWithMetrics());
}

function renderCampaignsView() {
  const target = document.getElementById("campaigns-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  target.innerHTML = `
    <div class="section-heading"><h2>Campaigns</h2></div>
    <div class="campaigns-grid" id="campaigns-full-grid"></div>
  `;
  renderCampaignsGrid(document.getElementById("campaigns-full-grid"), getAllCampaigns());
}

function renderPlacementsView() {
  const target = document.getElementById("placements-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });
  target.innerHTML = `
    <div class="section-heading"><h2>Press Placements</h2></div>
    <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:-6px;">
      To add a new placement by hand, use the <a href="index.html">placement entry tool</a> —
      it's a separate, already-working page that isn't merged into this dashboard shell yet.
    </p>
    <div class="card" id="placements-full-table"></div>
  `;
  renderPlacementsTable(document.getElementById("placements-full-table"), filterPlacements(getAllPlacements(), state.searchTerm), {
    showClient: true,
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

function renderReportsView() {
  const target = document.getElementById("reports-content");
  if (state.demoState === "loading") return renderLoadingState(target);
  if (state.demoState === "error") return renderErrorState(target, { onRetry: () => setDemoState("normal") });

  if (state.demoState === "empty") {
    target.innerHTML = `<div class="section-heading"><h2>Reports</h2></div><div id="reports-empty"></div>`;
    renderReportCard(document.getElementById("reports-empty"), null);
    return;
  }

  target.innerHTML = `
    <div class="section-heading"><h2>Reports</h2></div>
    ${CLIENTS.map((c) => `<div class="section"><h3 style="color:var(--color-navy); font-size:0.95rem; margin-bottom:8px;">${c.name}</h3><div id="report-${c.id}"></div></div>`).join("")}
  `;
  CLIENTS.forEach((c) => {
    renderReportCard(document.getElementById(`report-${c.id}`), REPORTS[c.id] || null);
  });
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
  `;
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
    case "settings":
      return renderSettingsView();
  }
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
    onNavigate: navigate,
    onDemoStateChange: setDemoState,
    onLogout: () => {
      logout();
      window.location.href = "login.html";
    },
    onClose: closeSidebarMobile,
  });
}

function renderHeaderComponent() {
  renderHeader(document.getElementById("owner-header"), {
    client: { name: "Tenyse Williams", avatarInitials: "T" },
    greeting: "Welcome back, Tenyse!",
    subtitle: "Here's what's happening across all clients.",
    searchPlaceholder: "Search clients, campaigns, placements…",
    extraAction: {
      label: "+ New Client",
      onClick: () => alert("This is a demo — adding a new client isn't wired up yet."),
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

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}
