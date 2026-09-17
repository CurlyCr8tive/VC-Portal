import { METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, INSIGHTS, REPORTS, getClientById } from "./mockData.js";
import { getRealMetrics, getRealPlacements, getRealCampaigns, getRealChartSeries, getRealInsight, getRealReport, getClientProfile } from "../realDataSource.js";
import { requireSession, logout, landingPageFor } from "../auth.js?v=20260916-demo-route-2";
import { signOutReal } from "../supabaseAuthClient.js";
import { buildClientApiChartSeries, loadClientApiData, loadClientApiNotes, postClientApiNote, postClientApiOpportunity, updateClientApiHomework } from "../clientApiDataSource.js";
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
import { renderCoachingProgramView } from "./components/CoachingProgramView.js?v=20260917-coaching-polish-1";
import { loadPhasesForClient } from "../coachingPhaseStorage.js";
import { loadResourcesForClient } from "../coachingResourceStorage.js";
import { loadOpportunitiesForClient } from "../opportunityStorage.js";
import { seedGreyzBistroCoachingData } from "../owner/seedGreyzBistroCoachingData.js?v=20260917-client-demo-1";
import { averageScore, EVALUATION_CRITERIA } from "../opportunitySchema.js";
import { calculateCoachingProgress, OPPORTUNITY_STATUS_LABELS } from "../coachingProgress.js";
import { escapeHtml } from "./utils.js";

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
  dataSource: session?.real ? "real" : "mock", // real | mock — mock client logins open the polished demo dataset
  chartRange: "30d",
  searchTerm: "",
  selectedCampaignId: null,
  programView: "pr",
  showCoachingOnDashboard: true,
  apiStatus: "idle",
  apiError: "",
  apiData: null,
  apiNotesByCampaign: {},
  apiNotesStatusByCampaign: {},
};

// Real-data mode matches on the logged-in client's display NAME (whatever
// was typed into the "Client" field on the owner's manual entry form) — the
// mock clientId slugs (e.g. "veganhood") only exist for the mock accounts,
// not for real placements.
const clientName = session ? session.name : "";

function shouldUseClientApi() {
  return state.dataSource === "real" && Boolean(session?.real);
}

function apiSnapshot() {
  return shouldUseClientApi() ? state.apiData : null;
}

function avatarInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] || "").concat(words[1]?.[0] || "").toUpperCase() || "?";
}

function currentClientForChrome() {
  const snapshot = apiSnapshot();
  if (snapshot) {
    const initials = /greyz/i.test(snapshot.client.name) ? "GC" : avatarInitials(snapshot.client.name);
    return { id: snapshot.client.id, name: snapshot.client.name, avatarInitials: initials };
  }
  const client = getClientById(state.clientId) || { id: state.clientId, name: clientName || "Client", avatarInitials: avatarInitials(clientName) };
  return /greyz/i.test(client.name) ? { ...client, avatarInitials: "GC" } : client;
}

async function refreshClientApiData() {
  if (!shouldUseClientApi()) return;
  state.apiStatus = "loading";
  state.apiError = "";
  renderCurrentView();
  try {
    state.apiData = await loadClientApiData(state.chartRange);
    state.apiStatus = "loaded";
  } catch (err) {
    state.apiError = err.message;
    state.apiStatus = "error";
  }
  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}

function renderApiGate(target) {
  if (!shouldUseClientApi()) return false;
  if (state.apiStatus === "loaded" && state.apiData) return false;
  if (state.apiStatus === "error") {
    renderErrorState(target, {
      message: state.apiError || "We had trouble loading your client data from Supabase.",
      onRetry: refreshClientApiData,
    });
    return true;
  }
  renderLoadingState(target);
  return true;
}

/**
 * Mock dataSource has no coaching concept at all (it's a fixed PR demo
 * dataset) — always reads as "pr" regardless of what any real profile
 * says, so the mock preview never shows a Coaching Program link/toggle
 * that has nothing real behind it.
 */
function getEngagementType() {
  const snapshot = apiSnapshot();
  if (snapshot) return snapshot.client.engagementType;
  if (state.clientId === "greyz-bistro" || /greyz/i.test(clientName)) return "coaching";
  if (state.dataSource !== "real") return "pr";
  return getClientProfile(clientName).engagementType;
}

function getMetrics(clientId) {
  const emptyMetrics = { totalAVE: 0, totalPlacements: 0, avgLeadTime: null, activeCampaigns: 0, aveDelta: null, placementsDelta: null, leadTimeDelta: null };
  if (state.demoState === "empty") {
    return emptyMetrics;
  }
  const snapshot = apiSnapshot();
  if (snapshot) return snapshot.metrics;
  if (state.dataSource === "real") return getRealMetrics(clientName);
  return METRICS[clientId]?.["1y"] || emptyMetrics;
}

function getPlacements(clientId) {
  if (state.demoState === "empty") return [];
  const snapshot = apiSnapshot();
  if (snapshot) return snapshot.placements;
  if (state.dataSource === "real") return getRealPlacements(clientName);
  return PLACEMENTS[clientId] || [];
}

function getCampaigns(clientId) {
  if (state.demoState === "empty") return [];
  const snapshot = apiSnapshot();
  if (snapshot) return snapshot.campaigns;
  if (state.dataSource === "real") return getRealCampaigns(clientName);
  return CAMPAIGNS[clientId] || [];
}

function getChartSeries(clientId, range) {
  if (state.demoState === "empty") return [{ label: "—", ave: 0, placements: 0 }];
  const snapshot = apiSnapshot();
  if (snapshot) return buildClientApiChartSeries(snapshot.placements, range);
  if (state.dataSource === "real") return getRealChartSeries(clientName, range);
  return (CHART_SERIES[clientId] && CHART_SERIES[clientId][range]) || [];
}

function getInsight(clientId) {
  if (state.demoState === "empty") return null;
  const snapshot = apiSnapshot();
  if (snapshot) return snapshot.insight;
  if (state.dataSource === "real") return getRealInsight();
  return INSIGHTS[clientId] || null;
}

function getReport(clientId) {
  if (state.demoState === "empty") return null;
  const snapshot = apiSnapshot();
  if (snapshot) return snapshot.report;
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

function supportsCoaching() {
  const engagementType = getEngagementType();
  return engagementType === "coaching" || engagementType === "pr_and_coaching";
}

function supportsPr() {
  return getEngagementType() !== "coaching";
}

function activeProgramView() {
  if (!supportsPr()) return "coaching";
  if (!supportsCoaching()) return "pr";
  return state.programView;
}

function greetingName(client) {
  if (/greyz/i.test(client.name)) return "Chef Garth";
  return client.name;
}

function formatReadableDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function shortText(text, maxLength = 76) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function clientCoachingContext() {
  const client = currentClientForChrome();
  const snapshot = apiSnapshot();
  const phases = snapshot?.coaching?.phases || (clientName ? loadPhasesForClient(clientName) : []);
  const resources = snapshot?.coaching?.resources || (clientName ? loadResourcesForClient(clientName) : []);
  const opportunities = snapshot?.coaching?.opportunities || (clientName ? loadOpportunitiesForClient(clientName) : []);
  const progress = calculateCoachingProgress({ phases, resources, opportunities });
  const actionableHomework = phases
    .flatMap((phase) => (phase.homework || []).map((homework) => ({ ...homework, phase })))
    .filter((homework) => homework.type !== "standing")
    .filter((homework) => homework.status !== "complete");
  const reflection = actionableHomework.find((homework) => homework.type === "reflection");
  const currentPhase =
    [...phases].reverse().find((phase) => phase.status === "in_progress") ||
    phases.find((phase) => phase.status !== "complete") ||
    phases[phases.length - 1] ||
    null;
  const reachedPhases = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
  const roadmapPercent = phases.length ? Math.round((reachedPhases / phases.length) * 100) : 0;
  const topOpportunity = opportunities.find((opportunity) => opportunity.decisionStatus !== "declined") || opportunities[0] || null;
  const resourceItems = resources.filter((resource) => resource.kind === "resource").slice(0, 4);

  return {
    client,
    phases,
    resources,
    opportunities,
    progress,
    actionableHomework,
    reflection,
    currentPhase,
    roadmapPercent,
    topOpportunity,
    resourceItems,
  };
}

function statusBadge(label, className = "") {
  return `<span class="client-status-badge ${escapeHtml(className)}">${escapeHtml(label)}</span>`;
}

function priorityLabel(homework, index) {
  if (homework.type === "reflection") return "Medium";
  return index === 0 ? "High" : index === 1 ? "Medium" : "Low";
}

function scoreStars(score) {
  const rounded = Math.round(Number(score) || 0);
  return Array.from({ length: 5 }, (_, index) => `<span class="${index < rounded ? "filled" : ""}" aria-hidden="true">★</span>`).join("");
}

// ---------------------------------------------------------------------------
// View skeletons — each view's container is rebuilt from scratch on every
// render so switching out of loading/error (which replace innerHTML wholesale)
// always leaves real sub-containers behind for the component renderers.
// ---------------------------------------------------------------------------

function dashboardSkeletonHTML() {
  return `
    ${supportsCoaching() && supportsPr() ? renderProgramViewControlHtml() : ""}
    <div id="dashboard-mode-content"></div>
  `;
}

function renderDashboard() {
  const target = document.getElementById("dashboard-content");
  if (renderApiGate(target)) return;
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
  wireProgramViewControl(target);

  if (activeProgramView() === "coaching" && (state.showCoachingOnDashboard || !supportsPr())) {
    renderClientCoachingDashboard(document.getElementById("dashboard-mode-content"));
    return;
  }

  renderClientPrDashboard(document.getElementById("dashboard-mode-content"));
}

function renderProgramViewControlHtml() {
  return `
    <section class="client-program-view-control" aria-label="Program view">
      <span class="control-label">Program View</span>
      <div class="owner-segmented-control" role="tablist" aria-label="Switch program view">
        <button type="button" data-program-view="pr" role="tab" aria-selected="${state.programView === "pr"}" class="${state.programView === "pr" ? "active" : ""}">PR Reporting</button>
        <button type="button" data-program-view="coaching" role="tab" aria-selected="${state.programView === "coaching"}" class="${state.programView === "coaching" ? "active" : ""}">Coaching Program</button>
      </div>
    </section>
  `;
}

function wireProgramViewControl(container) {
  container.querySelectorAll("[data-program-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.programView = btn.dataset.programView;
      renderSidebarComponent();
      renderHeaderComponent();
      renderDashboard();
    });
  });
}

function renderClientPrDashboard(target) {
  target.innerHTML = `
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

function renderClientCoachingDashboard(target) {
  const ctx = clientCoachingContext();
  if (!ctx.phases.length) {
    target.innerHTML = `
      <section class="client-coaching-dashboard">
        <div class="state-panel compact">
          <div class="state-icon" aria-hidden="true">▣</div>
          <h3>Coaching program is not loaded yet</h3>
          <p>Tenyse can load or create this client's phases from the owner Coaching Program section. Once she does, this dashboard will populate automatically.</p>
          <button class="btn-secondary" data-goto="coaching">Open Program Preview</button>
        </div>
      </section>
    `;
    target.querySelector("[data-goto]").addEventListener("click", () => navigate("coaching"));
    return;
  }

  target.innerHTML = `
    <section class="client-coaching-dashboard">
      <div class="client-dashboard-grid">
        ${renderMyProgramsCard(ctx)}
        ${renderRoadmapCard(ctx)}
        ${renderUpcomingCard(ctx)}
        ${renderCoachingToggleCard()}
        ${renderHomeworkCard(ctx)}
        ${renderReflectionCard(ctx)}
        ${renderOpportunityScorecard(ctx)}
        ${renderQuickResourcesCard(ctx)}
      </div>
    </section>
  `;

  target.querySelector("[data-toggle-coaching-dashboard]")?.addEventListener("change", (event) => {
    state.showCoachingOnDashboard = event.target.checked;
    renderDashboard();
  });
  target.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.goto));
  });
}

function renderMyProgramsCard(ctx) {
  const progressPercent = ctx.roadmapPercent || ctx.progress.phases.percent || 0;
  return `
    <article class="card client-programs-card">
      <div class="section-heading">
        <h2>My Programs</h2>
        <p>Switch between your programs</p>
      </div>
      <div class="client-program-row active">
        <div class="program-avatar">V</div>
        <div>
          <strong>Visibility to Revenue</strong>
          <span>90-Day Sprint</span>
          <small>Started ${ctx.client.name === "Greyz Bistro" ? "07/06/2026" : "when program was created"}</small>
        </div>
        ${statusBadge("Active", "success")}
        <span class="program-percent">${progressPercent}%</span>
        <span class="mini-progress"><span style="width:${progressPercent}%;"></span></span>
      </div>
      <div class="client-program-row">
        <div class="program-avatar muted">RL</div>
        <div>
          <strong>Raise Local Partner Track</strong>
          <span>Coming Soon</span>
          <small>Starts 10/01/2026</small>
        </div>
        <span class="program-percent">0%</span>
        <span class="mini-progress"><span style="width:0%;"></span></span>
      </div>
    </article>
  `;
}

function renderRoadmapCard(ctx) {
  const overall = ctx.roadmapPercent || ctx.progress.phases.percent || 0;
  const currentPhase = ctx.currentPhase;
  return `
    <article class="card client-roadmap-card">
      <div class="section-heading">
        <h2>90-Day Roadmap Progress</h2>
      </div>
      <div class="roadmap-overall">
        <span>Overall Progress</span>
        <strong>${overall}%</strong>
        <div class="progress-track"><div class="progress-fill" style="width:${overall}%;"></div></div>
      </div>
      <div class="roadmap-steps">
        ${ctx.phases
          .map(
            (phase) => `
          <div class="roadmap-step ${phase.status}">
            <span class="roadmap-node">${phase.status === "complete" ? "✓" : phase.status === "in_progress" ? "⌂" : phase.phaseNumber}</span>
            <strong>${phase.phaseNumber}</strong>
            <small>${escapeHtml(phase.name)}</small>
            <em>Weeks ${escapeHtml(phase.weeks || String(phase.phaseNumber))}</em>
          </div>`
          )
          .join("")}
      </div>
      <div class="client-card-footer">
        <p><strong>Next Milestone</strong><br>${escapeHtml(currentPhase?.goal || "Tenyse will add the next milestone here.")}</p>
        <button class="new-client-btn" data-goto="coaching">View Phase ${escapeHtml(String(currentPhase?.phaseNumber || 1))}</button>
      </div>
    </article>
  `;
}

function renderUpcomingCard(ctx) {
  const homework = ctx.actionableHomework.slice(0, 2);
  const items = [
    { title: "Biweekly Strategy Call", date: ctx.client.name === "Greyz Bistro" ? "Fri, Sep 25, 2026 · 2:00 PM" : "Next scheduled call", tag: "Zoom" },
    ...homework.map((item) => ({ title: shortText(item.text, 58), date: item.dueDate ? `Due: ${formatReadableDate(item.dueDate)}` : "Due date pending", tag: "Homework" })),
  ].slice(0, 3);

  return `
    <article class="card client-upcoming-card">
      <div class="section-heading"><h2>Upcoming</h2></div>
      <div class="upcoming-list">
        ${items
          .map(
            (item) => `
          <div class="upcoming-item">
            <span class="upcoming-icon">▣</span>
            <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.date)}</small></div>
            ${statusBadge(item.tag, item.tag === "Zoom" ? "" : "info")}
          </div>`
          )
          .join("")}
      </div>
      <button class="link-btn" data-goto="messages">View Full Calendar</button>
    </article>
  `;
}

function renderCoachingToggleCard() {
  return `
    <article class="card client-toggle-card">
      <label class="switch-row">
        <strong>Show Coaching Program on Dashboard</strong>
        <input type="checkbox" data-toggle-coaching-dashboard ${state.showCoachingOnDashboard ? "checked" : ""} />
        <span class="toggle-switch" aria-hidden="true"></span>
        <span>${state.showCoachingOnDashboard ? "On" : "Off"}</span>
      </label>
    </article>
  `;
}

function renderHomeworkCard(ctx) {
  const items = ctx.actionableHomework.slice(0, 3);
  return `
    <article class="card client-homework-card">
      <div class="section-heading"><h2>Homework & Action Items</h2></div>
      ${
        items.length
          ? `<div class="homework-list">${items
              .map(
                (item, index) => `
            <label class="homework-item">
              <input type="checkbox" disabled ${item.status === "complete" ? "checked" : ""} />
              <span><strong>${escapeHtml(shortText(item.text, 72))}</strong><small>${item.dueDate ? `Due ${escapeHtml(formatReadableDate(item.dueDate))}` : "Due date pending"}</small></span>
              ${statusBadge(priorityLabel(item, index), priorityLabel(item, index).toLowerCase())}
            </label>`
              )
              .join("")}</div>`
          : `<p class="hint">No open homework right now.</p>`
      }
    </article>
  `;
}

function renderReflectionCard(ctx) {
  const reflection = ctx.reflection;
  return `
    <article class="card client-reflection-card">
      <div class="section-heading"><h2>Reflection Prompt</h2></div>
      <span class="quote-mark" aria-hidden="true">“</span>
      <p>${escapeHtml(reflection?.text || "Tenyse will add your next reflection prompt here.")}</p>
      <button class="new-client-btn" data-goto="coaching">Add Your Reflection</button>
    </article>
  `;
}

function renderOpportunityScorecard(ctx) {
  const opportunity = ctx.topOpportunity;
  const score = opportunity ? averageScore(opportunity) : null;
  return `
    <article class="card client-scorecard">
      <div class="section-heading"><h2>Opportunity Scorecard <span>(New Opportunity)</span></h2></div>
      ${
        opportunity
          ? `
        <div class="scorecard-rows">
          ${Object.entries(EVALUATION_CRITERIA)
            .map(([key, label]) => `<div><span>${escapeHtml(label)}</span><span class="stars">${scoreStars(opportunity.scores?.[key])}</span></div>`)
            .join("")}
        </div>
        <div class="scorecard-summary">
          <span>Overall Score</span>
          <strong>${score || "—"} <small>/ 5</small></strong>
          ${statusBadge(OPPORTUNITY_STATUS_LABELS[opportunity.decisionStatus] || opportunity.decisionStatus, "success")}
        </div>`
          : `<p class="hint">No opportunities have been sent to Tenyse yet.</p>`
      }
      <button class="link-btn" data-goto="opportunities">View All Opportunities</button>
    </article>
  `;
}

function renderQuickResourcesCard(ctx) {
  const resources = ctx.resourceItems.length
    ? ctx.resourceItems
    : [
        { title: "LinkedIn Audit: Findings & Fixes" },
        { title: "Missing Assets Checklist" },
        { title: "Brand Narrative Guide" },
        { title: "Opportunity Evaluation Guide" },
      ];

  return `
    <article class="card client-resources-card">
      <div class="section-heading"><h2>Quick Resources</h2></div>
      <div class="quick-resource-list">
        ${resources.map((resource) => `<div><span aria-hidden="true">▧</span>${escapeHtml(resource.title)}</div>`).join("")}
      </div>
      <button class="new-client-btn" data-goto="resources">Go to Resource Library</button>
    </article>
  `;
}

function renderCampaignsView() {
  const target = document.getElementById("campaigns-content");
  if (renderApiGate(target)) return;
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
  if (renderApiGate(target)) return;
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
  if (renderApiGate(target)) return;
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
  const snapshot = apiSnapshot();
  const allResources = snapshot?.coaching?.resources || (clientName ? loadResourcesForClient(clientName) : []);
  const resources = allResources.filter((resource) => resource.kind === "resource");
  document.getElementById("resources-content").innerHTML = `
    <div class="section-heading">
      <h2>Resource Library</h2>
      <p>Guides, templates, and shared materials from Tenyse for this coaching program.</p>
    </div>
    ${
      resources.length
        ? `<div class="resource-library-grid">${resources
            .map(
              (resource) => `
            <article class="card resource-library-card">
              <span class="resource-icon" aria-hidden="true">▧</span>
              <h3>${escapeHtml(resource.title)}</h3>
              ${resource.content ? `<p>${escapeHtml(resource.content)}</p>` : ""}
            </article>`
            )
            .join("")}</div>`
        : `<div class="state-panel compact"><div class="state-icon" aria-hidden="true">▧</div><h3>No resources yet</h3><p>Guides, audits, templates, and shared files from Tenyse will appear here once they are added.</p></div>`
    }
  `;
}

function renderCoachingView() {
  if (renderApiGate(document.getElementById("coaching-content"))) return;
  const snapshot = apiSnapshot();
  renderCoachingProgramView(document.getElementById("coaching-content"), clientName, {
    data: snapshot?.coaching || null,
    onNavigate: navigate,
    onHomeworkPatch: shouldUseClientApi()
      ? async (homeworkId, patch) => {
          await updateClientApiHomework(homeworkId, patch);
          state.apiData = await loadClientApiData(state.chartRange);
          return state.apiData.coaching;
        }
      : null,
    onOpportunitySubmit: shouldUseClientApi()
      ? async (payload) => {
          await postClientApiOpportunity(payload);
          state.apiData = await loadClientApiData(state.chartRange);
          return state.apiData.coaching;
        }
      : null,
  });
}

function renderOpportunitiesView() {
  const snapshot = apiSnapshot();
  const opportunities = snapshot?.coaching?.opportunities || (clientName ? loadOpportunitiesForClient(clientName) : []);
  document.getElementById("opportunities-content").innerHTML = `
    <div class="section-heading"><h2>Opportunities</h2></div>
    ${
      opportunities.length
        ? `<div class="opportunity-list">${opportunities
            .map((opportunity) => {
              const score = averageScore(opportunity);
              return `
                <article class="card opportunity-client-card">
                  <div>
                    <h3>${escapeHtml(opportunity.title)}</h3>
                    ${opportunity.description ? `<p>${escapeHtml(opportunity.description)}</p>` : ""}
                  </div>
                  <div class="scorecard-summary inline">
                    <span>Score</span>
                    <strong>${score || "—"} <small>/ 5</small></strong>
                    ${statusBadge(OPPORTUNITY_STATUS_LABELS[opportunity.decisionStatus] || opportunity.decisionStatus, "success")}
                  </div>
                </article>
              `;
            })
            .join("")}</div>`
        : `<div class="state-panel compact"><div class="state-icon" aria-hidden="true">◎</div><h3>No opportunities logged yet</h3><p>Use the Coaching Program page to send new opportunities to Tenyse before responding.</p><button class="btn-secondary" data-goto="coaching">Send an Opportunity</button></div>`
    }
  `;
  document.getElementById("opportunities-content").querySelector("[data-goto]")?.addEventListener("click", () => navigate("coaching"));
}

function renderMessagesView() {
  document.getElementById("messages-content").innerHTML = `
    <div class="section-heading"><h2>Messages</h2></div>
    <div class="client-message-layout">
      <article class="card">
        <h3>Message Tenyse</h3>
        <p class="hint">Use this space for questions, meeting follow-ups, coaching check-ins, and asset updates for Tenyse.</p>
        <div class="entry-form">
          <div class="field-row">
            <label for="client-message-subject">Subject</label>
            <input id="client-message-subject" type="text" placeholder="Partnership question, asset update, meeting request…" />
          </div>
          <div class="field-row">
            <label for="client-message-body">Message</label>
            <textarea id="client-message-body" rows="4" placeholder="Write your note for Tenyse"></textarea>
          </div>
          <button class="btn-primary" type="button" id="client-message-submit">Prepare Message</button>
          <span id="client-message-result" class="inline-confirmation"></span>
        </div>
      </article>
      <article class="card client-upcoming-card">
        <div class="section-heading"><h2>Calendar</h2></div>
        <div class="upcoming-list">
          <div class="upcoming-item"><span class="upcoming-icon">▣</span><div><strong>Biweekly Strategy Call</strong><small>Fri, Sep 25, 2026 · 2:00 PM</small></div>${statusBadge("Zoom")}</div>
          <div class="upcoming-item"><span class="upcoming-icon">▣</span><div><strong>Next homework review</strong><small>Scheduled by Tenyse</small></div>${statusBadge("Pending", "info")}</div>
        </div>
      </article>
    </div>
  `;
  document.getElementById("client-message-submit").addEventListener("click", () => {
    document.getElementById("client-message-result").textContent = "Message prepared for Tenyse.";
  });
}

function renderFilesView() {
  const snapshot = apiSnapshot();
  const allResources = snapshot?.coaching?.resources || (clientName ? loadResourcesForClient(clientName) : []);
  const checklists = allResources.filter((resource) => resource.kind === "checklist");
  document.getElementById("files-content").innerHTML = `
    <div class="section-heading"><h2>Files</h2></div>
    <div class="resource-library-grid">
      ${
        checklists.length
          ? checklists
              .map(
                (item) => `
            <article class="card resource-library-card">
              <span class="resource-icon" aria-hidden="true">▧</span>
              <h3>${escapeHtml(item.title)}</h3>
              ${item.content ? `<p>${escapeHtml(item.content)}</p>` : ""}
              ${statusBadge(item.completed ? "Complete" : "Needs Review", item.completed ? "success" : "medium")}
            </article>`
              )
              .join("")
          : `<article class="card resource-library-card"><span class="resource-icon" aria-hidden="true">▧</span><h3>Shared files will appear here</h3><p>Media kits, contracts, proposals, and client assets from Tenyse will appear in this section.</p></article>`
      }
    </div>
  `;
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
    case "opportunities":
      return renderOpportunitiesView();
    case "messages":
      return renderMessagesView();
    case "files":
      return renderFilesView();
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
  if (renderApiGate(target)) return;
  const campaign = getCampaigns(state.clientId).find((c) => c.id === state.selectedCampaignId);

  if (!campaign) {
    target.innerHTML = `<p>Campaign not found.</p><button class="link-btn" id="campaign-detail-back">&larr; Back to My Campaigns</button>`;
    document.getElementById("campaign-detail-back").addEventListener("click", () => navigate("campaigns"));
    return;
  }

  const placements = getPlacements(state.clientId).filter((p) => p.campaign === campaign.name);

  if (shouldUseClientApi() && !state.apiNotesByCampaign[campaign.id] && state.apiNotesStatusByCampaign[campaign.id] !== "loading") {
    state.apiNotesStatusByCampaign[campaign.id] = "loading";
    loadClientApiNotes(campaign.id)
      .then((notes) => {
        state.apiNotesByCampaign[campaign.id] = notes;
        state.apiNotesStatusByCampaign[campaign.id] = "loaded";
        if (state.view === "campaign-detail" && state.selectedCampaignId === campaign.id) renderCampaignDetailView();
      })
      .catch((err) => {
        state.apiNotesStatusByCampaign[campaign.id] = "error";
        state.apiNotesByCampaign[campaign.id] = [
          { id: "notes-error", authorName: "System", authorRole: "system", body: `Couldn't load notes: ${err.message}`, createdAt: new Date().toISOString() },
        ];
        if (state.view === "campaign-detail" && state.selectedCampaignId === campaign.id) renderCampaignDetailView();
      });
  }

  renderCampaignDetail(target, {
    campaign,
    placements,
    notes: shouldUseClientApi() ? state.apiNotesByCampaign[campaign.id] || [] : loadNotesForCampaign(campaign.id),
    currentUser: { role: "pr_client", name: session ? session.name : "Client" },
    showClient: false,
    onBack: () => navigate("campaigns"),
    onAddNote: async (body, currentUser) => {
      try {
        if (shouldUseClientApi()) {
          await postClientApiNote(campaign.id, body);
          state.apiNotesByCampaign[campaign.id] = await loadClientApiNotes(campaign.id);
        } else {
          addNote({ campaignId: campaign.id, authorRole: currentUser.role, authorName: currentUser.name, body });
        }
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
    client: currentClientForChrome(),
    sessionEmail: session ? session.email : null,
    currentView: state.view,
    demoState: state.demoState,
    dataSource: state.dataSource,
    engagementType: getEngagementType(),
    programView: activeProgramView(),
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
  const client = currentClientForChrome();
  renderHeader(document.getElementById("client-header"), {
    client,
    dataSource: state.dataSource,
    greeting: `Welcome back, ${greetingName(client)}!`,
    subtitle: "Here's your progress and what's next.",
    searchPlaceholder: "Search resources, placements, or reports...",
    extraAction: supportsCoaching()
      ? {
          label: "Message Tenyse",
          onClick: () => navigate("messages"),
        }
      : null,
    onSearch: (term) => {
      state.searchTerm = term;
      if (state.view === "dashboard" || state.view === "placements") renderCurrentView();
    },
    onHamburgerClick: openSidebarMobile,
  });
}

function showActiveViewElement(view) {
  document.querySelectorAll(".client-view").forEach((el) => el.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
}

function navigate(view) {
  state.view = view;
  showActiveViewElement(view);
  renderSidebarComponent();
  renderCurrentView();
  closeSidebarMobile();
}

function setDemoState(demoState) {
  state.demoState = demoState;
  renderSidebarComponent();
  renderCurrentView();
}

/**
 * Called after anything that can change which nav items even exist
 * (switching data source, or on initial load) — if the current view isn't
 * one this client's engagement type shows anymore (e.g. a coaching-only
 * client's session was on "coaching" and data source flips to mock, which
 * has no coaching concept), land on that mode's actual home view instead
 * of leaving state.view pointed at a view with no nav item to reach it.
 */
function ensureValidView() {
  const engagementType = getEngagementType();
  const showsCoaching = engagementType === "coaching" || engagementType === "pr_and_coaching";
  if (state.view === "coaching" && !showsCoaching) state.view = "dashboard";
  if (engagementType === "coaching") state.programView = "coaching";
  if (!showsCoaching) {
    state.programView = "pr";
    if (["opportunities", "messages", "files"].includes(state.view)) state.view = "dashboard";
  }
}

function setDataSource(dataSource) {
  state.dataSource = dataSource;
  ensureValidView();
  showActiveViewElement(state.view);
  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
  if (shouldUseClientApi() && state.apiStatus === "idle") refreshClientApiData();
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
  const viewParam = new URLSearchParams(location.search).get("view");
  if (viewParam && document.getElementById(`view-${viewParam}`)) {
    state.view = viewParam;
  }

  if (state.clientId === "greyz-bistro" || /greyz/i.test(clientName)) {
    try {
      seedGreyzBistroCoachingData();
    } catch (err) {
      console.warn("Could not seed Greyz Bistro coaching demo data.", err);
    }
  }

  // A coaching-only client (e.g. Greyz Bistro) has no PR data worth
  // landing on — send them straight to their actual program instead of an
  // empty PR Dashboard they'd just have to navigate away from.
  ensureValidView();
  showActiveViewElement(state.view);

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
  if (shouldUseClientApi()) refreshClientApiData();
}
