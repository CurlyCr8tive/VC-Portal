import { computeLeadTimeDays, formatCurrency, formatDate } from "../../calculations.js";
import { escapeHtml, statusToClass } from "../utils.js";
import { renderEmptyState } from "./EmptyState.js";

/**
 * Renders press placements. Deliberately has no "Notes" column — owner-only
 * notes never reach this component's data in the first place.
 *
 * `showClient: true` adds a Client column, reading `p.clientName` on each
 * row. That's the owner dashboard's aggregate-across-all-clients view;
 * client.html never passes this flag, so a client only ever sees a table
 * with no client column at all — there's nothing in the markup for another
 * client's name to even appear in.
 */
export function renderPlacementsTable(container, placements, { showClient = false } = {}) {
  if (!placements || placements.length === 0) {
    renderEmptyState(container, {
      icon: "📰",
      title: "No press placements yet",
      message: "Once your first story lands, it will show up here automatically.",
    });
    return;
  }

  const rows = placements.map((p) => {
    const leadTime = computeLeadTimeDays(p.pitchSentDate, p.landedDate);
    const statusClass = statusToClass(p.status);
    const headlineCell = p.articleUrl
      ? `<a href="${escapeHtml(p.articleUrl)}" target="_blank" rel="noopener">${escapeHtml(p.headline)}</a>`
      : escapeHtml(p.headline);

    return { p, leadTime, statusClass, headlineCell };
  });

  const clientTh = showClient ? "<th>Client</th>" : "";
  const clientTd = (p) => (showClient ? `<td>${escapeHtml(p.clientName || "—")}</td>` : "");
  const clientPcRow = (p) => (showClient ? `<div class="pc-row"><span>Client</span><span>${escapeHtml(p.clientName || "—")}</span></div>` : "");

  const tableRows = rows
    .map(
      ({ p, leadTime, statusClass, headlineCell }) => `
      <tr>
        <td>${escapeHtml(p.publication)}</td>
        <td>${headlineCell}</td>
        ${clientTd(p)}
        <td>${formatDate(p.publicationDate)}</td>
        <td>${formatCurrency(p.aveValue)}</td>
        <td>${leadTime == null ? "—" : `${leadTime} days`}</td>
        <td>${escapeHtml(p.campaign) || "—"}</td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(p.status)}</span></td>
      </tr>`
    )
    .join("");

  const cardsMarkup = rows
    .map(
      ({ p, leadTime, statusClass, headlineCell }) => `
      <div class="placement-card">
        <div class="pc-row"><span>Publication</span><span>${escapeHtml(p.publication)}</span></div>
        <div class="pc-row"><span>Headline</span><span>${headlineCell}</span></div>
        ${clientPcRow(p)}
        <div class="pc-row"><span>Date</span><span>${p.publicationDate || "—"}</span></div>
        <div class="pc-row"><span>AVE</span><span>${formatCurrency(p.aveValue)}</span></div>
        <div class="pc-row"><span>Lead time</span><span>${leadTime == null ? "—" : `${leadTime} days`}</span></div>
        <div class="pc-row"><span>Campaign</span><span>${escapeHtml(p.campaign) || "—"}</span></div>
        <div class="pc-row"><span>Status</span><span class="status-badge ${statusClass}">${escapeHtml(p.status)}</span></div>
      </div>`
    )
    .join("");

  container.innerHTML = `
    <div class="table-scroll">
      <table class="placements-table">
        <thead>
          <tr>
            <th>Publication</th>
            <th>Headline</th>
            ${clientTh}
            <th>Date</th>
            <th>AVE</th>
            <th>Lead Time</th>
            <th>Campaign</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="placement-cards">${cardsMarkup}</div>
  `;
}
