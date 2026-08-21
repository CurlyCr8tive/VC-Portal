import { escapeHtml } from "../../client/utils.js";
import { renderEmptyState } from "../../client/components/EmptyState.js";
import { listErrors, clearError, clearAllErrors } from "../../errorLog.js";

/**
 * Owner-side error log — the client-side/localStorage version of the
 * `errors` table in db/schema.sql (see src/errorLog.js). Replaces the old
 * static "no agents run yet" placeholder card in the Settings view: this
 * one is live, because localStorage failures (corrupt data, a failed
 * calculation) can happen today, before Supabase exists.
 */
export function renderErrorLogPanel(container) {
  const errors = listErrors();

  if (errors.length === 0) {
    renderEmptyState(container, {
      icon: "✅",
      title: "No errors — nothing has failed yet",
      message: "Failures from things like corrupted local data or a failed calculation will show up here, with what happened and when — never silently dropped.",
    });
    return;
  }

  container.innerHTML = `
    <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
      <button type="button" class="btn-secondary" id="error-log-clear-all">Clear All</button>
    </div>
    <div class="error-log-list">
      ${errors
        .map(
          (e) => `
        <div class="review-queue-item">
          <div class="rq-info">
            <p class="rq-headline">${escapeHtml(e.source)}</p>
            <p class="rq-meta">${escapeHtml(e.message)} · ${escapeHtml(formatTimestamp(e.occurredAt))}</p>
          </div>
          <div class="review-queue-actions">
            <button class="btn-reject" data-clear-error="${escapeHtml(e.id)}">Dismiss</button>
          </div>
        </div>`
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-clear-error]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearError(btn.dataset.clearError);
      renderErrorLogPanel(container);
    });
  });

  container.querySelector("#error-log-clear-all").addEventListener("click", () => {
    if (!confirm("Clear every logged error? This can't be undone.")) return;
    clearAllErrors();
    renderErrorLogPanel(container);
  });
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown time";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
