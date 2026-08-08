import { escapeHtml } from "../utils.js";
import { renderEmptyState } from "./EmptyState.js";

/**
 * Renders campaign cards. If a campaign object carries a `clientName`
 * (the owner dashboard's aggregate-across-all-clients view flattens
 * campaigns this way), a small client tag is shown above the campaign name.
 * client.html never attaches `clientName`, so this tag never appears there.
 *
 * `progressPercent: null` (real-data mode, where no start-state/current-state
 * tracking exists yet) renders "Progress not yet tracked" instead of a bar —
 * this deliberately does not estimate progress from placement count alone,
 * per the PRD's explicit warning against implying that. Same treatment for
 * a null `startDate`.
 */
export function renderCampaignsGrid(container, campaigns, { onViewCampaign } = {}) {
  if (!campaigns || campaigns.length === 0) {
    renderEmptyState(container, {
      icon: "📁",
      title: "No active campaigns",
      message: "When Verified Consulting kicks off a new campaign for you, it will appear here.",
    });
    return;
  }

  container.innerHTML = campaigns
    .map((c) => {
      const hasProgress = c.progressPercent != null;
      const progressMarkup = hasProgress
        ? `
        <div class="progress-track" role="progressbar" aria-valuenow="${c.progressPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(c.name)} progress estimate">
          <div class="progress-fill" style="width:${c.progressPercent}%"></div>
        </div>
        <div class="progress-label">
          <span>Campaign progress estimate</span>
          <span>${c.progressPercent}%</span>
        </div>`
        : `
        <div class="progress-label" style="margin-top:6px;">
          <span>Progress not yet tracked</span>
        </div>`;

      return `
    <div class="card campaign-card">
      ${c.clientName ? `<span class="campaign-client-tag">${escapeHtml(c.clientName)}</span>` : ""}
      <h3>${escapeHtml(c.name)}</h3>
      ${progressMarkup}
      <div class="campaign-meta">
        <span>Started ${c.startDate ? escapeHtml(c.startDate) : "—"}</span>
        <span>${c.completedPlacements} of ${c.totalPlacements} placements completed</span>
        <span>Avg. lead time: ${c.avgLeadTime != null ? `${c.avgLeadTime} days` : "—"}</span>
        <span>Status: ${escapeHtml(c.status)}</span>
        ${c.milestones && c.milestones.length ? `<span>${c.milestones.filter((m) => m.done).length} of ${c.milestones.length} milestones done</span>` : ""}
      </div>
      <button class="view-btn" data-campaign="${escapeHtml(c.id)}">View campaign details</button>
    </div>`;
    })
    .join("");

  if (onViewCampaign) {
    container.querySelectorAll("[data-campaign]").forEach((btn) => {
      btn.addEventListener("click", () => onViewCampaign(btn.dataset.campaign));
    });
  }
}
