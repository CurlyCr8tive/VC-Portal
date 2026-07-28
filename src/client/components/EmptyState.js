import { escapeHtml } from "../utils.js";

export function renderEmptyState(container, { icon = "📭", title, message }) {
  container.innerHTML = `
    <div class="state-panel">
      <div class="state-icon" aria-hidden="true">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
