import { escapeHtml } from "../utils.js";

export function renderLoadingState(container, message = "Loading your dashboard…") {
  container.innerHTML = `
    <div class="state-panel" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
