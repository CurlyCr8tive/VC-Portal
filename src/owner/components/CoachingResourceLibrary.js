// src/owner/components/CoachingResourceLibrary.js
//
// The "know-how" resource library and the missing-assets checklist,
// combined — see coachingResourceSchema.js for why one schema covers both.

import { escapeHtml } from "../../client/utils.js";
import { RESOURCE_KINDS, PRIORITY_LEVELS, createResource, applyResourceEdit, toggleResourceComplete } from "../../coachingResourceSchema.js";
import { loadResourcesForClient, addResource, updateResource, deleteResource } from "../../coachingResourceStorage.js";

const KIND_LABEL = { resource: "Resource", checklist: "Checklist Item" };
const PRIORITY_BADGE_CLASS = { high: "client-past", medium: "in-progress", low: "published" };
// Priority isn't a status — reusing status-badge's color shape but with
// high=urgent-looking (reuses the muted "past" tone as attention-grabbing
// without introducing a 4th badge color), medium=amber, low=teal (calm).

export function renderCoachingResourceLibrary(container, clientName) {
  let showingForm = false;
  let editingId = null;

  render();

  function render() {
    const items = loadResourcesForClient(clientName);
    const checklistItems = items.filter((i) => i.kind === "checklist");
    const resourceItems = items.filter((i) => i.kind === "resource");

    container.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
        <button type="button" class="btn-primary" id="crl-new-btn">${showingForm && !editingId ? "Cancel" : "+ New Item"}</button>
      </div>
      ${showingForm ? formHtml(editingId ? items.find((i) => i.id === editingId) : null) : ""}

      <p style="margin:0 0 8px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Missing Assets Checklist</p>
      ${
        checklistItems.length === 0
          ? `<p class="hint" style="margin:0 0 16px;">Nothing on the checklist yet.</p>`
          : `<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">${checklistItems.map(itemHtml).join("")}</div>`
      }

      <p style="margin:0 0 8px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Resource Library</p>
      ${
        resourceItems.length === 0
          ? `<p class="hint" style="margin:0;">No resources added yet.</p>`
          : `<div style="display:flex; flex-direction:column; gap:6px;">${resourceItems.map(itemHtml).join("")}</div>`
      }
    `;

    container.querySelector("#crl-new-btn").addEventListener("click", () => {
      showingForm = showingForm && !editingId ? false : true;
      editingId = null;
      render();
    });

    if (showingForm) wireForm(editingId ? items.find((i) => i.id === editingId) : null);
    items.forEach((i) => wireItem(i));
  }

  function formHtml(existing) {
    return `
      <div class="entry-form card" style="margin-bottom:16px;" id="crl-form">
        <div class="field-row two-col">
          <div>
            <label>Type</label>
            <select id="crl-kind">
              ${RESOURCE_KINDS.map((k) => `<option value="${k}" ${(existing?.kind || "checklist") === k ? "selected" : ""}>${KIND_LABEL[k]}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Priority</label>
            <select id="crl-priority">
              ${PRIORITY_LEVELS.map((p) => `<option value="${p}" ${(existing?.priority || "medium") === p ? "selected" : ""}>${p[0].toUpperCase()}${p.slice(1)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-row">
          <label>Title *</label>
          <input type="text" id="crl-title" placeholder="e.g. Updated headshots" value="${existing ? escapeHtml(existing.title) : ""}" required />
        </div>
        <div class="field-row">
          <label>Content / Notes</label>
          <textarea id="crl-content" rows="2" placeholder="Detail, link, or guidance">${existing ? escapeHtml(existing.content) : ""}</textarea>
        </div>
        <button type="button" class="btn-primary" id="crl-save-btn">${existing ? "Save Item" : "Add Item"}</button>
      </div>
    `;
  }

  function itemHtml(item) {
    return `
      <div class="review-queue-item" data-item="${escapeHtml(item.id)}">
        <div class="rq-info">
          <p class="rq-headline">
            ${item.kind === "checklist" ? `<input type="checkbox" data-toggle-complete="${escapeHtml(item.id)}" ${item.completed ? "checked" : ""} style="margin-right:6px;" />` : ""}
            ${escapeHtml(item.title)}
            <span class="status-badge ${PRIORITY_BADGE_CLASS[item.priority]}" style="margin-left:8px; font-size:0.65rem;">${item.priority} priority</span>
          </p>
          ${item.content ? `<p class="rq-meta">${escapeHtml(item.content)}</p>` : ""}
        </div>
        <div class="review-queue-actions">
          <button class="btn-secondary" data-edit-item="${escapeHtml(item.id)}">Edit</button>
          <button class="btn-reject" data-delete-item="${escapeHtml(item.id)}">Delete</button>
        </div>
      </div>
    `;
  }

  function wireForm(existing) {
    document.getElementById("crl-save-btn").addEventListener("click", () => {
      const raw = {
        client: clientName,
        kind: document.getElementById("crl-kind").value,
        priority: document.getElementById("crl-priority").value,
        title: document.getElementById("crl-title").value,
        content: document.getElementById("crl-content").value,
        completed: existing?.completed || false,
      };
      try {
        if (existing) updateResource(applyResourceEdit(existing, raw));
        else addResource(createResource(raw));
        showingForm = false;
        editingId = null;
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function wireItem(item) {
    const row = container.querySelector(`[data-item="${CSS.escape(item.id)}"]`);
    if (!row) return;
    const checkbox = row.querySelector(`[data-toggle-complete="${CSS.escape(item.id)}"]`);
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        updateResource(toggleResourceComplete(item));
        render();
      });
    }
    row.querySelector(`[data-edit-item="${CSS.escape(item.id)}"]`).addEventListener("click", () => {
      showingForm = true;
      editingId = item.id;
      render();
    });
    row.querySelector(`[data-delete-item="${CSS.escape(item.id)}"]`).addEventListener("click", () => {
      if (!confirm(`Delete "${item.title}"?`)) return;
      deleteResource(item.id);
      render();
    });
  }
}
