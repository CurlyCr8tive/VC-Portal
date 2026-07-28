import { escapeHtml } from "../utils.js";

export function renderErrorState(container, { message = "We couldn't load your dashboard right now.", onRetry } = {}) {
  container.innerHTML = `
    <div class="state-panel error-panel" role="alert">
      <div class="state-icon" aria-hidden="true">⚠️</div>
      <h3>Something didn't load</h3>
      <p>${escapeHtml(message)}</p>
      ${onRetry ? '<button class="btn-secondary" data-retry>Try again</button>' : ""}
    </div>
  `;

  if (onRetry) {
    container.querySelector("[data-retry]").addEventListener("click", onRetry);
  }
}
