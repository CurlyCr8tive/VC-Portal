import { formatCurrency } from "../../calculations.js";
import { escapeHtml } from "../../client/utils.js";
import { renderEmptyState } from "../../client/components/EmptyState.js";

/**
 * Owner-only: one card per client with roll-up metrics. Deliberately has no
 * "view as this client" link — the owner dashboard can see ABOUT each
 * client, but there's no shortcut into a client's own login-gated portal
 * here. Logging in as that client is still the only way in, same as it
 * would be with real auth.
 */
export function renderClientsList(container, clients) {
  if (!clients || clients.length === 0) {
    renderEmptyState(container, {
      icon: "🗂️",
      title: "No clients yet",
      message: "New clients you add will show up here.",
    });
    return;
  }

  container.innerHTML = clients
    .map(
      (c) => `
    <div class="card client-list-card">
      <h3>${escapeHtml(c.name)}</h3>
      <div class="client-mini-metrics">
        <div><strong>${formatCurrency(c.metrics.totalAVE)}</strong>AVE</div>
        <div><strong>${c.metrics.totalPlacements}</strong>Placements</div>
        <div><strong>${c.metrics.activeCampaigns}</strong>Campaigns</div>
      </div>
      <p style="font-size:0.82rem; color:var(--text-secondary); margin:0;">
        ${c.campaignNames.length ? escapeHtml(c.campaignNames.join(", ")) : "No active campaigns"}
      </p>
    </div>`
    )
    .join("");
}
