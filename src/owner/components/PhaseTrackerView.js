// src/owner/components/PhaseTrackerView.js
//
// Owner-side management of one coaching client's 6-phase program. Manages
// its own local state via a closure re-render (same pattern as
// OutletRatesView.js) rather than threading through owner/app.js's global
// state — this view's edit-mode/selection state has no reason to survive
// a navigation away and back.

import { escapeHtml } from "../../client/utils.js";
import {
  PROGRAM_TEMPLATE,
  VAAM_PILLARS,
  PHASE_STATUSES,
  HOMEWORK_TYPES,
  HOMEWORK_STATUSES,
  createPhase,
  applyPhaseEdit,
  addHomeworkItem,
  updateHomeworkStatus,
  respondToReflection,
  removeHomeworkItem,
} from "../../coachingPhaseSchema.js";
import { loadPhasesForClient, addPhase, updatePhase } from "../../coachingPhaseStorage.js";
import { logError } from "../../errorLog.js";

const STATUS_LABEL = { not_started: "Not Started", in_progress: "In Progress", complete: "Complete" };
const STATUS_BADGE_CLASS = { not_started: "awaiting-publication", in_progress: "in-progress", complete: "published" };
const HOMEWORK_TYPE_LABEL = { action: "Action Item", reflection: "Reflection Prompt", standing: "Standing Instruction" };

export function renderPhaseTrackerView(container, clientName) {
  let expandedPhaseId = null;
  let editingPhaseId = null;

  render();

  function render() {
    const phases = loadPhasesForClient(clientName);

    if (phases.length === 0) {
      container.innerHTML = `
        <div class="state-panel">
          <div class="state-icon" aria-hidden="true">🗺️</div>
          <h3>No phases loaded yet for ${escapeHtml(clientName)}</h3>
          <p>Start from the standard 6-phase Visibility to Revenue template — weeks and VAAM tags match every engagement; goal and homework are left blank for you to fill in per client.</p>
          <button type="button" class="btn-primary" id="pt-load-template" style="margin-top:10px;">Load Standard 6-Phase Template</button>
        </div>
      `;
      container.querySelector("#pt-load-template").addEventListener("click", () => {
        for (const p of PROGRAM_TEMPLATE) {
          addPhase(
            createPhase({
              client: clientName,
              phaseNumber: p.phaseNumber,
              name: p.name,
              weeks: p.weeks,
              vaam: p.vaam,
              deliverables: p.defaultDeliverables,
            })
          );
        }
        render();
      });
      return;
    }

    container.innerHTML = phases.map((phase) => phaseCardHtml(phase)).join("");

    phases.forEach((phase) => wirePhaseCard(phase));
  }

  function phaseCardHtml(phase) {
    const isExpanded = expandedPhaseId === phase.id;
    const isEditing = editingPhaseId === phase.id;
    const homework = phase.homework || [];

    return `
      <div class="card" style="margin-bottom:12px;" data-phase-card="${escapeHtml(phase.id)}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
          <div>
            <p style="margin:0; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Phase ${phase.phaseNumber} · Weeks ${escapeHtml(phase.weeks)} · ${escapeHtml(VAAM_PILLARS[phase.vaam] || phase.vaam)}</p>
            <h3 style="margin:2px 0 0; color:var(--color-navy);">${escapeHtml(phase.name)}</h3>
          </div>
          <span class="status-badge ${STATUS_BADGE_CLASS[phase.status]}">${escapeHtml(STATUS_LABEL[phase.status])}</span>
        </div>

        ${phase.goal ? `<p style="margin:10px 0 0; font-size:0.9rem;">${escapeHtml(phase.goal)}</p>` : `<p class="hint" style="margin:10px 0 0;">No goal set yet for this client.</p>`}

        ${
          phase.deliverables.length
            ? `<p style="margin:10px 0 4px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Deliverables</p>
               <ul style="margin:0 0 6px; padding-left:18px; font-size:0.85rem;">${phase.deliverables.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
            : ""
        }
        ${phase.notes ? `<p class="hint" style="margin:8px 0 0;">${escapeHtml(phase.notes)}</p>` : ""}

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button type="button" class="btn-secondary" data-toggle-expand="${escapeHtml(phase.id)}">${isExpanded ? "Hide Homework" : `Homework (${homework.length})`}</button>
          <button type="button" class="btn-secondary" data-toggle-edit="${escapeHtml(phase.id)}">${isEditing ? "Cancel Edit" : "Edit Phase"}</button>
          <select data-status-select="${escapeHtml(phase.id)}" style="font-size:0.82rem;">
            ${PHASE_STATUSES.map((s) => `<option value="${s}" ${phase.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
          </select>
        </div>

        ${isEditing ? editFormHtml(phase) : ""}
        ${isExpanded ? homeworkSectionHtml(phase) : ""}
      </div>
    `;
  }

  function editFormHtml(phase) {
    return `
      <div class="entry-form" style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-light);" data-edit-form="${escapeHtml(phase.id)}">
        <div class="field-row">
          <label>Goal</label>
          <textarea data-field="goal" rows="2" placeholder="What this phase is meant to achieve for this specific client">${escapeHtml(phase.goal)}</textarea>
        </div>
        <div class="field-row">
          <label>Deliverables (one per line)</label>
          <textarea data-field="deliverables" rows="3">${escapeHtml(phase.deliverables.join("\n"))}</textarea>
        </div>
        <div class="field-row">
          <label>Notes</label>
          <textarea data-field="notes" rows="2" placeholder="Owner-only context">${escapeHtml(phase.notes)}</textarea>
        </div>
        <button type="button" class="btn-primary" data-save-edit="${escapeHtml(phase.id)}">Save Phase</button>
      </div>
    `;
  }

  function homeworkSectionHtml(phase) {
    const homework = phase.homework || [];
    return `
      <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border-light);">
        ${
          homework.length === 0
            ? `<p class="hint" style="margin:0 0 10px;">No homework items yet.</p>`
            : `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
          ${homework.map((h) => homeworkItemHtml(phase.id, h)).join("")}
        </div>`
        }
        <div class="entry-form" data-add-homework-form="${escapeHtml(phase.id)}">
          <div class="field-row two-col">
            <div>
              <label>Type</label>
              <select data-hw-type>
                ${HOMEWORK_TYPES.map((t) => `<option value="${t}">${HOMEWORK_TYPE_LABEL[t]}</option>`).join("")}
              </select>
            </div>
            <div>
              <label>Due Date (blank if standing)</label>
              <input type="date" data-hw-due />
            </div>
          </div>
          <div class="field-row">
            <label>Text</label>
            <textarea data-hw-text rows="2" placeholder="e.g. 'Which of these positioning angles feels most like you, and why?'"></textarea>
          </div>
          <button type="button" class="btn-secondary" data-add-homework="${escapeHtml(phase.id)}">Add Homework Item</button>
        </div>
      </div>
    `;
  }

  function homeworkItemHtml(phaseId, h) {
    return `
      <div class="review-queue-item" data-homework-item="${escapeHtml(h.id)}">
        <div class="rq-info">
          <p class="rq-headline">${escapeHtml(HOMEWORK_TYPE_LABEL[h.type])}${h.dueDate ? ` · due ${escapeHtml(h.dueDate)}` : ""}</p>
          <p class="rq-meta">${escapeHtml(h.text)}</p>
          ${h.response ? `<p class="rq-meta" style="font-style:italic; margin-top:4px;">Response: "${escapeHtml(h.response)}"</p>` : ""}
        </div>
        <div class="review-queue-actions" style="align-items:center;">
          <select data-hw-status="${escapeHtml(h.id)}" data-phase-id="${escapeHtml(phaseId)}" style="font-size:0.78rem;">
            ${HOMEWORK_STATUSES.map((s) => `<option value="${s}" ${h.status === s ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
          </select>
          <button class="btn-reject" data-remove-homework="${escapeHtml(h.id)}" data-phase-id="${escapeHtml(phaseId)}">Remove</button>
        </div>
      </div>
    `;
  }

  function wirePhaseCard(phase) {
    const card = container.querySelector(`[data-phase-card="${CSS.escape(phase.id)}"]`);
    if (!card) return;

    card.querySelector(`[data-toggle-expand="${CSS.escape(phase.id)}"]`).addEventListener("click", () => {
      expandedPhaseId = expandedPhaseId === phase.id ? null : phase.id;
      render();
    });
    card.querySelector(`[data-toggle-edit="${CSS.escape(phase.id)}"]`).addEventListener("click", () => {
      editingPhaseId = editingPhaseId === phase.id ? null : phase.id;
      render();
    });
    card.querySelector(`[data-status-select="${CSS.escape(phase.id)}"]`).addEventListener("change", (e) => {
      try {
        updatePhase(applyPhaseEdit(phase, { ...phase, status: e.target.value }));
        render();
      } catch (err) {
        logError({ source: "Coaching phase status update", message: err.message });
        alert(err.message);
      }
    });

    const saveBtn = card.querySelector(`[data-save-edit="${CSS.escape(phase.id)}"]`);
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const form = card.querySelector(`[data-edit-form="${CSS.escape(phase.id)}"]`);
        try {
          updatePhase(
            applyPhaseEdit(phase, {
              ...phase,
              goal: form.querySelector('[data-field="goal"]').value,
              deliverables: form.querySelector('[data-field="deliverables"]').value,
              notes: form.querySelector('[data-field="notes"]').value,
            })
          );
          editingPhaseId = null;
          render();
        } catch (err) {
          logError({ source: "Coaching phase edit", message: err.message });
          alert(err.message);
        }
      });
    }

    const addHwBtn = card.querySelector(`[data-add-homework="${CSS.escape(phase.id)}"]`);
    if (addHwBtn) {
      addHwBtn.addEventListener("click", () => {
        const form = card.querySelector(`[data-add-homework-form="${CSS.escape(phase.id)}"]`);
        try {
          const updated = addHomeworkItem(phase, {
            type: form.querySelector("[data-hw-type]").value,
            text: form.querySelector("[data-hw-text]").value,
            dueDate: form.querySelector("[data-hw-due]").value,
          });
          updatePhase(updated);
          render();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    card.querySelectorAll("[data-hw-status]").forEach((select) => {
      select.addEventListener("change", () => {
        const homeworkId = select.dataset.hwStatus;
        try {
          updatePhase(updateHomeworkStatus(phase, homeworkId, select.value));
          render();
        } catch (err) {
          alert(err.message);
        }
      });
    });

    card.querySelectorAll("[data-remove-homework]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Remove this homework item?")) return;
        updatePhase(removeHomeworkItem(phase, btn.dataset.removeHomework));
        render();
      });
    });
  }
}
