// src/owner/components/AnalyticsCharts.js
//
// Cross-client breakdowns for the Analytics view, fed by
// realDataSource.js's getAnalyticsSummary(). Simple proportional div-bars
// rather than SVG (PerformanceChart.js's approach) — these are categorical
// breakdowns, not a time series, so a bar's width as a percentage is both
// simpler to build and easier to read than a full chart. Same principle
// as PerformanceChart: no charting library, and every chart has a plain
// data-table fallback for anyone who can't read it visually.

import { formatCurrency } from "../../calculations.js";
import { escapeHtml } from "../../client/utils.js";

function barRow({ label, value, max, formatValue, color, sublabel }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `
    <div class="analytics-bar-row">
      <div class="analytics-bar-label">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatValue(value))}</strong>
      </div>
      <div class="analytics-bar-track">
        <div class="analytics-bar-fill" style="width:${pct}%; background:${color};"></div>
      </div>
      ${sublabel ? `<div class="hint" style="margin-top:2px;">${sublabel}</div>` : ""}
    </div>`;
}

/**
 * AVE by client, confirmed and flagged-estimate portions shown as two
 * segments rather than blended into one total — see
 * getAnalyticsSummary()'s own comment on why that split matters.
 */
export function renderAveByClientChart(container, aveByClient) {
  if (!aveByClient.length) {
    container.innerHTML = `<div class="state-panel compact"><h3>No AVE data yet</h3><p>Add placements with an AVE value to see this breakdown.</p></div>`;
    return;
  }
  const max = Math.max(...aveByClient.map((r) => r.total));
  const rows = aveByClient
    .map((r) => {
      const confirmedPct = r.total > 0 ? Math.round((r.confirmed / r.total) * 100) : 0;
      const flaggedPct = 100 - confirmedPct;
      const widthPct = Math.max(2, Math.round((r.total / max) * 100));
      return `
      <div class="analytics-bar-row">
        <div class="analytics-bar-label">
          <span>${escapeHtml(r.client)}</span>
          <strong>${escapeHtml(formatCurrency(r.total))}</strong>
        </div>
        <div class="analytics-bar-track" style="width:${widthPct}%;">
          ${r.confirmed > 0 ? `<div class="analytics-bar-fill" style="width:${confirmedPct}%; background:var(--color-teal);" title="Confirmed: ${escapeHtml(formatCurrency(r.confirmed))}"></div>` : ""}
          ${r.flagged > 0 ? `<div class="analytics-bar-fill" style="width:${flaggedPct}%; background:#b8860b;" title="Flagged (estimate or data-quality issue): ${escapeHtml(formatCurrency(r.flagged))}"></div>` : ""}
        </div>
        ${r.flagged > 0 ? `<div class="hint" style="margin-top:2px;">${escapeHtml(formatCurrency(r.flagged))} of this rests on an estimated or flagged figure — see Press Placements for which.</div>` : ""}
      </div>`;
    })
    .join("");

  container.innerHTML = `
    <div class="analytics-chart">${rows}</div>
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-swatch" style="background:var(--color-teal);"></span> Confirmed</span>
      <span class="legend-item"><span class="legend-swatch" style="background:#b8860b;"></span> Estimated / flagged</span>
    </div>
  `;
}

const STATUS_COLORS = { active: "var(--color-teal)", past: "#7a6d64", unconfirmed: "#b8860b" };
const STATUS_LABELS = { active: "Active", past: "Past", unconfirmed: "Unconfirmed" };

export function renderStatusBreakdownChart(container, statusBreakdown) {
  const total = statusBreakdown.reduce((s, r) => s + r.count, 0);
  if (!total) {
    container.innerHTML = `<div class="state-panel compact"><h3>No clients yet</h3></div>`;
    return;
  }
  const max = Math.max(...statusBreakdown.map((r) => r.count));
  container.innerHTML = statusBreakdown
    .map((r) =>
      barRow({
        label: STATUS_LABELS[r.status] || r.status,
        value: r.count,
        max,
        formatValue: (v) => `${v} client${v === 1 ? "" : "s"}`,
        color: STATUS_COLORS[r.status] || "var(--color-navy)",
      })
    )
    .join("");
}

const SENTIMENT_COLORS = { positive: "var(--color-teal)", neutral: "#7a6d64", negative: "var(--color-coral-dark)", "not set": "#d8d0c4" };

export function renderSentimentChart(container, sentimentBreakdown) {
  const total = sentimentBreakdown.reduce((s, r) => s + r.count, 0);
  if (!total) {
    container.innerHTML = `<div class="state-panel compact"><h3>No placements yet</h3></div>`;
    return;
  }
  const max = Math.max(...sentimentBreakdown.map((r) => r.count));
  const notSet = sentimentBreakdown.find((r) => r.sentiment === "not set");
  container.innerHTML =
    sentimentBreakdown
      .map((r) =>
        barRow({
          label: r.sentiment === "not set" ? "Not set" : r.sentiment[0].toUpperCase() + r.sentiment.slice(1),
          value: r.count,
          max,
          formatValue: (v) => `${v} placement${v === 1 ? "" : "s"}`,
          color: SENTIMENT_COLORS[r.sentiment] || "var(--color-navy)",
        })
      )
      .join("") +
    (notSet
      ? `<p class="hint" style="margin-top:8px;">"Not set" is a real category, not a gap to fill by guessing — no sentiment-analysis agent exists yet, so tone is only recorded when a person confirms it (see schema.js).</p>`
      : "");
}

/**
 * Deliberately not a single blended average — see getAnalyticsSummary()'s
 * comment on why folding every placement into one number would misrepresent
 * clients whose lead time genuinely isn't known.
 */
export function renderLeadTimeSection(container, leadTime) {
  const { byClient, placementsWithData, placementsMissingPitchDate, totalPlacements } = leadTime;
  const rows = byClient.length
    ? `<div class="analytics-chart">${byClient
        .map((r) =>
          barRow({
            label: r.client,
            value: r.avgDays,
            max: Math.max(...byClient.map((x) => x.avgDays), 1),
            formatValue: (v) => `${v} day${v === 1 ? "" : "s"} avg`,
            color: "var(--color-navy)",
            sublabel: `based on ${r.count} placement${r.count === 1 ? "" : "s"} with both a pitch and landed date`,
          })
        )
        .join("")}</div>`
    : "";

  const gapNote = placementsMissingPitchDate
    ? `<div class="state-panel compact" style="margin-top:${byClient.length ? "16px" : "0"};">
         <h3>${placementsMissingPitchDate} of ${totalPlacements} placements have no pitch date on file</h3>
         <p>Lead time can only be calculated where both a pitch date and a landed date exist. It is left blank rather than assumed for placements without one — an unknown turnaround is not the same as a fast one.</p>
       </div>`
    : "";

  container.innerHTML = rows || gapNote ? rows + gapNote : `<div class="state-panel compact"><h3>No lead time data yet</h3><p>Add a pitch date and a landed date to a placement to see turnaround time.</p></div>`;
}
