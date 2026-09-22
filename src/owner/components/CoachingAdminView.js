// Coaching Program — owner-side admin. Enrollment (a real Client record
// with engagementType "coaching"/"pr_and_coaching") plus the full program
// management tools: the 6-phase VAAM tracker, the partnership opportunity
// evaluator, and the resource/missing-assets library — one client's
// program at a time, selected via the tabs below.
//
// Manages its own local state (selected client, active tab) via a closure
// re-render, same pattern as OutletRatesView.js — this view's selection
// has no reason to survive a navigation away and back.

import { escapeHtml } from "../../client/utils.js";
import { renderPhaseTrackerView } from "./PhaseTrackerView.js?v=20260917-client-name-fix-1";
import { renderOpportunityEvaluator } from "./OpportunityEvaluator.js?v=20260918-info-popover";
import { renderCoachingResourceLibrary } from "./CoachingResourceLibrary.js?v=20260918-then-fix";
import { calculateCoachingProgress } from "../../coachingProgress.js";

const TABS = [
  { id: "phases", label: "Phase Tracker" },
  { id: "opportunities", label: "Opportunity Evaluator" },
  { id: "resources", label: "Resources & Checklist" },
];
const STATUS_LABEL = { not_started: "Not Started", in_progress: "In Progress", complete: "Complete" };
const HOMEWORK_TYPE_LABEL = { action: "Homework", reflection: "Reflection", standing: "Standing Rule" };

export function renderCoachingAdminView(
  container,
  {
    coachingClients = [],
    initialClient = null,
    coachingDataForClient = null,
    syncStatus = "local",
    syncMessage = "",
    onLoadTemplate = null,
    onSavePhase = null,
    onAddHomework = null,
    onSaveHomework = null,
    onRemoveHomework = null,
    onSaveOpportunity = null,
    onRemoveOpportunity = null,
    onSaveResource = null,
    onRemoveResource = null,
  } = {}
) {
  // Prefer initialClient (set when arriving here via a "View Coaching
  // Program" link from a specific client, e.g. ClientsListCard.js or the
  // Dashboard's master button) over just defaulting to the first enrolled
  // client — but only if it's actually a real enrolled client, not
  // whatever string happened to be passed in.
  const initialClientIsValid = Boolean(initialClient && coachingClients.some((c) => c.name === initialClient));
  let selectedClient = (initialClientIsValid ? initialClient : coachingClients[0]?.name) || null;
  let detailMode = initialClientIsValid;
  let activeTab = "phases";
  let activeOverviewTab = "overview";
  let activeActivityFilter = "calls";

  render();

  function render() {
    container.innerHTML = `
      ${coachingHeaderHtml()}
      ${
        syncStatus === "error"
          ? `<p class="hint" style="margin-bottom:12px;">Using demo-ready coaching data for this walkthrough.</p>`
          : syncStatus === "loading"
            ? `<p class="hint" style="margin-bottom:12px;">Loading coaching data...</p>`
            : ""
      }

      ${
        coachingClients.length === 0
          ? `<div class="state-panel" style="margin-bottom:20px;">
        <div class="state-icon" aria-hidden="true">👥</div>
        <h3>No coaching clients enrolled yet</h3>
        <p>Add a client via Clients → Edit Info and set Engagement Type to Coaching to enroll them here.</p>
      </div>`
          : detailMode
            ? detailWorkspaceHtml()
            : overviewDashboardHtml()
      }
    `;

    wireOverview();
    container.querySelector("#coaching-client-select")?.addEventListener("change", (event) => {
      selectedClient = event.target.value;
      activeTab = "phases";
      render();
    });

    container.querySelectorAll("[data-select-client]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedClient = btn.dataset.selectClient;
        detailMode = true;
        activeTab = "phases";
        render();
      });
    });

    container.querySelectorAll("[data-open-client]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedClient = btn.dataset.openClient;
        detailMode = true;
        activeTab = "phases";
        render();
      });
    });

    container.querySelector("[data-back-overview]")?.addEventListener("click", () => {
      detailMode = false;
      render();
    });

    if (selectedClient && detailMode) wireTabs();
  }

  function coachingHeaderHtml() {
    const nav = [
      ["overview", "♖", "Overview"],
      ["programs", "⌘", "Programs"],
      ["clients", "♚", "Clients"],
      ["resources", "▣", "Resources"],
      ["opportunities", "♡", "Opportunities"],
      ["templates", "▤", "Templates"],
      ["settings", "⚙", "Settings"],
    ];
    return `
      <header class="coaching-dashboard-intro">
        <p class="hint">A multi-client command center for the Visibility to Revenue coaching work: progress, calls, assignments, resources, opportunities, and templates.</p>
        <aside class="coaching-quote-card">
          <p>More visibility.<br />More opportunities.<br />More impact.</p>
          <strong>— Tenyse Williams</strong>
        </aside>
      </header>
      <nav class="coaching-subnav" aria-label="Coaching sections">
        ${nav
          .map(
            ([id, icon, label]) => `
              <button type="button" class="${activeOverviewTab === id ? "active" : ""}" data-overview-tab="${id}" aria-pressed="${activeOverviewTab === id ? "true" : "false"}">
                <span aria-hidden="true">${icon}</span>${label}
              </button>
            `
          )
          .join("")}
      </nav>
    `;
  }

  function detailWorkspaceHtml() {
    return `
      <button type="button" class="link-btn coaching-back-link" data-back-overview>&larr; Back to Coaching Overview</button>
      ${ownerClientSwitcherHtml()}
      ${selectedClient ? programToolsHtml() : ""}
    `;
  }

  function overviewDashboardHtml() {
    if (activeOverviewTab !== "overview") return overviewPanelHtml(activeOverviewTab);
    const rows = coachingClientRows();
    const activityItems = [
      { type: "calls", title: "Biweekly Strategy Call — Greyz Bistro", date: "Fri, Sep 9, 2026", time: "2:00 PM – 3:00 PM", label: "Call" },
      { type: "calls", title: "Program Kickoff — Cultural Intelligence", date: "Tue, Sep 22, 2026", time: "1:30 PM – 2:30 PM", label: "Call" },
      { type: "calls", title: "Progress Review — Urban Eats Collective", date: "Wed, Sep 23, 2026", time: "11:00 AM – 12:00 PM", label: "Call" },
      { type: "calls", title: "Demo Prep Check-In", date: "Mon, Sep 29, 2026", time: "10:00 AM – 11:00 AM", label: "Call" },
      { type: "homework", title: "Send feedback on partnership email template", date: "Due Sep 16, 2026", time: "Greyz Bistro", label: "Homework" },
      { type: "homework", title: "Compile 10 potential influencer partners", date: "Due Sep 18, 2026", time: "Greyz Bistro", label: "Homework" },
      { type: "milestones", title: "Phase 5 Outreach Assets opened", date: "Weeks 9–10", time: "Visibility to Revenue", label: "Milestone" },
    ];
    const visibleActivity =
      activeActivityFilter === "all" ? activityItems : activityItems.filter((item) => item.type === activeActivityFilter);
    return `
      <section class="coaching-kpi-grid">
        ${coachingKpiCard("👥", "Coaching Clients", "3", "+1 this month", "coral")}
        ${coachingKpiCard("▥", "Active Programs", "2", "1 cohort starting soon", "coral")}
        ${coachingKpiCard("✓", "Avg. Client Progress", "68%", "+12% from last month", "green")}
        ${coachingKpiCard("▣", "Upcoming Calls", "4", "Next: Sep 9, 2026", "purple")}
      </section>

      <section class="coaching-dashboard-grid">
        <article class="coaching-panel coaching-client-progress-panel">
          <div class="coaching-panel-heading">
            <h3>Client Progress</h3>
            <button type="button" class="link-btn" data-overview-tab="clients">View All</button>
          </div>
          <div class="coaching-client-table-wrap">
            <table class="coaching-client-table">
              <thead>
                <tr><th>Client</th><th>Program</th><th>Progress</th><th>Current Phase</th><th>Next Call</th><th>Actions</th></tr>
              </thead>
              <tbody>${rows.map(clientProgressRowHtml).join("")}</tbody>
            </table>
          </div>
        </article>

        <article class="coaching-panel coaching-program-overview-panel">
          <div class="coaching-panel-heading">
            <h3>Program Overview</h3>
            <button type="button" class="link-btn" data-overview-tab="programs">View All</button>
          </div>
          ${programOverviewRow("🎯", "Visibility to Revenue (90-Day VAAM)", "6 Phases • 12 Weeks", "Help founders grow their visibility, authority, partnerships, and revenue.", "2", "Clients enrolled")}
          ${programOverviewRow("👥", "Cultural Intelligence (6-Week Track)", "6 Modules • 6 Weeks", "Help local businesses connect with nonprofit partners.", "0", "Clients enrolled")}
          <button type="button" class="coaching-program-create" data-overview-tab="programs">
            <span>+</span>
            <div><strong>Create a New Program</strong><small>Build a custom program with your own phases, goals, and resources.</small></div>
            <em aria-hidden="true">›</em>
          </button>
        </article>
      </section>

      <section class="coaching-dashboard-second-row">
        <article class="coaching-panel coaching-activity-panel">
          <div class="coaching-panel-heading">
            <h3>Upcoming Coaching Activity</h3>
            <button type="button" class="link-btn" data-overview-tab="clients">View All</button>
          </div>
          <div class="coaching-activity-tabs" aria-label="Activity filters">
            ${activityFilterButton("all", "All")}
            ${activityFilterButton("calls", "Calls")}
            ${activityFilterButton("homework", "Homework")}
            ${activityFilterButton("milestones", "Milestones")}
          </div>
          ${visibleActivity.map(activityRow).join("")}
        </article>

        <article class="coaching-panel coaching-phase-chart-panel">
          <h3>Phase Completion (All Clients)</h3>
          <div class="coaching-phase-chart" role="img" aria-label="Phase completion: Phase 1 80%, Phase 2 65%, Phase 3 50%, Phase 4 35%, Phase 5 20%, Phase 6 10%">
            ${phaseCompletionBar(1, "Research & Discovery", 80)}
            ${phaseCompletionBar(2, "Founder Positioning", 65)}
            ${phaseCompletionBar(3, "Media & Thought Leadership", 50)}
            ${phaseCompletionBar(4, "Partnership Roadmap", 35)}
            ${phaseCompletionBar(5, "Outreach Assets", 20)}
            ${phaseCompletionBar(6, "Growth Roadmap", 10)}
          </div>
        </article>

        <article class="coaching-panel coaching-notes-panel">
          <div class="coaching-panel-heading">
            <h3>Recent Client Notes</h3>
            <button type="button" class="link-btn" data-overview-tab="clients">View All</button>
          </div>
          ${noteRow("GC", "Garth is finalizing partnership list. Reviewed media pitch draft and provided feedback.", "Sep 6, 2026")}
          ${noteRow("UE", "Client shared new event opportunity. Added to opportunity evaluator.", "Sep 5, 2026")}
          ${noteRow("NB", "Intro call went well. Interested in Q1 cohort.", "Sep 4, 2026")}
        </article>
      </section>

      <section class="coaching-dashboard-bottom-row">
        <article class="coaching-panel coaching-tools-panel">
          <h3>Tools &amp; Resources</h3>
          <div class="coaching-tools-grid">
            ${toolCard("⚖", "Opportunity Evaluator", "Score and evaluate incoming opportunities.", "Open Tool", "opportunities")}
            ${toolCard("▣", "Resource Library", "Guides, templates, and past call materials.", "Browse", "resources")}
            ${toolCard("☷", "Missing Assets Checklist", "Track what each client still needs to provide.", "Open Checklist", "resources")}
            ${toolCard("▤", "Templates", "Use or customize phase templates.", "View Templates", "templates")}
          </div>
        </article>
        <article class="coaching-panel coaching-quick-actions-panel">
          <h3>💡 Quick Actions</h3>
          <div class="coaching-quick-actions">
            <button type="button" data-overview-tab="clients">Add a Client to Coaching</button>
            <button type="button" data-overview-tab="clients">Schedule a Call</button>
            <button type="button" data-overview-tab="resources">Upload a Resource</button>
            <button type="button" data-overview-tab="opportunities">View All Opportunities</button>
          </div>
        </article>
      </section>
    `;
  }

  function wireOverview() {
    container.querySelectorAll("[data-overview-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeOverviewTab = btn.dataset.overviewTab;
        detailMode = false;
        render();
      });
    });

    container.querySelector(".coaching-search input")?.addEventListener("input", (event) => {
      const term = event.target.value.toLowerCase();
      container.querySelectorAll("[data-coaching-row]").forEach((row) => {
        row.hidden = term && !row.textContent.toLowerCase().includes(term);
      });
    });

    container.querySelectorAll("[data-activity-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeActivityFilter = btn.dataset.activityFilter;
        render();
      });
    });
  }

  function coachingKpiCard(icon, label, value, note, tone) {
    return `
      <article class="coaching-kpi-card ${tone}">
        <span aria-hidden="true">${icon}</span>
        <div><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>
      </article>
    `;
  }

  function coachingClientRows() {
    const greyzData = coachingDataForClient ? coachingDataForClient("Greyz Bistro") : null;
    const greyzProgress = greyzData?.phases?.length ? overallProgressPercent(greyzData.phases, calculateCoachingProgress(greyzData)) : 83;
    const rows = [
      {
        initials: "GC",
        client: "Greyz Bistro",
        sub: "Chef Garth",
        program: "Visibility to Revenue",
        programSub: "(90-Day VAAM)",
        progress: greyzProgress,
        phase: "Phase 5",
        phaseSub: "Outreach Assets",
        nextCall: "Fri, Sep 9",
        nextCallSub: "2:00 PM",
        action: "View",
        openClient: "Greyz Bistro",
      },
      { initials: "RL", client: "Raise Local Cohort 1", sub: "(Coming Soon)", program: "Cultural Intelligence", programSub: "(6-Week Track)", progress: 0, phase: "Not Started", phaseSub: "", nextCall: "—", nextCallSub: "", action: "Setup", disabled: true },
      { initials: "UE", client: "Urban Eats Collective", sub: "", program: "Visibility to Revenue", programSub: "(90-Day VAAM)", progress: 25, phase: "Phase 2", phaseSub: "Founder Positioning", nextCall: "Wed, Sep 23", nextCallSub: "11:00 AM", action: "View", disabled: true },
      { initials: "NB", client: "Nourish Brooklyn", sub: "(Interested)", program: "TBD", programSub: "", progress: null, phase: "—", phaseSub: "", nextCall: "—", nextCallSub: "", action: "Invite", disabled: true },
    ];
    return rows;
  }

  function clientProgressRowHtml(row) {
    const progressText = row.progress == null ? "—" : `${row.progress}%`;
    const progressBar = row.progress == null ? `<span class="coaching-progress-dash">—</span>` : `<span>${row.progress}%</span><div class="coaching-mini-progress"><b style="width:${row.progress}%;"></b></div>`;
    return `
      <tr data-coaching-row>
        <td><div class="coaching-client-cell"><span>${escapeHtml(row.initials)}</span><div><strong>${escapeHtml(row.client)}</strong><small>${escapeHtml(row.sub)}</small></div></div></td>
        <td><strong>${escapeHtml(row.program)}</strong><small>${escapeHtml(row.programSub)}</small></td>
        <td class="coaching-progress-cell" aria-label="${escapeHtml(progressText)}">${progressBar}</td>
        <td><strong>${escapeHtml(row.phase)}</strong><small>${escapeHtml(row.phaseSub)}</small></td>
        <td><strong>${escapeHtml(row.nextCall)}</strong><small>${escapeHtml(row.nextCallSub)}</small></td>
        <td><button type="button" class="coaching-table-action" ${row.disabled ? "disabled" : `data-open-client="${escapeHtml(row.openClient)}"`}>${escapeHtml(row.action)}</button><button type="button" class="coaching-overflow" aria-label="More actions for ${escapeHtml(row.client)}" ${row.disabled ? "disabled" : ""}>⋮</button></td>
      </tr>
    `;
  }

  function programOverviewRow(icon, title, meta, body, count, label) {
    return `
      <button type="button" class="coaching-program-row" data-overview-tab="programs">
        <span aria-hidden="true">${icon}</span>
        <div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small><p>${escapeHtml(body)}</p></div>
        <em><b>${escapeHtml(count)}</b>${escapeHtml(label)}</em>
        <i aria-hidden="true">›</i>
      </button>
    `;
  }

  function activityFilterButton(id, label) {
    return `<button type="button" class="${activeActivityFilter === id ? "active" : ""}" data-activity-filter="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  }

  function activityRow(item) {
    return `<div class="coaching-activity-row"><span aria-hidden="true">▣</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.date)} &nbsp; ${escapeHtml(item.time)}</small></div><em>${escapeHtml(item.label)}</em></div>`;
  }

  function phaseCompletionBar(num, label, percent) {
    return `<div class="coaching-phase-bar phase-${num}"><strong>${percent}%</strong><span style="height:${percent}%;"></span><small>Phase ${num}<br />${escapeHtml(label)}</small></div>`;
  }

  function noteRow(initials, text, date) {
    return `<div class="coaching-note-row"><span>${escapeHtml(initials)}</span><p>${escapeHtml(text)}</p><em>${escapeHtml(date)}</em></div>`;
  }

  function toolCard(icon, title, body, button, tab) {
    return `<article class="coaching-tool-card"><span aria-hidden="true">${icon}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div><button type="button" data-overview-tab="${escapeHtml(tab)}">${escapeHtml(button)}</button></article>`;
  }

  function overviewPanelHtml(tab) {
    const titles = {
      programs: "Programs",
      clients: "Clients",
      resources: "Resources",
      opportunities: "Opportunities",
      templates: "Templates",
      settings: "Settings",
    };
    if (tab === "clients") {
      return `
        <section class="coaching-panel coaching-tab-panel">
          <div class="coaching-panel-heading"><h3>Coaching Clients</h3><button type="button" class="link-btn" data-overview-tab="overview">Back to Overview</button></div>
          <div class="coaching-client-table-wrap"><table class="coaching-client-table"><tbody>${coachingClientRows().map(clientProgressRowHtml).join("")}</tbody></table></div>
        </section>
      `;
    }
    if (tab === "resources" || tab === "opportunities") {
      return `
        <section class="coaching-panel coaching-tab-panel">
          <div class="coaching-panel-heading"><h3>${titles[tab]}</h3><button type="button" class="link-btn" data-overview-tab="overview">Back to Overview</button></div>
          <p class="hint">Choose Greyz Bistro to use the existing ${tab === "resources" ? "Resource Library and Missing Assets Checklist" : "Opportunity Evaluator"} workspace.</p>
          <button type="button" class="btn-primary" data-open-client="Greyz Bistro">Open Greyz Bistro Workspace</button>
        </section>
      `;
    }
    return `
      <section class="coaching-panel coaching-tab-panel">
        <div class="coaching-panel-heading"><h3>${escapeHtml(titles[tab] || "Coaching")}</h3><button type="button" class="link-btn" data-overview-tab="overview">Back to Overview</button></div>
        <p class="hint">${tab === "programs" ? "Program templates are represented here for the demo. Open a client workspace to edit phases, homework, and resources." : "This area is prepared for the live handoff; existing coaching work remains available in the client workspace."}</p>
        <div class="coaching-program-overview-panel">
          ${programOverviewRow("🎯", "Visibility to Revenue (90-Day VAAM)", "6 Phases • 12 Weeks", "Help founders grow their visibility, authority, partnerships, and revenue.", "2", "Clients enrolled")}
          ${programOverviewRow("👥", "Cultural Intelligence (6-Week Track)", "6 Modules • 6 Weeks", "Help local businesses connect with nonprofit partners.", "0", "Clients enrolled")}
        </div>
      </section>
    `;
  }

  function ownerClientSwitcherHtml() {
    const selected = coachingClients.find((client) => client.name === selectedClient) || coachingClients[0];
    return `
      <section class="card owner-coaching-switcher">
        <div>
          <p class="eyebrow">Owner coaching workspace</p>
          <h3>Manage one client program at a time</h3>
          <p class="hint">Tenyse can switch clients here, review progress, update homework, track opportunities, and manage the resources/checklist the client sees.</p>
        </div>
        <div class="owner-coaching-select-block">
          <label for="coaching-client-select">Coaching client</label>
          <select id="coaching-client-select">
            ${coachingClients
              .map((client) => `<option value="${escapeHtml(client.name)}" ${client.name === selectedClient ? "selected" : ""}>${escapeHtml(client.name)}</option>`)
              .join("")}
          </select>
          ${selected?.industry ? `<p>${escapeHtml(selected.industry)}</p>` : ""}
        </div>
      </section>
    `;
  }

  function programToolsHtml() {
    const selected = coachingClients.find((client) => client.name === selectedClient);
    const clientData = coachingDataForClient ? coachingDataForClient(selectedClient) : null;
    const phases = clientData?.phases || [];
    const resources = clientData?.resources || [];
    const opportunities = clientData?.opportunities || [];
    const homework = phases.flatMap((phase) => (phase.homework || []).map((item) => ({ ...item, phaseName: phase.name, phaseNumber: phase.phaseNumber })));
    const openHomework = homework.filter((item) => item.type !== "standing" && item.status !== "complete");
    const completedHomework = homework.filter((item) => item.type !== "standing" && item.status === "complete");
    const currentPhase = currentPhaseFor(phases);
    const progress = calculateCoachingProgress({ phases, resources, opportunities });
    const progressPercent = overallProgressPercent(phases, progress);
    const reachedPhases = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    const nextHomework = openHomework[0];
    const phaseHomework = (currentPhase?.homework || []).filter((item) => item.type !== "standing");
    const phaseActions = phaseHomework.filter((item) => item.type !== "reflection").slice(0, 4);
    const reflection = phaseHomework.find((item) => item.type === "reflection") || homework.find((item) => item.type === "reflection");
    const featuredResource =
      resources.find((item) => item.title === "How to Craft a Strong Partnership Pitch") ||
      resources.find((item) => item.kind === "resource" && item.priority === "high") ||
      resources.find((item) => item.kind === "resource");
    const checklist = resources.filter((item) => item.kind === "checklist");
    const activeOpportunities = opportunities.filter((item) => item.decisionStatus !== "declined").length;

    return `
      <section class="owner-coaching-hero">
        <div>
          <p class="eyebrow">${escapeHtml(selectedClient)}'s program</p>
          <h3>Visibility to Revenue — 90-Day Sprint</h3>
          <p>${escapeHtml(selected?.notes || "Track the client’s phases, assignments, resources, incoming opportunities, and communication flow from one owner workspace.")}</p>
        </div>
        <div class="owner-coaching-hero-grid">
          <div><span>${phases.length ? `${reachedPhases}/${phases.length}` : "0/0"}</span><small>Phases reached</small></div>
          <div><span>${progress.homework.percent}%</span><small>Homework complete</small></div>
          <div><span>${resources.length}</span><small>Resources/checklist</small></div>
          <div><span>${opportunities.length}</span><small>Opportunities logged</small></div>
        </div>
      </section>

      <section class="owner-coaching-prototype" aria-label="Coaching program overview">
        <div class="owner-coaching-main">
          <article class="owner-coaching-progress-card live-card" tabindex="0" data-live-tip="${escapeHtml(`Overall roadmap progress is ${progressPercent}%, with ${reachedPhases} of ${phases.length} phases reached.`)}">
            <div class="owner-coaching-card-head">
              <div>
                <h3>Overall Progress</h3>
                <p><strong>${progressPercent}%</strong> complete</p>
              </div>
              <span>${reachedPhases} of ${phases.length} phases</span>
            </div>
            <div class="owner-coaching-progress-track"><span style="width:${progressPercent}%;"></span></div>
            <div class="owner-coaching-roadmap">
              ${phases.map((phase) => roadmapStepHtml(phase, currentPhase)).join("")}
            </div>
            <div class="live-tip-panel" role="tooltip"><strong>Overall Progress</strong><p>${escapeHtml(`This is the client-facing roadmap from the presentation: Visibility, Authority, Alignment, and Monetization across a 90-day sprint.`)}</p><span>Current phase: ${escapeHtml(currentPhase?.name || "Not started")}</span></div>
          </article>

          ${currentPhase ? phaseFocusHtml(currentPhase, featuredResource) : ""}

          <div class="owner-coaching-action-grid">
            ${ownerActionCard("Opportunity Evaluator", "New brand or event opportunity? Run it through the scoring card before the client responds.", "Evaluate an Opportunity", "opportunities")}
            ${ownerActionCard("Resource Library", "Access guides, templates, LinkedIn audit notes, and past call materials anytime.", "Browse Resources", "resources")}
            ${ownerActionCard("Missing Assets Checklist", "Track what's still needed for brand, media, and outreach work.", "View Checklist", "resources")}
          </div>
        </div>

        <aside class="owner-coaching-side">
          <article class="owner-coaching-side-card live-card" tabindex="0" data-live-tip="This keeps coach communication in the same place as homework, resources, and opportunities.">
            <h3>Your Coach</h3>
            <div class="owner-coach-row">
              <div class="owner-coach-avatar">TW</div>
              <div>
                <strong>Tenyse Williams</strong>
                <span>Founder, Verified Consulting</span>
              </div>
            </div>
            <p>Next call context: review outreach assets, partnership email feedback, and influencer partner list.</p>
            <div class="live-tip-panel" role="tooltip"><strong>Coach context</strong><p>Tenyse can prepare for the next coaching call from the client’s latest homework, resources, and opportunities.</p><span>Owner workspace</span></div>
          </article>

          <article class="owner-coaching-side-card live-card" tabindex="0" data-live-tip="${escapeHtml(`${phaseActions.length || openHomework.length} visible homework items keep the client moving between calls.`)}">
            <h3>This Phase's Homework</h3>
            <div class="owner-homework-list">
              ${(phaseActions.length ? phaseActions : openHomework.slice(0, 4)).map(homeworkRowHtml).join("") || `<p class="hint">No open homework for this phase.</p>`}
            </div>
            <button type="button" class="new-client-btn" data-tab-jump="phases">View All Homework</button>
            <div class="live-tip-panel" role="tooltip"><strong>Homework tracking</strong><p>Assignments and reflection prompts are phase-specific, visible to the client, and reviewable by Tenyse.</p><span>Open Phase Tracker</span></div>
          </article>

          <article class="owner-coaching-side-card live-card" tabindex="0" data-live-tip="Reflection responses give Tenyse qualitative context between sessions.">
            <h3>Reflection Prompt</h3>
            <p class="owner-reflection-prompt">“${escapeHtml(reflection?.text || "What's one partnership opportunity that excites you right now, and what would make it a good fit for your brand?")}”</p>
            <div class="owner-reflection-box">${escapeHtml(reflection?.response || "Awaiting client response...")}</div>
            <small>${reflection?.status === "complete" ? "Saved by client" : "Last saved: Sep 10, 2026"}</small>
            <div class="live-tip-panel" role="tooltip"><strong>Reflection Prompt</strong><p>The client can answer from their portal; Tenyse sees the response here with the rest of the program context.</p><span>Client portal + owner review</span></div>
          </article>

          <article class="owner-coaching-side-card owner-coaching-stats-card">
            <p>Progress is not just about what the client does; it is about who they become in the process.</p>
            <strong>Keep going.</strong>
            <dl>
              <div><dt>Checklist</dt><dd>${progress.checklist.complete}/${progress.checklist.total}</dd></div>
              <div><dt>Active opportunities</dt><dd>${activeOpportunities}</dd></div>
            </dl>
          </article>
        </aside>
      </section>

      <section class="owner-coaching-detail-grid">
        <article class="card live-card" tabindex="0" data-live-tip="${escapeHtml(currentPhase ? `Current phase: ${currentPhase.name}` : "Load a program template to begin tracking phases.")}">
          <p class="eyebrow">Current focus</p>
          <h3>${currentPhase ? `Phase ${escapeHtml(String(currentPhase.phaseNumber))}: ${escapeHtml(currentPhase.name)}` : "No phases loaded yet"}</h3>
          <p>${escapeHtml(currentPhase?.goal || "Load the VAAM program template, then customize the phase goals and deliverables for this client.")}</p>
          <div class="live-tip-panel" role="tooltip"><strong>Current focus</strong><p>${escapeHtml(currentPhase?.notes || "This gives Tenyse the coaching context before the next call.")}</p><span>Use Phase Tracker below to edit details.</span></div>
        </article>
        <article class="card live-card" tabindex="0" data-live-tip="${escapeHtml(nextHomework ? `Next assignment: ${nextHomework.text}` : "No open homework right now.")}">
          <p class="eyebrow">Homework & assignments</p>
          <h3>${openHomework.length} open · ${completedHomework.length} complete</h3>
          <p>${nextHomework ? `${nextHomework.text}${nextHomework.dueDate ? ` · due ${nextHomework.dueDate}` : ""}` : "Add homework in the Phase Tracker to make the between-call workflow visible."}</p>
          <div class="live-tip-panel" role="tooltip"><strong>Assignment tracking</strong><p>Homework belongs to phases, can be marked not started/in progress/complete, and reflection responses show up for Tenyse to review.</p><span>Open Phase Tracker → Homework.</span></div>
        </article>
        <article class="card live-card" tabindex="0" data-live-tip="Communication stays tied to coaching context: homework, reflections, opportunity review, and files/resources.">
          <p class="eyebrow">Communication flow</p>
          <h3>Coach follows up from the work</h3>
          <p>Client reflections, opportunity submissions, shared resources, and missing assets all live beside the roadmap so Tenyse can prepare for the next call without searching across tools.</p>
          <div class="live-tip-panel" role="tooltip"><strong>Communication flow</strong><p>This is the operating layer: what the client owes, what Tenyse reviews, and what needs follow-up.</p><span>Use Resources & Checklist plus Opportunity Evaluator.</span></div>
        </article>
      </section>

      <div class="coaching-admin-tabs">
        ${TABS.map(
          (t) => `<button type="button" class="${activeTab === t.id ? "btn-primary" : "btn-secondary"}" data-tab="${t.id}">${t.label}</button>`
        ).join("")}
      </div>
      <div id="coaching-tab-content"></div>
    `;
  }

  function currentPhaseFor(phases) {
    return [...phases].reverse().find((phase) => phase.status === "in_progress") || phases.find((phase) => phase.status === "not_started") || phases[phases.length - 1];
  }

  function overallProgressPercent(phases, progress) {
    const reached = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    return phases.length ? Math.round((reached / phases.length) * 100) : progress.phases.percent;
  }

  function roadmapStepHtml(phase, currentPhase) {
    const displayStatus = phase.status === "complete" ? "complete" : phase.id === currentPhase?.id ? "in_progress" : "not_started";
    return `
      <div class="owner-roadmap-step ${displayStatus}">
        <span>${displayStatus === "complete" ? "✓" : escapeHtml(String(phase.phaseNumber))}</span>
        <strong>${escapeHtml(String(phase.phaseNumber))}</strong>
        <p>${escapeHtml(phase.name)}</p>
      </div>
    `;
  }

  function phaseFocusHtml(phase, resource) {
    const deliverables = phase.deliverables?.length
      ? phase.deliverables
      : ["One sheet (PDF)", "Media pitch (customized)", "Partnership email template", "Influencer vetting criteria"];
    const goals = phaseGoalBullets(phase);
    return `
      <article class="owner-phase-focus-card live-card" tabindex="0" data-live-tip="${escapeHtml(`Current focus: Phase ${phase.phaseNumber}, ${phase.name}.`)}">
        <div class="owner-phase-header">
          <div>
            <span class="owner-phase-pill">Phase ${escapeHtml(String(phase.phaseNumber))}</span>
            <span class="owner-phase-weeks">Weeks ${escapeHtml(phase.weeks || String(phase.phaseNumber))}</span>
          </div>
          <span class="owner-phase-status">${escapeHtml(STATUS_LABEL[phase.status] || phase.status)}</span>
        </div>
        <div class="owner-phase-content">
          <div>
            <h3>${escapeHtml(phase.name)}</h3>
            <p>${escapeHtml(phase.goal)}</p>
            <div class="owner-phase-list">
              <h4>Goals</h4>
              <ul>${goals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="owner-phase-list">
              <h4>Deliverables</h4>
              <ul class="owner-deliverable-list">${deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
          </div>
          <div class="owner-featured-resource">
            <h4>Featured Resource</h4>
            <div class="owner-video-card"><span aria-hidden="true">▶</span><div><b></b><em>0:00 / 12:34</em></div></div>
            <h5>${escapeHtml(resource?.title || "How to Craft a Strong Partnership Pitch")}</h5>
            <p>${escapeHtml(resource?.content || "A step-by-step walkthrough on what to include, how to position your value, and common mistakes to avoid.")}</p>
          </div>
        </div>
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(phase.name)}</strong><p>${escapeHtml(phase.notes || phase.goal)}</p><span>Review goals, deliverables, and featured resources.</span></div>
      </article>
    `;
  }

  function phaseGoalBullets(phase) {
    if (phase.phaseNumber === 5) return ["Finalize outreach-ready assets", "Prepare for partner and media conversations", "Get clear on influencer and brand fit criteria"];
    if (phase.phaseNumber === 4) return ["Use the standing rule before responding", "Score opportunities against credibility and revenue", "Prioritize warm partnership paths"];
    if (phase.phaseNumber === 3) return ["Translate authority into public language", "Shape media angles from real proof", "Make LinkedIn support the positioning"];
    return ["Clarify the client's position", "Capture decisions in one place", "Move from visibility toward opportunity"];
  }

  function homeworkRowHtml(item) {
    return `
      <div class="owner-homework-row ${item.status === "complete" ? "complete" : ""}">
        <span aria-hidden="true">${item.status === "complete" ? "✓" : ""}</span>
        <div>
          <strong>${escapeHtml(item.text)}</strong>
          <small>${escapeHtml(HOMEWORK_TYPE_LABEL[item.type] || "Homework")}</small>
        </div>
        <em>${escapeHtml(shortDate(item.dueDate))}</em>
      </div>
    `;
  }

  function shortDate(dateStr) {
    if (!dateStr) return "Due date pending";
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  function ownerActionCard(title, body, label, tab) {
    return `
      <article class="owner-action-card live-card" tabindex="0" data-live-tip="${escapeHtml(body)}">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <button type="button" class="btn-secondary" data-tab-jump="${escapeHtml(tab)}">${escapeHtml(label)}</button>
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p><span>${escapeHtml(label)}</span></div>
      </article>
    `;
  }

  function wireTabs() {
    container.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    container.querySelectorAll("[data-tab-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tabJump;
        render();
        document.getElementById("coaching-tab-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const tabContent = document.getElementById("coaching-tab-content");
    if (!tabContent) return;
    const clientData = coachingDataForClient ? coachingDataForClient(selectedClient) : null;
    if (activeTab === "phases") {
      renderPhaseTrackerView(tabContent, selectedClient, {
        phases: clientData?.phases || null,
        onLoadTemplate,
        onSavePhase,
        onAddHomework,
        onSaveHomework,
        onRemoveHomework,
      });
    } else if (activeTab === "opportunities") {
      renderOpportunityEvaluator(tabContent, selectedClient, {
        opportunities: clientData?.opportunities || null,
        onSaveOpportunity,
        onRemoveOpportunity,
      });
    } else if (activeTab === "resources") {
      renderCoachingResourceLibrary(tabContent, selectedClient, {
        resources: clientData?.resources || null,
        onSaveResource,
        onRemoveResource,
      });
    }
  }
}
