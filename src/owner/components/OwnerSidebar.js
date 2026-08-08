import { escapeHtml } from "../../client/utils.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "clients", label: "Clients" },
  { id: "campaigns", label: "Campaigns" },
  { id: "placements", label: "Press Placements" },
  { id: "reviewqueue", label: "Review Queue" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

/**
 * Owner-side nav. This is the one place in the whole build where "All
 * Clients," full placement editing, and the mentions review queue are
 * allowed to exist — none of it is reachable from client.html.
 */
export function renderOwnerSidebar(container, opts) {
  const { ownerName, sessionEmail, currentView, demoState, dataSource, onNavigate, onDemoStateChange, onDataSourceChange, onLogout, onClose } = opts;

  container.innerHTML = `
    <button class="sidebar-close" aria-label="Close menu">✕ Close</button>
    <div class="sidebar-brand">
      <span class="logo-mark" aria-hidden="true">V</span>
      <span class="brand-name">Verified Consulting</span>
    </div>
    <div class="sidebar-client-name">
      Owner dashboard
      <strong>${escapeHtml(ownerName)}</strong>
      ${sessionEmail ? `<div style="font-size:0.72rem; opacity:0.75; margin-top:2px;">Logged in as ${escapeHtml(sessionEmail)}</div>` : ""}
    </div>
    <nav aria-label="Owner dashboard navigation">
      <ul class="sidebar-nav">
        ${NAV_ITEMS.map(
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
      <label for="owner-data-source-select">Data source</label>
      <select id="owner-data-source-select">
        <option value="real" ${dataSource === "real" ? "selected" : ""}>Real (actual placements)</option>
        <option value="mock" ${dataSource === "mock" ? "selected" : ""}>Mock (demo preview)</option>
      </select>
      <label for="owner-demo-state-select" style="margin-top:8px;">Demo: data state</label>
      <select id="owner-demo-state-select">
        <option value="normal" ${demoState === "normal" ? "selected" : ""}>Normal</option>
        <option value="loading" ${demoState === "loading" ? "selected" : ""}>Loading</option>
        <option value="empty" ${demoState === "empty" ? "selected" : ""}>Empty (no clients yet)</option>
        <option value="error" ${demoState === "error" ? "selected" : ""}>Error</option>
      </select>
    </div>
  `;

  container.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(btn.dataset.nav));
  });
  container.querySelector('[data-action="logout"]').addEventListener("click", onLogout);
  container.querySelector("#owner-data-source-select").addEventListener("change", (e) => onDataSourceChange(e.target.value));
  container.querySelector("#owner-demo-state-select").addEventListener("change", (e) => onDemoStateChange(e.target.value));
  const closeBtn = container.querySelector(".sidebar-close");
  if (onClose) closeBtn.addEventListener("click", onClose);
}
