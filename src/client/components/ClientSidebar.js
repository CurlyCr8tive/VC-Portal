import { escapeHtml } from "../utils.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "campaigns", label: "My Campaigns" },
  { id: "placements", label: "Press Placements" },
  { id: "reports", label: "Reports" },
  { id: "analytics", label: "Analytics" },
  { id: "resources", label: "Resources" },
  { id: "coaching", label: "Coaching Program" },
];

/**
 * Renders the client-side nav only. No "All Clients", "Team Management",
 * "Add Client", or other owner-only controls exist anywhere in this module —
 * that's a deliberate omission, not an oversight.
 *
 * There is also no "view as a different client" control here. Once a login
 * session exists, which client's data you see is decided by who's logged
 * in, not by a dropdown sitting next to their data — switching accounts
 * means logging out and back in, same as it would with real auth.
 */
export function renderSidebar(container, opts) {
  const { client, sessionEmail, currentView, demoState, dataSource, onNavigate, onDemoStateChange, onDataSourceChange, onLogout, onClose } = opts;

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
    <nav aria-label="Client portal navigation">
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
