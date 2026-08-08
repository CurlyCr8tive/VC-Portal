import { escapeHtml } from "../utils.js";
import { renderPlacementsTable } from "./PressPlacementTable.js";

/**
 * Shared campaign detail screen — "click into a client's campaign: same
 * placements/AVE/progress/notes view, scoped to that client" per the PRD's
 * Navigation Hierarchy. Used by both dashboards; `showClient` controls
 * whether the client tag/column appears (owner: yes, client: no, since a
 * client is always looking at their own campaign already).
 */
export function renderCampaignDetail(container, { campaign, placements, notes, currentUser, onAddNote, onBack, showClient = false }) {
  const milestones = campaign.milestones || [];

  container.innerHTML = `
    <button class="link-btn" id="campaign-detail-back" style="margin-bottom:10px;">&larr; Back to Campaigns</button>
    <div class="card" style="margin-bottom:20px;">
      ${showClient ? `<span class="campaign-client-tag">${escapeHtml(campaign.clientName || campaign.client || "")}</span>` : ""}
      <h2 style="color:var(--color-navy); margin:4px 0 8px;">${escapeHtml(campaign.name)}</h2>
      <div class="campaign-meta">
        <span>Started ${campaign.startDate ? escapeHtml(campaign.startDate) : "—"}</span>
        <span>Status: ${escapeHtml(campaign.status || "Not yet tracked")}</span>
        <span>${campaign.completedPlacements ?? 0} of ${campaign.totalPlacements ?? 0} placements completed</span>
      </div>
      ${
        milestones.length
          ? `<div style="margin-top:14px;">
               <p style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin:0 0 8px;">Milestones</p>
               ${milestones
                 .map(
                   (m) => `<div class="milestone-row"><span style="${m.done ? "text-decoration:line-through; opacity:0.65;" : ""}">${m.done ? "✅" : "⬜"} ${escapeHtml(m.text)}</span></div>`
                 )
                 .join("")}
             </div>`
          : ""
      }
    </div>

    <div class="section-heading"><h2>Placements</h2></div>
    <div class="card" id="campaign-detail-placements" style="margin-bottom:24px;"></div>

    <div class="section-heading"><h2>Notes</h2></div>
    <div class="card">
      <div id="campaign-detail-notes" style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
        ${
          notes.length === 0
            ? `<p class="hint" style="margin:0;">No notes yet on this campaign.</p>`
            : notes
                .map(
                  (n) => `
              <div style="border-left:2px solid var(--color-teal); padding-left:10px;">
                <p style="margin:0; font-size:0.85rem; font-weight:600;">${escapeHtml(n.authorName)} <span style="font-weight:400; color:var(--text-secondary);">(${escapeHtml(n.authorRole)}) · ${escapeHtml(n.createdAt.slice(0, 10))}</span></p>
                <p style="margin:2px 0 0; font-size:0.9rem;">${escapeHtml(n.body)}</p>
              </div>`
                )
                .join("")
        }
      </div>
      <form class="entry-form" id="campaign-note-form">
        <div class="field-row">
          <label for="campaign-note-body">Add a note</label>
          <textarea id="campaign-note-body" rows="2" placeholder="Ask a question or leave an update on this campaign…" required></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Post Note</button>
        </div>
      </form>
    </div>
  `;

  renderPlacementsTable(document.getElementById("campaign-detail-placements"), placements, { showClient });

  container.querySelector("#campaign-detail-back").addEventListener("click", onBack);

  const form = container.querySelector("#campaign-note-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const textarea = document.getElementById("campaign-note-body");
    onAddNote(textarea.value, currentUser);
  });
}
