import { computeLeadTimeDays, formatCurrency, formatDate } from "./calculations.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function renderTable(placements, tbodyEl, emptyStateEl, countEl, onDelete) {
  tbodyEl.innerHTML = "";
  countEl.textContent = placements.length ? `(${placements.length})` : "";
  emptyStateEl.style.display = placements.length ? "none" : "block";

  // Most recently added first.
  const sorted = [...placements].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  for (const p of sorted) {
    const leadTime = computeLeadTimeDays(p.pitchSentDate, p.landedDate);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.publication)}</td>
      <td>${
        p.articleUrl
          ? `<a href="${escapeHtml(p.articleUrl)}" target="_blank" rel="noopener">${escapeHtml(p.headline)}</a>`
          : escapeHtml(p.headline)
      }</td>
      <td>${escapeHtml(p.client)}</td>
      <td>${escapeHtml(p.campaign) || "—"}</td>
      <td>${formatDate(p.publicationDate)}</td>
      <td class="numeric">${formatCurrency(p.aveValue)}</td>
      <td>${formatDate(p.pitchSentDate)}</td>
      <td>${formatDate(p.landedDate)}</td>
      <td class="numeric">${leadTime == null ? "—" : leadTime}</td>
      <td class="notes-cell" title="${escapeHtml(p.notes)}">${escapeHtml(p.notes) || "—"}</td>
      <td><button class="delete-btn" data-id="${p.id}">Delete</button></td>
    `;
    tbodyEl.appendChild(tr);
  }

  tbodyEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => onDelete(btn.dataset.id));
  });
}
