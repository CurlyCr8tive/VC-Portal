import { formatCurrency } from "../../calculations.js";
import { escapeHtml } from "../../client/utils.js";
import { renderEmptyState } from "../../client/components/EmptyState.js";

/**
 * Owner-only: one card per client with roll-up metrics. Deliberately has no
 * "view as this client" link — the owner dashboard can see ABOUT each
 * client, but there's no shortcut into a client's own login-gated portal
 * here. Logging in as that client is still the only way in, same as it
 * would be with real auth.
 *
 * `onInvite` is optional — when provided, each card gets an "Invite Client"
 * button that prompts for an email and calls onInvite({ clientId,
 * clientName, email }), expected to resolve to { ok, message?, invitedEmail? }.
 * Omitting onInvite (e.g. mock data mode) just hides the button rather than
 * wiring it to something that can't work yet.
 *
 * `onViewDashboard(clientName)` is optional — when provided, each card gets
 * a "View on Dashboard →" link that's expected to filter the owner
 * Dashboard view down to just this client (see src/owner/app.js's
 * dashboardClientFilter).
 */
export function renderClientsList(container, clients, { onInvite, onViewDashboard } = {}) {
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
      ${onViewDashboard ? `<button type="button" class="link-btn" data-view-dashboard="${escapeHtml(c.name)}" style="margin-top:8px;">View on Dashboard →</button>` : ""}
      ${
        onInvite
          ? `<div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-secondary" data-invite-client="${escapeHtml(c.id)}">Invite Client</button>
        <span data-invite-status="${escapeHtml(c.id)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>`
          : ""
      }
    </div>`
    )
    .join("");

  if (onViewDashboard) {
    container.querySelectorAll("[data-view-dashboard]").forEach((btn) => {
      btn.addEventListener("click", () => onViewDashboard(btn.dataset.viewDashboard));
    });
  }

  if (!onInvite) return;

  container.querySelectorAll("[data-invite-client]").forEach((btn) => {
    const clientId = btn.dataset.inviteClient;
    const client = clients.find((c) => c.id === clientId);
    const statusEl = container.querySelector(`[data-invite-status="${CSS.escape(clientId)}"]`);

    btn.addEventListener("click", async () => {
      const email = window.prompt(`Email address to send ${client?.name || "this client"}'s invite to:`);
      if (!email || !email.trim()) return;

      btn.disabled = true;
      statusEl.textContent = "Sending invite…";
      try {
        const result = await onInvite({ clientId, clientName: client?.name, email: email.trim() });
        statusEl.textContent = result.ok
          ? `✓ Invite sent to ${result.invitedEmail || email.trim()}`
          : `⚠ ${result.message || "Invite failed."}`;
      } catch (err) {
        statusEl.textContent = `⚠ ${err.message || "Invite failed."}`;
      } finally {
        btn.disabled = false;
      }
    });
  });
}
