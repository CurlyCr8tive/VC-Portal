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
import { sectionInfoButton } from "./InfoPopover.js";
import { calculateCoachingProgress } from "../../coachingProgress.js";

const TABS = [
  { id: "phases", label: "Phase Tracker" },
  { id: "opportunities", label: "Opportunity Evaluator" },
  { id: "resources", label: "Resources & Checklist" },
];

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
  let selectedClient = (initialClient && coachingClients.some((c) => c.name === initialClient) ? initialClient : coachingClients[0]?.name) || null;
  let activeTab = "phases";

  render();

  function render() {
    container.innerHTML = `
      <div class="section-heading">
        <h2>Coaching Program ${sectionInfoButton({ title: "Coaching Program", body: "Tenyse's paid coaching track for clients, separate from PR placement work. Each client moves through numbered phases (Research & Discovery, Founder Positioning, etc.) with homework, a call schedule, and an Opportunity Evaluator for scoring incoming brand/media asks against the standing rule: if it doesn't support credibility, audience, partnerships, or revenue, it doesn't get chased." })}</h2>
        <p class="hint" style="margin-top:4px;">Visibility to Revenue — VAAM framework (Visibility, Authority, Alignment, Monetization). Standing rule across every engagement: if it doesn't support credibility, audience, partnerships, or revenue goals, we don't chase it.</p>
      </div>
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
          : ownerClientSwitcherHtml()
      }

      ${selectedClient ? programToolsHtml() : ""}
    `;

    container.querySelector("#coaching-client-select")?.addEventListener("change", (event) => {
      selectedClient = event.target.value;
      activeTab = "phases";
      render();
    });

    container.querySelectorAll("[data-select-client]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedClient = btn.dataset.selectClient;
        activeTab = "phases";
        render();
      });
    });

    if (selectedClient) wireTabs();
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
    const currentPhase = [...phases].reverse().find((phase) => phase.status === "in_progress") || phases.find((phase) => phase.status === "not_started") || phases[phases.length - 1];
    const progress = calculateCoachingProgress({ phases, resources, opportunities });
    const reachedPhases = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    const nextHomework = openHomework[0];

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

  function wireTabs() {
    container.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        render();
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
