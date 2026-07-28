import { escapeHtml } from "../utils.js";

/**
 * Shared header for both portals. `greeting`/`subtitle` let the owner
 * dashboard override the client-facing copy; `extraAction` is how the
 * owner's "+ New Client" button gets added without a client-only header
 * needing to know about it.
 */
export function renderHeader(container, opts) {
  const { client, onSearch, onHamburgerClick, greeting, subtitle, searchPlaceholder, extraAction } = opts;

  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <button class="hamburger" aria-label="Open menu">☰</button>
      <div>
        <h1>${escapeHtml(greeting || `Welcome, ${client.name}!`)}</h1>
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
