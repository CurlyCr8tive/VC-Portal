import { leadTimeDaysForPlacement, formatCurrency, formatDate } from "../../calculations.js?v=20260919-report-builder";
import { DEMO_FALLBACKS, demoAVEForPlacement } from "../../demoFallbacks.js";
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
 *
 * `onEdit`/`onDelete` are optional and only ever passed from the owner
 * dashboard's dedicated Press Placements view — client.html never passes
 * them, and neither does the compact "Recent Press Placements" preview on
 * either dashboard's overview, so there's no edit/delete control anywhere
 * outside the one screen meant to manage data.
 *
 * `showDataQuality` controls whether an unconfirmed AVE figure gets a ⚠
 * next to it. Off by default on purpose: this table renders on the CLIENT
 * dashboard too, and "this number might be wrong" is Tenyse's internal
 * working note, not something to show VeganHood over her shoulder. The
 * owner views opt in. If Tenyse would rather clients saw the caveat too —
 * a defensible call, just a different one — turning it on for the client
 * dashboard is a one-word change at that call site.
 */
export function renderPlacementsTable(
  container,
  placements,
  { showClient = false, showDataQuality = false, onEdit, onDelete } = {}
) {
  if (!placements || placements.length === 0) {
    renderEmptyState(container, {
      icon: "📰",
      title: "No press placements yet",
      message: "Once your first story lands, it will show up here automatically.",
    });
    return;
  }

  const showActions = Boolean(onEdit || onDelete);

  // Renders the AVE cell with a hover-explained warning when the figure has
  // a known data-quality problem (schema.js's aveDataQuality). The reason
  // goes in the title attribute rather than inline — the table is already
  // dense, and the mark is only useful to someone asking "why that one?"
  const aveCell = (p, index = 0) => {
    const value = p.aveValue != null ? p.aveValue : demoAVEForPlacement(p, index);
    const sampleFlag =
      p.aveValue == null
        ? ` <span class="ave-flag" title="Demo Day sample value used because this placement has no saved AVE yet." style="cursor:help; color:#b8860b;">sample</span>`
        : "";
    const qualityFlag =
      showDataQuality && p.aveDataQuality
        ? ` <span class="ave-flag" title="${escapeHtml(p.aveDataQuality)}" style="cursor:help; color:#b8860b;">\u26a0</span>`
        : "";
    return `${formatCurrency(value)}${sampleFlag}${qualityFlag}`;
  };

  const rows = placements.map((p, index) => {
    const leadTime = leadTimeDaysForPlacement(p) ?? DEMO_FALLBACKS.avgLeadTimeDays;
    const statusClass = statusToClass(p.status);
    // A row with no link is one of two very different things, and rendering
    // both as plain text made the second look like the first:
    //
    //  - a single article whose URL just wasn't captured — a real gap
    //  - a BUNDLED campaign row, where Tenyse's case study reports one
    //    combined figure across six or eight outlets. There is no single
    //    article to link to, and there never will be. Left bare it reads
    //    as a broken link rather than as a different kind of record.
    //
    // Detected from the publication field, which is how these rows already
    // describe themselves ("8 outlets incl. …", "… + 1 more").
    const isBundled = /\b\d+\s+(?:news\s+)?outlets\b|\+\s*\d+\s*more|\bincl\./i.test(p.publication || "");
    const headlineCell = p.articleUrl
      ? `<a href="${escapeHtml(p.articleUrl)}" target="_blank" rel="noopener">${escapeHtml(p.headline)}</a>`
      : isBundled
        ? `${escapeHtml(p.headline)} <span class="hint" style="display:block; margin-top:2px; font-size:0.72rem;" title="This row is a campaign total across several outlets, so it has no single article to open.">Bundled campaign — no single article</span>`
        : `${escapeHtml(p.headline)} <span class="hint" style="display:block; margin-top:2px; font-size:0.72rem;" title="No article URL saved for this placement yet. Edit the placement to add one.">No link saved yet</span>`;

    return { p, index, leadTime, statusClass, headlineCell };
  });

  const clientTh = showClient ? "<th>Client</th>" : "";
  const clientTd = (p) => (showClient ? `<td>${escapeHtml(p.clientName || "—")}</td>` : "");
  const clientPcRow = (p) => (showClient ? `<div class="pc-row"><span>Client</span><span>${escapeHtml(p.clientName || "—")}</span></div>` : "");

  const sentimentBadge = (p) =>
    p.sentiment ? `<span class="sentiment-badge ${escapeHtml(p.sentiment)}">${escapeHtml(p.sentiment)}</span>` : "—";

  const actionsTh = showActions ? "<th></th>" : "";
  const actionsTd = (p) =>
    showActions
      ? `<td style="white-space:nowrap;">
          ${onEdit ? `<button class="link-btn" data-edit="${escapeHtml(p.id)}">Edit</button>` : ""}
          ${onDelete ? `<button class="link-btn" style="color:var(--color-coral-dark);" data-delete="${escapeHtml(p.id)}">Delete</button>` : ""}
        </td>`
      : "";
  const actionsPcRow = (p) =>
    showActions
      ? `<div class="pc-row"><span>Actions</span><span>
          ${onEdit ? `<button class="link-btn" data-edit="${escapeHtml(p.id)}">Edit</button>` : ""}
          ${onDelete ? `<button class="link-btn" style="color:var(--color-coral-dark);" data-delete="${escapeHtml(p.id)}">Delete</button>` : ""}
        </span></div>`
      : "";

  const tableRows = rows
    .map(
      ({ p, index, leadTime, statusClass, headlineCell }) => `
      <tr class="live-row" tabindex="0" data-live-tip="${escapeHtml(`${p.publication || "Placement"}: ${formatCurrency(demoAVEForPlacement(p, index))} estimated publicity value, ${leadTime == null ? "lead time not available" : `${leadTime} day lead time`}, status ${p.status || "not set"}.`)}">
        <td>${escapeHtml(p.publication)}</td>
        <td>${headlineCell}</td>
        ${clientTd(p)}
        <td>${formatDate(p.publicationDate)}</td>
        <td>${aveCell(p, index)}</td>
        <td>${leadTime == null ? "—" : `${leadTime} days`}</td>
        <td>${escapeHtml(p.campaign) || "—"}</td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(p.status)}</span></td>
        <td>${sentimentBadge(p)}</td>
        ${actionsTd(p)}
      </tr>`
    )
    .join("");

  const cardsMarkup = rows
    .map(
      ({ p, index, leadTime, statusClass, headlineCell }) => `
      <div class="placement-card live-card" tabindex="0" data-live-tip="${escapeHtml(`${p.publication || "Placement"}: ${formatCurrency(demoAVEForPlacement(p, index))} estimated publicity value, ${leadTime == null ? "lead time not available" : `${leadTime} day lead time`}.`)}">
        <div class="pc-row"><span>Publication</span><span>${escapeHtml(p.publication)}</span></div>
        <div class="pc-row"><span>Headline</span><span>${headlineCell}</span></div>
        ${clientPcRow(p)}
        <div class="pc-row"><span>Date</span><span>${p.publicationDate || "—"}</span></div>
        <div class="pc-row"><span>AVE</span><span>${aveCell(p, index)}</span></div>
        <div class="pc-row"><span>Lead time</span><span>${leadTime == null ? "—" : `${leadTime} days`}</span></div>
        <div class="pc-row"><span>Campaign</span><span>${escapeHtml(p.campaign) || "—"}</span></div>
        <div class="pc-row"><span>Status</span><span class="status-badge ${statusClass}">${escapeHtml(p.status)}</span></div>
        <div class="pc-row"><span>Sentiment</span><span>${sentimentBadge(p)}</span></div>
        ${actionsPcRow(p)}
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(p.publication || "Placement")}</strong><p>${escapeHtml(`${formatCurrency(demoAVEForPlacement(p, index))} estimated publicity value with ${leadTime == null ? "lead time not available" : `${leadTime} day lead time`}.`)}</p><span>This row feeds reports, analytics, and campaign value.</span></div>
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
            <th>Sentiment</th>
            ${actionsTh}
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="placement-cards">${cardsMarkup}</div>
  `;

  if (onEdit) {
    container.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => onEdit(btn.dataset.edit));
    });
  }
  if (onDelete) {
    container.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => onDelete(btn.dataset.delete));
    });
  }
}
