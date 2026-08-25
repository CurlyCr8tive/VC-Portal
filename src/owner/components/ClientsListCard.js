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
 *
 * `onEditInfo(clientName)` is optional — when provided, each card gets an
 * "Edit Info" button for the client's profile (status/engagement
 * type/contact/industry — see src/clientSchema.js). Every client is
 * expected to carry a `profile` object (realDataSource.js's
 * getClientProfile) — "unconfirmed" status is the honest default for one
 * that's never had its info filled in, not a bug.
 *
 * `onAddCampaign(clientName)` is optional — when provided, each card gets
 * an "Add Campaign" button that's expected to open the Campaigns view's Add
 * Campaign form with this client's name already locked in (see
 * src/owner/app.js's state.addCampaignForClient), so a new campaign never
 * has to be typed/matched by hand against this client.
 */
const STATUS_BADGE_CLASS = { active: "published", past: "client-past", unconfirmed: "in-progress" };
const STATUS_LABEL = { active: "Active", past: "Past / Portfolio", unconfirmed: "Status Unconfirmed" };
const ENGAGEMENT_LABEL = { pr: "PR", coaching: "Coaching", pr_and_coaching: "PR + Coaching" };

export function renderClientsList(container, clients, { onInvite, onViewDashboard, onEditInfo, onAddCampaign } = {}) {
  if (!clients || clients.length === 0) {
    renderEmptyState(container, {
      icon: "🗂️",
      title: "No clients yet",
      message: "New clients you add will show up here.",
    });
    return;
  }

  container.innerHTML = clients
    .map((c) => {
      const profile = c.profile || { status: "unconfirmed", engagementType: "pr" };
      return `
    <div class="card client-list-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <h3 style="margin:0;">${escapeHtml(c.name)}</h3>
        <span class="status-badge ${STATUS_BADGE_CLASS[profile.status] || "in-progress"}">${escapeHtml(STATUS_LABEL[profile.status] || "Status Unconfirmed")}</span>
      </div>
      <p style="font-size:0.78rem; color:var(--text-secondary); margin:2px 0 10px;">${escapeHtml(ENGAGEMENT_LABEL[profile.engagementType] || "PR")}${profile.industry ? ` · ${escapeHtml(profile.industry)}` : ""}</p>
      <div class="client-mini-metrics">
        <div><strong>${formatCurrency(c.metrics.totalAVE)}</strong>AVE</div>
        <div><strong>${c.metrics.totalPlacements}</strong>Placements</div>
        <div><strong>${c.metrics.activeCampaigns}</strong>Campaigns</div>
      </div>
      <p style="font-size:0.82rem; color:var(--text-secondary); margin:0;">
        ${c.campaignNames.length ? escapeHtml(c.campaignNames.join(", ")) : "No active campaigns"}
      </p>
      <div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${onViewDashboard ? `<button type="button" class="link-btn" data-view-dashboard="${escapeHtml(c.name)}">View on Dashboard →</button>` : ""}
        ${onEditInfo ? `<button type="button" class="btn-secondary" data-edit-info="${escapeHtml(c.name)}">Edit Info</button>` : ""}
        ${onAddCampaign ? `<button type="button" class="btn-secondary" data-add-campaign="${escapeHtml(c.name)}">Add Campaign</button>` : ""}
      </div>
      ${
        onInvite
          ? `<div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-secondary" data-invite-client="${escapeHtml(c.id)}">Invite Client</button>
        <span data-invite-status="${escapeHtml(c.id)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>`
          : ""
      }
    </div>`;
    })
    .join("");

  if (onViewDashboard) {
    container.querySelectorAll("[data-view-dashboard]").forEach((btn) => {
      btn.addEventListener("click", () => onViewDashboard(btn.dataset.viewDashboard));
    });
  }

  if (onEditInfo) {
    container.querySelectorAll("[data-edit-info]").forEach((btn) => {
      btn.addEventListener("click", () => onEditInfo(btn.dataset.editInfo));
    });
  }

  if (onAddCampaign) {
    container.querySelectorAll("[data-add-campaign]").forEach((btn) => {
      btn.addEventListener("click", () => onAddCampaign(btn.dataset.addCampaign));
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
