import { escapeHtml } from "../utils.js";

const PR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "campaigns", label: "My Campaigns" },
  { id: "placements", label: "Press Placements" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
  { id: "resources", label: "Resources" },
];
const COACHING_NAV_ITEMS = [{ id: "coaching", label: "Coaching Program" }];
const COACHING_VIEW_IDS = new Set(COACHING_NAV_ITEMS.map((item) => item.id));

/**
 * Renders the client-side nav only. No "All Clients", "Team Management",
 * "Add Client", or other owner-only controls exist anywhere in this module —
 * that's a deliberate omission, not an oversight.
 *
 * There is also no "view as a different client" control here. Once a login
 * session exists, which client's data you see is decided by who's logged
 * in, not by a dropdown sitting next to their data — switching accounts
 * means logging out and back in, same as it would with real auth.
 *
 * `engagementType` (from src/clientSchema.js — pr/coaching/pr_and_coaching)
 * decides what's even shown: a pr-only client never sees a Coaching Program
 * link, a coaching-only client never sees the PR nav at all, and only a
 * pr_and_coaching client gets an actual toggle between the two — there's
 * nothing to toggle when a client only has one program. Real dataSource
 * only; mock dataSource has no coaching concept, so it always renders as
 * PR-only regardless of what's passed in (see client/app.js's fallback).
 */
export function renderSidebar(container, opts) {
  const { client, sessionEmail, currentView, demoState, dataSource, engagementType, onNavigate, onDemoStateChange, onDataSourceChange, onLogout, onClose } = opts;

  const showPr = engagementType !== "coaching";
  const showCoaching = engagementType === "coaching" || engagementType === "pr_and_coaching";
  const isToggleable = showPr && showCoaching;
  const isCoachingView = COACHING_VIEW_IDS.has(currentView);
  const navItems = isToggleable ? (isCoachingView ? COACHING_NAV_ITEMS : PR_NAV_ITEMS) : showCoaching ? COACHING_NAV_ITEMS : PR_NAV_ITEMS;

  container.innerHTML = `
    <button class="sidebar-close" aria-label="Close menu">✕ Close</button>
    <div class="sidebar-brand">
      <span class="logo-mark" aria-hidden="true">V</span>
      <span class="brand-name">Verified Consulting</span>
    </div>
    <div class="sidebar-client-name">
      Viewing portal for
      <strong>${escapeHtml(client.name)}</strong>
      ${sessionEmail ? `<div style="font-size:0.72rem; opacity:0.75; margin-top:2px;">Logged in as ${escapeHtml(sessionEmail)}</div>` : ""}
    </div>
    ${
      isToggleable
        ? `<div class="program-toggle" role="tablist" aria-label="Switch program">
      <button type="button" data-nav="dashboard" role="tab" aria-selected="${!isCoachingView}" class="${!isCoachingView ? "active" : ""}">PR Program</button>
      <button type="button" data-nav="coaching" role="tab" aria-selected="${isCoachingView}" class="${isCoachingView ? "active" : ""}">Coaching Program</button>
    </div>`
        : ""
    }
    <nav aria-label="Client portal navigation">
      <ul class="sidebar-nav">
        ${navItems.map(
          (item) => `
          <li>
            <button data-nav="${item.id}" ${currentView === item.id ? 'aria-current="page"' : ""}>
              ${escapeHtml(item.label)}
            </button>
          </li>`
        ).join("")}
      </ul>
    </nav>
    <div class="sidebar-footer">
      <button data-action="logout">Log Out</button>
    </div>
    <div class="demo-controls">
      <label for="data-source-select">Data source</label>
      <select id="data-source-select">
        <option value="real" ${dataSource === "real" ? "selected" : ""}>Real (your actual placements)</option>
        <option value="mock" ${dataSource === "mock" ? "selected" : ""}>Mock (demo preview)</option>
      </select>
      <label for="demo-state-select" style="margin-top:8px;">Demo: data state</label>
      <select id="demo-state-select">
        <option value="normal" ${demoState === "normal" ? "selected" : ""}>Normal</option>
        <option value="loading" ${demoState === "loading" ? "selected" : ""}>Loading</option>
        <option value="empty" ${demoState === "empty" ? "selected" : ""}>Empty (new client)</option>
        <option value="error" ${demoState === "error" ? "selected" : ""}>Error</option>
      </select>
    </div>
  `;

  container.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(btn.dataset.nav));
  });
  container.querySelector('[data-action="logout"]').addEventListener("click", onLogout);
  container.querySelector("#data-source-select").addEventListener("change", (e) => onDataSourceChange(e.target.value));
  container.querySelector("#demo-state-select").addEventListener("change", (e) => onDemoStateChange(e.target.value));
  const closeBtn = container.querySelector(".sidebar-close");
  if (onClose) closeBtn.addEventListener("click", onClose);
}
