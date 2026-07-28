import { escapeHtml } from "../utils.js";

export function renderInsightCard(container, insight) {
  if (!insight) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="card insight-card">
      <span class="insight-label">✨ Campaign Insight</span>
      <p>${escapeHtml(insight.text)}</p>
      <p class="insight-note">${escapeHtml(insight.note)}</p>
    </div>
  `;
}
