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

      <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Enrolled Clients</h3></div>
      ${
        coachingClients.length === 0
          ? `<div class="state-panel" style="margin-bottom:20px;">
        <div class="state-icon" aria-hidden="true">👥</div>
        <h3>No coaching clients enrolled yet</h3>
        <p>Add a client via Clients → Edit Info and set Engagement Type to Coaching to enroll them here.</p>
      </div>`
          : `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        ${coachingClients
          .map(
            (c) => `
          <div class="card" style="${selectedClient === c.name ? "border-color:var(--color-coral);" : ""}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
              <h3 style="margin:0 0 4px; color:var(--color-navy);">${escapeHtml(c.name)}</h3>
              ${coachingClients.length > 1 ? `<button type="button" class="btn-secondary" data-select-client="${escapeHtml(c.name)}">${selectedClient === c.name ? "Selected" : "Manage"}</button>` : ""}
            </div>
            ${c.industry ? `<p style="margin:0 0 6px; font-size:0.82rem; color:var(--text-secondary);">${escapeHtml(c.industry)}</p>` : ""}
            ${c.notes ? `<p style="margin:0; font-size:0.85rem;">${escapeHtml(c.notes)}</p>` : ""}
          </div>`
          )
          .join("")}
      </div>`
      }

      ${selectedClient ? programToolsHtml() : ""}
    `;

    container.querySelectorAll("[data-select-client]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedClient = btn.dataset.selectClient;
        activeTab = "phases";
        render();
      });
    });

    if (selectedClient) wireTabs();
  }

  function programToolsHtml() {
    return `
      <div class="section-heading" style="margin-top:24px;">
        <h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">${escapeHtml(selectedClient)}'s Program</h3>
      </div>
      <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--border-light); padding-bottom:10px;">
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
