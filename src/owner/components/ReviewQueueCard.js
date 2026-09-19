import { escapeHtml } from "../../client/utils.js";

export function renderReviewQueue(container, items, { onConfirm, onReject, confirmLabel = "Confirm", showPlacementDetails = false } = {}) {
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
        <div class="review-queue-item live-card" tabindex="0" data-live-tip="${escapeHtml(`Discovery matched “${item.matchedOn || "keyword"}” for ${item.client}. Tenyse reviews the source before this becomes a confirmed placement.`)}">
          <div class="rq-info">
            <p class="rq-headline">
              ${
                item.articleUrl
                  ? `<a href="${escapeHtml(item.articleUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.headline)}</a>`
                  : escapeHtml(item.headline)
              }
            </p>
            <p class="rq-meta">${escapeHtml(item.publication)} · for ${escapeHtml(item.client)} · matched on "${escapeHtml(item.matchedOn)}" · found ${escapeHtml(item.discoveredDate)}</p>
            <div class="rq-source-row">
              ${
                item.articleUrl
                  ? `<a class="source-link" href="${escapeHtml(item.articleUrl)}" target="_blank" rel="noopener noreferrer">View source</a>`
                  : `<span class="hint">No source link saved</span>`
              }
              <span>Match: ${escapeHtml(item.matchedOn || "keyword match")}</span>
            </div>
          </div>
          <div class="review-queue-actions">
            <button class="btn-confirm" data-confirm="${escapeHtml(item.id)}">${escapeHtml(confirmLabel)}</button>
            <button class="btn-reject" data-reject="${escapeHtml(item.id)}">Reject</button>
          </div>
          ${
            showPlacementDetails
              ? `<form class="entry-form rq-placement-form" data-placement-details="${escapeHtml(item.id)}" style="grid-column:1 / -1; margin-top:10px;">
            <details>
              <summary style="cursor:pointer; font-size:0.82rem; color:var(--text-secondary);">Edit placement details before creating</summary>
              <div class="field-row two-col" style="margin-top:10px;">
                <div>
                  <label for="rq-publication-date-${escapeHtml(item.id)}">Publication Date</label>
                  <input type="date" id="rq-publication-date-${escapeHtml(item.id)}" name="publicationDate" />
                </div>
                <div>
                  <label for="rq-campaign-${escapeHtml(item.id)}">Campaign</label>
                  <input type="text" id="rq-campaign-${escapeHtml(item.id)}" name="campaign" placeholder="Optional; must already exist" />
                </div>
              </div>
              <div class="field-row two-col">
                <div>
                  <label for="rq-ave-${escapeHtml(item.id)}">AVE ($)</label>
                  <input type="number" id="rq-ave-${escapeHtml(item.id)}" name="aveValue" min="0" step="0.01" placeholder="0.00" />
                </div>
                <div>
                  <label for="rq-reach-${escapeHtml(item.id)}">Audience Reach</label>
                  <input type="number" id="rq-reach-${escapeHtml(item.id)}" name="audienceReach" min="0" step="1" />
                </div>
              </div>
              <div class="field-row two-col">
                <div>
                  <label for="rq-sentiment-${escapeHtml(item.id)}">Sentiment</label>
                  <select id="rq-sentiment-${escapeHtml(item.id)}" name="sentiment">
                    <option value="">Not set</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
                <div>
                  <label for="rq-landed-date-${escapeHtml(item.id)}">Landed Date</label>
                  <input type="date" id="rq-landed-date-${escapeHtml(item.id)}" name="landedDate" />
                </div>
              </div>
              <div class="field-row" style="margin-bottom:0;">
                <label for="rq-notes-${escapeHtml(item.id)}">Notes</label>
                <textarea id="rq-notes-${escapeHtml(item.id)}" name="notes" rows="2" placeholder="Owner-only notes for this placement"></textarea>
              </div>
            </details>
          </form>`
              : ""
          }
          <div class="live-tip-panel" role="tooltip">
            <strong>Discovery match</strong>
            <p>${escapeHtml(`Matched on “${item.matchedOn || "keyword match"}” for ${item.client}. Confirming creates a placement; rejecting keeps it out of client-facing totals.`)}</p>
            <span>${item.articleUrl ? "Open the source, then confirm or reject." : "Review the match before taking action."}</span>
          </div>
        </div>`
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-confirm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = container.querySelector(`[data-placement-details="${CSS.escape(btn.dataset.confirm)}"]`);
      const details = form ? Object.fromEntries(new FormData(form).entries()) : {};
      onConfirm(btn.dataset.confirm, details);
    });
  });
  container.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => onReject(btn.dataset.reject));
  });
}
