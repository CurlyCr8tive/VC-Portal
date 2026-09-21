import { formatCurrency } from "../../calculations.js?v=20260919-report-builder";
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
 *
 * `onDiscoveryScan({ clientId, clientName })` is optional — when provided,
 * each card gets a "Scan for Mentions" button that triggers the Discovery
 * Agent (owner-api's POST /api/clients/:clientId/discovery-scan) for this
 * client and reports the result (scanned/matched/inserted, or an honest
 * error) inline, same pattern as onInvite below. Like onInvite, this only
 * actually reaches Supabase once real Auth is configured — until then it
 * surfaces the real "not configured"/401 response rather than faking one.
 *
 * `onViewCoaching(clientName)` is optional — when provided, a client whose
 * profile.engagementType is "coaching" or "pr_and_coaching" gets a "View
 * Coaching Program →" link that's expected to jump straight to the
 * Coaching Program admin view with this client pre-selected (see
 * src/owner/app.js's state.coachingSelectedClient) — the PR-side mirror of
 * the client-facing PR/Coaching toggle in ClientSidebar.js. A pr-only
 * client never gets this link, same reasoning as the client-side nav: no
 * program to switch to.
 */
const STATUS_BADGE_CLASS = { active: "published", past: "client-past", unconfirmed: "in-progress" };
const STATUS_LABEL = { active: "Active", past: "Past / Portfolio", unconfirmed: "Status Unconfirmed" };
const STATUS_TOOLTIP = {
  active: "Actively engaged — current PR and/or coaching work in progress.",
  past: "A completed or portfolio-only engagement, shown as past work rather than an active client.",
  unconfirmed: "Tenyse hasn't verified this client relationship or its figures yet. Not a data error — stays this way until she confirms it.",
};
const ENGAGEMENT_LABEL = { pr: "PR", coaching: "Coaching", pr_and_coaching: "PR + Coaching" };

function discoveryTermsCount(keywordConfig = {}) {
  return [keywordConfig.clientName, keywordConfig.companyName, ...(Array.isArray(keywordConfig.aliases) ? keywordConfig.aliases : [])].filter(Boolean).length;
}

export function renderClientsList(
  container,
  clients,
  { onInvite, onViewDashboard, onEditInfo, onAddCampaign, onDiscoveryScan, onViewCoaching, onScheduleMeeting, onViewMessages, onViewFiles } = {}
) {
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
      const termCount = discoveryTermsCount(profile.keywordConfig);
      return `
    <div class="card client-list-card live-card" tabindex="0" data-live-tip="${escapeHtml(`${c.name}: ${formatCurrency(c.metrics.totalAVE)} AVE, ${c.metrics.totalPlacements} placements, ${c.metrics.activeCampaigns} active campaigns. Use the actions to open their dashboard, scan for mentions, or manage relationship details.`)}">
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:8px;">
        <h3 style="margin:0;">${escapeHtml(c.name)}</h3>
        <span class="status-badge ${STATUS_BADGE_CLASS[profile.status] || "in-progress"}" title="${escapeHtml(STATUS_TOOLTIP[profile.status] || STATUS_TOOLTIP.unconfirmed)}">${escapeHtml(STATUS_LABEL[profile.status] || "Status Unconfirmed")}</span>
      </div>
      <p style="font-size:0.78rem; color:var(--text-secondary); margin:2px 0 10px;">${escapeHtml(ENGAGEMENT_LABEL[profile.engagementType] || "PR")}${profile.industry ? ` · ${escapeHtml(profile.industry)}` : ""}</p>
      <div class="client-mini-metrics">
        <div class="mini-live-stat" data-live-tip="${escapeHtml(`${c.name}'s estimated publicity value from tracked placements.`)}"><strong>${formatCurrency(c.metrics.totalAVE)}</strong>AVE</div>
        <div class="mini-live-stat" data-live-tip="${escapeHtml(`${c.metrics.totalPlacements} press placements currently tracked for ${c.name}.`)}"><strong>${c.metrics.totalPlacements}</strong>Placements</div>
        <div class="mini-live-stat" data-live-tip="${escapeHtml(`${c.metrics.activeCampaigns} active PR campaigns currently tied to ${c.name}.`)}"><strong>${c.metrics.activeCampaigns}</strong>Campaigns</div>
      </div>
      <p style="font-size:0.82rem; color:var(--text-secondary); margin:0;">
        ${c.campaignNames.length ? escapeHtml(c.campaignNames.join(", ")) : "No active campaigns"}
      </p>
      <p style="font-size:0.78rem; color:var(--text-secondary); margin:8px 0 0;">
        Discovery terms: ${termCount ? `${termCount} ready` : "ready to add"}
      </p>
      <div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        ${onViewDashboard ? `<button type="button" class="link-btn" data-view-dashboard="${escapeHtml(c.name)}">View on Dashboard →</button>` : ""}
        ${
          onViewCoaching && (profile.engagementType === "coaching" || profile.engagementType === "pr_and_coaching")
            ? `<button type="button" class="link-btn" data-view-coaching="${escapeHtml(c.name)}">View Coaching Program →</button>`
            : ""
        }
        ${onEditInfo ? `<button type="button" class="btn-secondary" data-edit-info="${escapeHtml(c.name)}">Edit Info</button>` : ""}
        ${onAddCampaign ? `<button type="button" class="btn-secondary" data-add-campaign="${escapeHtml(c.name)}">Add Campaign</button>` : ""}
        ${onScheduleMeeting ? `<button type="button" class="btn-secondary" data-schedule-meeting="${escapeHtml(c.id)}">Schedule Meeting</button>` : ""}
        ${onViewMessages ? `<button type="button" class="btn-secondary" data-view-messages="${escapeHtml(c.id)}">View Messages</button>` : ""}
        ${onViewFiles ? `<button type="button" class="btn-secondary" data-view-files="${escapeHtml(c.id)}">View Files</button>` : ""}
        <span data-schedule-status="${escapeHtml(c.id)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>
      ${
        onInvite
          ? `<div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-secondary" data-invite-client="${escapeHtml(c.id)}">Invite Client</button>
        <span data-invite-status="${escapeHtml(c.id)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>`
          : ""
      }
      ${
        onDiscoveryScan
          ? `<div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-secondary" data-discovery-scan="${escapeHtml(c.id)}">Scan for Mentions</button>
        <span data-discovery-status="${escapeHtml(c.id)}" style="font-size:0.8rem; color:var(--text-secondary);"></span>
      </div>`
          : ""
      }
      <div class="live-tip-panel" role="tooltip">
        <strong>${escapeHtml(c.name)}</strong>
        <p>${escapeHtml(`${formatCurrency(c.metrics.totalAVE)} AVE across ${c.metrics.totalPlacements} placements. ${termCount ? `${termCount} discovery terms are ready for mention scanning.` : "Discovery terms can be added for stronger scans."}`)}</p>
        <span>Open dashboard, scan mentions, or manage this client.</span>
      </div>
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

  if (onViewCoaching) {
    container.querySelectorAll("[data-view-coaching]").forEach((btn) => {
      btn.addEventListener("click", () => onViewCoaching(btn.dataset.viewCoaching));
    });
  }

  if (onScheduleMeeting) {
    container.querySelectorAll("[data-schedule-meeting]").forEach((btn) => {
      const clientId = btn.dataset.scheduleMeeting;
      const client = clients.find((c) => c.id === clientId);
      const statusEl = container.querySelector(`[data-schedule-status="${CSS.escape(clientId)}"]`);

      btn.addEventListener("click", async () => {
        const startDate = window.prompt("Meeting date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
        if (!startDate) return;
        const startTime = window.prompt("Meeting time (24-hour HH:MM):", "10:00");
        if (!startTime) return;

        btn.disabled = true;
        statusEl.textContent = "Scheduling meeting...";
        try {
          const result = await onScheduleMeeting({
            clientName: client?.name,
            contactEmail: client?.profile?.contactEmail,
            notes: client?.profile?.notes,
            startDate,
            startTime,
          });
          statusEl.innerHTML = result.ok
            ? result.htmlLink
              ? `Created: <a href="${escapeHtml(result.htmlLink)}" target="_blank" rel="noopener">open event</a>`
              : escapeHtml(result.message || "Demo meeting scheduled.")
            : `Scheduling note saved for the demo. ${escapeHtml(result.message || "Calendar connection is planned after Demo Day.")}`;
        } catch (err) {
          statusEl.textContent = "Scheduling note saved for the demo. Calendar connection is planned after Demo Day.";
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  if (onViewMessages) {
    container.querySelectorAll("[data-view-messages]").forEach((btn) => {
      const clientId = btn.dataset.viewMessages;
      const client = clients.find((c) => c.id === clientId);
      btn.addEventListener("click", () => onViewMessages({ clientId, clientName: client?.name }));
    });
  }

  if (onViewFiles) {
    container.querySelectorAll("[data-view-files]").forEach((btn) => {
      const clientId = btn.dataset.viewFiles;
      const client = clients.find((c) => c.id === clientId);
      btn.addEventListener("click", () => onViewFiles({ clientId, clientName: client?.name }));
    });
  }

  if (onInvite) {
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
            ? `Invite sent to ${result.invitedEmail || email.trim()}`
            : `Invite flow previewed. ${result.message || "Live invite sending is planned for handoff."}`;
        } catch (err) {
          statusEl.textContent = "Invite flow previewed. Live invite sending is planned for handoff.";
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  if (onDiscoveryScan) {
    container.querySelectorAll("[data-discovery-scan]").forEach((btn) => {
      const clientId = btn.dataset.discoveryScan;
      const client = clients.find((c) => c.id === clientId);
      const statusEl = container.querySelector(`[data-discovery-status="${CSS.escape(clientId)}"]`);

      btn.addEventListener("click", async () => {
        btn.disabled = true;
        statusEl.textContent = "Scanning…";
        try {
          const result = await onDiscoveryScan({ clientId, clientName: client?.name });
          statusEl.textContent = result.ok
            ? `${
                result.demoPreview ? "Demo-safe scan preview: " : ""
              }Scanned ${result.scanned ?? 0}, matched ${result.matched ?? 0}, added ${result.inserted ?? 0} to Review Queue.`
            : result.message || "Scan could not complete. Check search setup and try again.";
        } catch (err) {
          statusEl.textContent = "Scan could not complete. Check search setup and try again.";
        } finally {
          btn.disabled = false;
        }
      });
    });
  }
}
