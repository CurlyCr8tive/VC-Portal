import { escapeHtml } from "../../client/utils.js";
import { renderEmptyState } from "../../client/components/EmptyState.js";

const STATUS_LABELS = { active: "Active", paused: "Paused", completed: "Completed" };

/**
 * Manage view for real Campaign records (campaignStorage.js) — separate
 * from CampaignProgressCard's read-only overview grid, which also shows
 * placement-derived campaigns that were never formally created here.
 * Only a real record (has an id from campaignSchema.createCampaign) can
 * have milestones added to it.
 */
export function renderCampaignManageList(container, campaigns, { onEdit, onDelete, onAddMilestone, onToggleMilestone, onRemoveMilestone }) {
  if (!campaigns || campaigns.length === 0) {
    renderEmptyState(container, {
      icon: "🗂️",
      title: "No campaigns created yet",
      message: "Add one above to start tracking its start date, status, and milestones.",
    });
    return;
  }

  container.innerHTML = campaigns
    .map(
      (c) => `
    <div class="card campaign-card" style="margin-bottom:14px;">
      <span class="campaign-client-tag">${escapeHtml(c.client)}</span>
      <h3>${escapeHtml(c.name)}</h3>
      <div class="campaign-meta" style="margin-bottom:10px;">
        <span>Started ${c.startDate ? escapeHtml(c.startDate) : "—"}</span>
        <span>Status: ${escapeHtml(STATUS_LABELS[c.status] || "Active")}</span>
      </div>

      <div class="milestone-list" data-campaign-id="${escapeHtml(c.id)}">
        ${(c.milestones || [])
          .map(
            (m) => `
          <div class="milestone-row">
            <label>
              <input type="checkbox" data-toggle-milestone="${escapeHtml(m.id)}" ${m.done ? "checked" : ""} />
              <span style="${m.done ? "text-decoration:line-through; opacity:0.65;" : ""}">${escapeHtml(m.text)}</span>
            </label>
            <button class="link-btn" style="color:var(--color-coral-dark);" data-remove-milestone="${escapeHtml(m.id)}">Remove</button>
          </div>`
          )
          .join("") || `<p class="hint">No milestones yet.</p>`}
      </div>

      <form class="add-milestone-form" data-campaign-id="${escapeHtml(c.id)}" style="display:flex; gap:8px; margin-top:10px;">
        <input type="text" placeholder="Add a milestone (e.g. Pitch sent to top 5 outlets)" style="flex:1;" required />
        <button type="submit" class="btn-secondary">Add</button>
      </form>

      <div style="display:flex; gap:10px; margin-top:14px;">
        <button class="link-btn" data-edit-campaign="${escapeHtml(c.id)}">Edit Campaign</button>
        <button class="link-btn" style="color:var(--color-coral-dark);" data-delete-campaign="${escapeHtml(c.id)}">Delete Campaign</button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll("[data-toggle-milestone]").forEach((el) => {
    el.addEventListener("change", () => {
      const campaignId = el.closest("[data-campaign-id]").dataset.campaignId;
      onToggleMilestone(campaignId, el.dataset.toggleMilestone);
    });
  });
  container.querySelectorAll("[data-remove-milestone]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const campaignId = btn.closest("[data-campaign-id]").dataset.campaignId;
      onRemoveMilestone(campaignId, btn.dataset.removeMilestone);
    });
  });
  container.querySelectorAll(".add-milestone-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      onAddMilestone(form.dataset.campaignId, input.value);
      input.value = "";
    });
  });
  container.querySelectorAll("[data-edit-campaign]").forEach((btn) => {
    btn.addEventListener("click", () => onEdit(btn.dataset.editCampaign));
  });
  container.querySelectorAll("[data-delete-campaign]").forEach((btn) => {
    btn.addEventListener("click", () => onDelete(btn.dataset.deleteCampaign));
  });
}
