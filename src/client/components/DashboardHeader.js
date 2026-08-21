import { escapeHtml } from "../utils.js";

/**
 * Shared header for both portals. `greeting`/`subtitle` let the owner
 * dashboard override the client-facing copy; `extraAction` is how the
 * owner's "+ New Client" button gets added without a client-only header
 * needing to know about it.
 */
export function renderHeader(container, opts) {
  const { client, onSearch, onHamburgerClick, greeting, subtitle, searchPlaceholder, extraAction, dataSource } = opts;

  // Visible regardless of which view is scrolled to, since the header
  // renders on every page — the point is a viewer can never lose track of
  // being in mock/demo mode partway through a scroll. See mockData.js's
  // own header for what "real case study numbers, clearly labeled" means
  // here: real sourced figures, presented as example data, never live.
  const demoBadge =
    dataSource === "mock"
      ? `<span style="display:inline-flex; align-items:center; gap:5px; margin-left:10px; padding:3px 10px; border-radius:999px; background:#fff3d6; border:1px solid #f0d789; color:#8a6d1a; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; vertical-align:middle;">🔶 Demo Data</span>`
      : "";

  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <button class="hamburger" aria-label="Open menu">☰</button>
      <div>
        <h1>${escapeHtml(greeting || `Welcome, ${client.name}!`)}${demoBadge}</h1>
        <p class="header-sub">${escapeHtml(subtitle || "Here's an overview of your campaign progress and results.")}</p>
      </div>
    </div>
    <div class="header-actions">
      <div class="header-search" role="search">
        <span aria-hidden="true">🔍</span>
        <label for="portal-search" style="position:absolute; left:-9999px;">Search placements and reports</label>
        <input id="portal-search" type="search" placeholder="${escapeHtml(searchPlaceholder || "Search placements, reports…")}" />
      </div>
      ${extraAction ? `<button class="new-client-btn" data-extra-action>${escapeHtml(extraAction.label)}</button>` : ""}
      <button class="icon-btn" aria-label="Notifications">🔔</button>
      <div class="avatar" title="${escapeHtml(client.name)}" aria-hidden="true">${escapeHtml(client.avatarInitials)}</div>
    </div>
  `;

  container.querySelector(".hamburger").addEventListener("click", onHamburgerClick);
  container.querySelector("#portal-search").addEventListener("input", (e) => onSearch(e.target.value));
  if (extraAction) {
    container.querySelector("[data-extra-action]").addEventListener("click", extraAction.onClick);
  }
}
