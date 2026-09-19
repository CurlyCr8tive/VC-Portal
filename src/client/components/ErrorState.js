import { escapeHtml } from "../utils.js";

export function renderErrorState(container, { message = "This view needs a refresh.", onRetry } = {}) {
  container.innerHTML = `
    <div class="state-panel error-panel" role="alert">
      <div class="state-icon" aria-hidden="true">⚠️</div>
      <h3>This view needs a refresh</h3>
      <p>${escapeHtml(message)}</p>
      ${onRetry ? '<button class="btn-secondary" data-retry>Try again</button>' : ""}
    </div>
  `;

  if (onRetry) {
    container.querySelector("[data-retry]").addEventListener("click", onRetry);
  }
}
