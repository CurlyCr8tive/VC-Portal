// src/owner/components/OpportunityEvaluator.js
//
// The partnership/brand opportunity evaluator — every incoming opportunity
// pressure-tested against the same five criteria from the kickoff deck
// before the client acts on it. Reinforces the standing coaching rule:
// opportunities come to Tenyse first, and this is where that review
// actually gets recorded instead of only living in a call.

import { escapeHtml } from "../../client/utils.js";
import {
  EVALUATION_CRITERIA,
  EVALUATION_CRITERIA_HELP,
  DECISION_STATUSES,
  createOpportunity,
  applyOpportunityEdit,
  averageScore,
} from "../../opportunitySchema.js";
import { loadOpportunitiesForClient, addOpportunity, updateOpportunity, deleteOpportunity } from "../../opportunityStorage.js";

const DECISION_LABEL = { pursuing: "Pursuing", pressure_testing: "Pressure Testing", declined: "Declined" };
const DECISION_BADGE_CLASS = { pursuing: "published", pressure_testing: "in-progress", declined: "client-past" };

export function renderOpportunityEvaluator(container, clientName) {
  let showingForm = false;
  let editingId = null;

  render();

  function render() {
    const opportunities = loadOpportunitiesForClient(clientName);
    container.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
        <button type="button" class="btn-primary" id="oe-new-btn">${showingForm && !editingId ? "Cancel" : "+ New Opportunity"}</button>
      </div>
      ${showingForm ? formHtml(editingId ? opportunities.find((o) => o.id === editingId) : null) : ""}
      ${
        opportunities.length === 0 && !showingForm
          ? `<div class="state-panel"><div class="state-icon" aria-hidden="true">🤝</div><h3>No opportunities logged yet</h3><p>When an event, brand collab, or influencer ask comes in for ${escapeHtml(clientName)}, log it here before they respond to anyone.</p></div>`
          : opportunities.map((o) => cardHtml(o)).join("")
      }
    `;

    container.querySelector("#oe-new-btn").addEventListener("click", () => {
      if (showingForm && !editingId) {
        showingForm = false;
      } else {
        showingForm = true;
        editingId = null;
      }
      render();
    });

    if (showingForm) wireForm(editingId ? opportunities.find((o) => o.id === editingId) : null);

    opportunities.forEach((o) => wireCard(o));
  }

  function formHtml(existing) {
    const scores = existing?.scores || {};
    return `
      <div class="entry-form card" style="margin-bottom:16px;" id="oe-form">
        <div class="field-row">
          <label>Opportunity Title *</label>
          <input type="text" id="oe-title" placeholder="e.g. WIADCA Carnival — VIP Breakfast Partner" value="${existing ? escapeHtml(existing.title) : ""}" required />
        </div>
        <div class="field-row">
          <label>Description</label>
          <textarea id="oe-description" rows="2" placeholder="What's actually being offered/asked">${existing ? escapeHtml(existing.description) : ""}</textarea>
        </div>
        <p style="margin:8px 0 4px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Score each 1–5 (blank = not yet scored)</p>
        ${Object.entries(EVALUATION_CRITERIA)
          .map(
            ([key, label]) => `
          <div class="field-row two-col" style="align-items:end;">
            <div>
              <label for="oe-score-${key}">${escapeHtml(label)}</label>
              <input type="number" id="oe-score-${key}" min="1" max="5" step="1" value="${scores[key] ?? ""}" />
            </div>
            <p class="hint" style="margin:0;">${escapeHtml(EVALUATION_CRITERIA_HELP[key])}</p>
          </div>`
          )
          .join("")}
        <div class="field-row">
          <label>Write-up</label>
          <textarea id="oe-writeup" rows="3" placeholder="Short reasoning behind the scores/decision">${existing ? escapeHtml(existing.writeUp) : ""}</textarea>
        </div>
        <div class="field-row">
          <label>Decision Status</label>
          <select id="oe-decision">
            ${DECISION_STATUSES.map((s) => `<option value="${s}" ${(existing?.decisionStatus || "pressure_testing") === s ? "selected" : ""}>${DECISION_LABEL[s]}</option>`).join("")}
          </select>
        </div>
        <button type="button" class="btn-primary" id="oe-save-btn">${existing ? "Save Opportunity" : "Log Opportunity"}</button>
      </div>
    `;
  }

  function cardHtml(o) {
    const avg = averageScore(o);
    return `
      <div class="card" style="margin-bottom:12px;" data-opp-card="${escapeHtml(o.id)}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
          <h3 style="margin:0; color:var(--color-navy);">${escapeHtml(o.title)}</h3>
          <span class="status-badge ${DECISION_BADGE_CLASS[o.decisionStatus]}">${escapeHtml(DECISION_LABEL[o.decisionStatus])}</span>
        </div>
        ${o.description ? `<p style="margin:8px 0 0; font-size:0.9rem;">${escapeHtml(o.description)}</p>` : ""}
        <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:10px; font-size:0.82rem;">
          ${Object.entries(EVALUATION_CRITERIA)
            .map(([key, label]) => `<span><strong>${o.scores[key] ?? "—"}</strong> ${escapeHtml(label)}</span>`)
            .join("")}
        </div>
        <p style="margin:8px 0 0; font-size:0.85rem;"><strong>Average: ${avg ?? "Not yet scored"}</strong></p>
        ${o.writeUp ? `<p class="hint" style="margin:8px 0 0;">${escapeHtml(o.writeUp)}</p>` : ""}
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button type="button" class="btn-secondary" data-edit-opp="${escapeHtml(o.id)}">Edit</button>
          <button type="button" class="btn-reject" data-delete-opp="${escapeHtml(o.id)}">Delete</button>
        </div>
      </div>
    `;
  }

  function readForm() {
    const title = document.getElementById("oe-title").value;
    const description = document.getElementById("oe-description").value;
    const writeUp = document.getElementById("oe-writeup").value;
    const decisionStatus = document.getElementById("oe-decision").value;
    const scores = {};
    for (const key of Object.keys(EVALUATION_CRITERIA)) {
      scores[key] = document.getElementById(`oe-score-${key}`).value;
    }
    return { client: clientName, title, description, writeUp, decisionStatus, scores };
  }

  function wireForm(existing) {
    document.getElementById("oe-save-btn").addEventListener("click", () => {
      try {
        if (existing) {
          updateOpportunity(applyOpportunityEdit(existing, readForm()));
        } else {
          addOpportunity(createOpportunity(readForm()));
        }
        showingForm = false;
        editingId = null;
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function wireCard(o) {
    const card = container.querySelector(`[data-opp-card="${CSS.escape(o.id)}"]`);
    card.querySelector(`[data-edit-opp="${CSS.escape(o.id)}"]`).addEventListener("click", () => {
      showingForm = true;
      editingId = o.id;
      render();
    });
    card.querySelector(`[data-delete-opp="${CSS.escape(o.id)}"]`).addEventListener("click", () => {
      if (!confirm(`Delete "${o.title}"? This can't be undone.`)) return;
      deleteOpportunity(o.id);
      render();
    });
  }
}
