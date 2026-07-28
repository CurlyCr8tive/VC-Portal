import { escapeHtml } from "../../client/utils.js";

/**
 * Preview of the mentions-discovery review queue described in the PRD. The
 * discovery agent itself doesn't exist yet — these are hand-authored
 * candidate rows so the confirm/reject *workflow* can be seen and tried,
 * not a working scanner. Confirm/Reject only update in-memory state for
 * this session; nothing here is persisted or wired to real placements.
 */
export function renderReviewQueue(container, items, { onConfirm, onReject } = {}) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="state-panel">
        <div class="state-icon" aria-hidden="true">✅</div>
        <h3>You're all caught up</h3>
        <p>No candidate mentions waiting for review right now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="review-queue-list">
      ${items
        .map(
          (item) => `
        <div class="review-queue-item">
          <div class="rq-info">
            <p class="rq-headline">${escapeHtml(item.headline)}</p>
            <p class="rq-meta">${escapeHtml(item.publication)} · for ${escapeHtml(item.client)} · matched on "${escapeHtml(item.matchedOn)}" · found ${escapeHtml(item.discoveredDate)}</p>
          </div>
          <div class="review-queue-actions">
            <button class="btn-confirm" data-confirm="${escapeHtml(item.id)}">Confirm</button>
            <button class="btn-reject" data-reject="${escapeHtml(item.id)}">Reject</button>
          </div>
        </div>`
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-confirm]").forEach((btn) => {
    btn.addEventListener("click", () => onConfirm(btn.dataset.confirm));
  });
  container.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => onReject(btn.dataset.reject));
  });
}
