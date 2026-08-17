import { CLIENTS, METRICS, PLACEMENTS, CAMPAIGNS, CHART_SERIES, AGGREGATE_INSIGHT, REPORTS } from "../client/mockData.js";
import {
  getRealClients,
  getRealMetrics,
  getRealCampaigns,
  getAllRealPlacements,
  getAllRealCampaigns,
  getAggregateRealMetrics,
  getAggregateRealChartSeries,
  getAggregateRealInsight,
  getRealReport,
} from "../realDataSource.js";
import { requireSession, logout } from "../auth.js";
import { createPlacement, applyPlacementEdit } from "../schema.js";
import { addPlacement, updatePlacement, deletePlacement } from "../storage.js";
import { createCampaign, applyCampaignEdit, addMilestone, toggleMilestone, removeMilestone } from "../campaignSchema.js";
import { loadCampaigns, addCampaign, updateCampaign as updateCampaignRecord, deleteCampaign } from "../campaignStorage.js";
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
import { renderCoachingAdminView } from "./components/CoachingAdminView.js";
import { renderCampaignDetail } from "../client/components/CampaignDetailView.js";
import { loadNotesForCampaign, addNote } from "../notesStorage.js";
import { loadSummary, saveSummary, approveSummary } from "../summaryStorage.js";
import { escapeHtml } from "../client/utils.js";
import { generateCanvaExport, downloadCsv } from "./canvaExport.js";
import { seedSamplePlacements } from "./seedSampleData.js";

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
  dataSource: "real", // real | mock — real reads storage.js placements across all clients
  chartRange: "30d",
  searchTerm: "",
  editingPlacementId: null,
  editingCampaignId: null,
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
function renderSummaryForm(container, clientName) {
  const existing = loadSummary(clientName);
  const statusLine = existing?.approvedAt
    ? `<p class="hint" style="margin:0 0 10px; color:var(--color-teal); font-weight:600;">✓ Approved ${escapeHtml(existing.approvedAt.slice(0, 10))} — eligible for inclusion in a Canva export.</p>`
    : existing
      ? `<p class="hint" style="margin:0 0 10px;">Saved as a draft, not yet approved — won't be included in a Canva export until it is.</p>`
      : `<p class="hint" style="margin:0 0 10px;">No draft saved yet.</p>`;

  container.innerHTML = `
    <p style="margin:0 0 8px; font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Executive Summary</p>
    <p class="hint" style="margin:0 0 10px;">No AI writer is wired up yet — write this by hand for now. It shows up on ${escapeHtml(clientName)}'s report above and on their own dashboard once saved.</p>
    <p class="hint" style="margin:0 0 10px;">Tenyse's own case studies follow Problem → Solution → Results — worth keeping that shape here too.</p>
    ${statusLine}
    <div class="entry-form">
      <div class="field-row" style="margin-bottom:10px;">
        <textarea id="summary-text-${cssId(clientName)}" rows="4" placeholder="e.g. [Problem] Coverage was limited to local outlets. [Solution] We pitched an industry-specific angle to trade press. [Results] Landed 3 placements reaching 200K+ readers, building toward national pickup next period.">${existing ? existing.text : ""}</textarea>
      </div>
      <div class="form-actions" style="display:flex; gap:10px;">
        <button type="button" class="btn-primary" id="summary-save-${cssId(clientName)}">Save Draft</button>
        <button type="button" class="btn-secondary" id="summary-approve-${cssId(clientName)}" ${!existing ? "disabled" : ""} title="${!existing ? "Save a draft first" : "Approves the saved draft above — not unsaved edits in the box"}">Approve</button>
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
    <div class="section-heading" style="margin-top:24px;"><h2>Agent Error Log</h2></div>
    <div class="card">
      <div class="state-panel">
        <div class="state-icon" aria-hidden="true">✅</div>
        <h3>No agent errors — because no agents run yet</h3>
        <p>This isn't "all clear," it's "nothing exists to fail yet." The Discovery, AVE, and Design agents are all still Planned
          (see the PRD's Execution table). Once any of them run in Supabase, failures land in the <code>errors</code> table
          (drafted in <code>db/schema.sql</code>) and will list here: which agent, when, and what went wrong — never silently
          dropped.</p>
      </div>
    </div>
    <div class="section-heading" style="margin-top:24px;"><h2>Developer Tools</h2></div>
    <div class="card">
      <p style="margin:0 0 12px;">Not a real product feature — a shortcut for testing. Adds 5 realistic, complete placements
        across two clients (via the same Add Placement path the form uses), so there's something real to try the
        Press Placements table, campaigns, and Canva export against without typing them in by hand.</p>
      <button class="btn-secondary" id="seed-sample-data-btn">Load Sample Placements</button>
      <span id="seed-sample-data-result" style="margin-left:10px; font-size:0.85rem; color:var(--text-secondary);"></span>
    </div>
  `;

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
  renderCoachingAdminView(document.getElementById("coaching-content"));
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

function setDataSource(dataSource) {
  state.dataSource = dataSource;
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
  const dataParam = new URLSearchParams(location.search).get("data");
  if (["real", "mock"].includes(dataParam)) {
    state.dataSource = dataParam;
  }

  renderSidebarComponent();
  renderHeaderComponent();
  renderCurrentView();
}
