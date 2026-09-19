import { escapeHtml } from "../utils.js";

const PR_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "campaigns", label: "My Campaigns", icon: "▣" },
  { id: "placements", label: "Press Placements", icon: "▤" },
  { id: "reports", label: "Reports & Results", icon: "▥" },
  { id: "analytics", label: "Analytics", icon: "⌘" },
  { id: "resources", label: "Resources", icon: "□" },
];
const COACHING_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "coaching", label: "My Programs", icon: "▣", caret: true },
  { id: "resources", label: "Resources", icon: "▤" },
  { id: "opportunities", label: "Opportunities", icon: "◎" },
  { id: "reports", label: "Reports & Results", icon: "▥" },
  { id: "messages", label: "Messages", icon: "✉" },
  { id: "files", label: "Files", icon: "▱" },
];
const COACHING_VIEW_IDS = new Set(COACHING_NAV_ITEMS.map((item) => item.id));
const NAV_PARENT_BY_VIEW = {
  "campaign-detail": "campaigns",
};

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
  const {
    client,
    sessionEmail,
    currentView,
    demoState,
    dataSource,
    engagementType,
    programView,
    showDevControls = false,
    onNavigate,
    onDemoStateChange,
    onDataSourceChange,
    onLogout,
    onClose,
  } = opts;

  const showPr = engagementType !== "coaching";
  const showCoaching = engagementType === "coaching" || engagementType === "pr_and_coaching";
  const isToggleable = showPr && showCoaching;
  const isCoachingView = COACHING_VIEW_IDS.has(currentView) || programView === "coaching";
  const navItems = isToggleable ? (isCoachingView ? COACHING_NAV_ITEMS : PR_NAV_ITEMS) : showCoaching ? COACHING_NAV_ITEMS : PR_NAV_ITEMS;
  const activeView = NAV_PARENT_BY_VIEW[currentView] || currentView;

  container.innerHTML = `
    <button class="sidebar-close" aria-label="Close menu">✕ Close</button>
    <div class="sidebar-brand">
      <span class="logo-mark" aria-hidden="true">${escapeHtml(client.avatarInitials || "V")}</span>
      <span class="brand-name">Verified Consulting</span>
    </div>
    <div class="sidebar-client-name">
      Client portal
      <strong>${escapeHtml(client.name)}</strong>
      ${sessionEmail ? `<div style="font-size:0.72rem; opacity:0.75; margin-top:2px;">Logged in as ${escapeHtml(sessionEmail)}</div>` : ""}
    </div>
    <nav aria-label="Client portal navigation">
      <ul class="sidebar-nav">
        ${navItems.map(
          (item) => `
          <li>
            <button data-nav="${item.id}" ${activeView === item.id ? 'aria-current="page"' : ""}>
              <span class="nav-icon" aria-hidden="true">${escapeHtml(item.icon || "•")}</span>
              <span>${escapeHtml(item.label)}</span>
              ${item.caret ? `<span class="nav-badge nav-caret" aria-hidden="true">⌄</span>` : ""}
            </button>
          </li>`
        ).join("")}
      </ul>
    </nav>
    <div class="sidebar-footer">
      <button data-action="logout">Log Out</button>
    </div>
    ${
      showDevControls
        ? `<div class="demo-controls">
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
          </div>`
        : ""
    }
  `;

  container.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(btn.dataset.nav));
  });
  container.querySelector('[data-action="logout"]').addEventListener("click", onLogout);
  container.querySelector("#data-source-select")?.addEventListener("change", (e) => onDataSourceChange(e.target.value));
  container.querySelector("#demo-state-select")?.addEventListener("change", (e) => onDemoStateChange(e.target.value));
  const closeBtn = container.querySelector(".sidebar-close");
  if (onClose) closeBtn.addEventListener("click", onClose);
}
