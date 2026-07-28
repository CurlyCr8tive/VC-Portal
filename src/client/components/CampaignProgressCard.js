import { escapeHtml } from "../utils.js";
import { renderEmptyState } from "./EmptyState.js";

/**
 * Renders campaign cards. If a campaign object carries a `clientName`
 * (the owner dashboard's aggregate-across-all-clients view flattens
 * campaigns this way), a small client tag is shown above the campaign name.
 * client.html never attaches `clientName`, so this tag never appears there.
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
    .map(
      (c) => `
    <div class="card campaign-card">
      ${c.clientName ? `<span class="campaign-client-tag">${escapeHtml(c.clientName)}</span>` : ""}
      <h3>${escapeHtml(c.name)}</h3>
      <div class="progress-track" role="progressbar" aria-valuenow="${c.progressPercent}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(c.name)} progress estimate">
        <div class="progress-fill" style="width:${c.progressPercent}%"></div>
      </div>
      <div class="progress-label">
        <span>Campaign progress estimate</span>
        <span>${c.progressPercent}%</span>
      </div>
      <div class="campaign-meta">
        <span>Started ${escapeHtml(c.startDate)}</span>
        <span>${c.completedPlacements} of ${c.totalPlacements} placements completed</span>
        <span>Avg. lead time: ${c.avgLeadTime} days</span>
        <span>Status: ${escapeHtml(c.status)}</span>
      </div>
      <button class="view-btn" data-campaign="${escapeHtml(c.id)}">View campaign details</button>
    </div>`
    )
    .join("");

  if (onViewCampaign) {
    container.querySelectorAll("[data-campaign]").forEach((btn) => {
      btn.addEventListener("click", () => onViewCampaign(btn.dataset.campaign));
    });
  }
}
