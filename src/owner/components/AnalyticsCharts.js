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
            sublabel: r.sample
              ? `Demo Day sample based on ${r.count} placement${r.count === 1 ? "" : "s"} missing pitch dates`
              : `based on ${r.count} placement${r.count === 1 ? "" : "s"} with both a pitch and landed date`,
          })
        )
        .join("")}</div>`
    : "";

  const gapNote = placementsMissingPitchDate
    ? `<div class="state-panel compact" style="margin-top:${byClient.length ? "16px" : "0"};">
         <h3>${placementsMissingPitchDate} of ${totalPlacements} placements have no pitch date on file</h3>
         <p>Google Workspace lead-time tracking is on hold until after Demo Day. The dashboard uses sample lead-time values where pitch dates are missing so every account can show the intended workflow.</p>
       </div>`
    : "";

  container.innerHTML = rows || gapNote ? rows + gapNote : `<div class="state-panel compact"><h3>Demo lead time enabled</h3><p>Google Workspace tracking is deferred; sample lead-time values will appear once placements are available.</p></div>`;
}

// ---------------------------------------------------------------------------
// Donut chart — media type breakdown. Pure SVG (stroke-dasharray ring
// segments), same "no charting library" rule as PerformanceChart.js, with
// the same accessible-table fallback pattern.
// ---------------------------------------------------------------------------
const DONUT_COLORS = ["#1f2a52", "#8b93b8", "#e2735a", "#3f9e97", "#d8d0c4", "#b8860b"];

export function renderDonutChart(container, { data, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) {
    container.innerHTML = `<div class="state-panel compact"><h3>No data yet</h3></div>`;
    return;
  }
  const R = 60;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const frac = d.value / total;
      const dash = frac * CIRC;
      const seg = `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}" stroke-width="24" stroke-dasharray="${dash.toFixed(1)} ${(CIRC - dash).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 80 80)"></circle>`;
      offset += dash;
      return seg;
    })
    .join("");

  const legend = data
    .filter((d) => d.value > 0)
    .map(
      (d, i) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${DONUT_COLORS[i % DONUT_COLORS.length]};"></span> ${escapeHtml(d.label)} — ${Math.round((d.value / total) * 100)}%</span>`
    )
    .join("");

  const tableRows = data
    .filter((d) => d.value > 0)
    .map((d) => `<tr><td>${escapeHtml(d.label)}</td><td>${d.value}</td><td>${Math.round((d.value / total) * 100)}%</td></tr>`)
    .join("");

  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
      <div style="position:relative; width:160px; height:160px; flex-shrink:0;">
        <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="${escapeHtml(centerLabel)}: ${escapeHtml(String(centerValue))} total. ${data.map((d) => `${d.label} ${d.value}`).join(", ")}">
          ${segments}
        </svg>
        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
          <strong style="font-size:1.3rem; color:var(--color-navy);">${escapeHtml(String(centerValue))}</strong>
          <span style="font-size:0.7rem; color:var(--text-secondary);">${escapeHtml(centerLabel)}</span>
        </div>
      </div>
      <div class="chart-legend" style="flex-direction:column; gap:8px; align-items:flex-start;">${legend}</div>
    </div>
    <button type="button" class="chart-table-toggle" aria-expanded="false">View chart data as a table</button>
    <table class="chart-data-table" hidden>
      <thead><tr><th>Type</th><th>Placements</th><th>Share</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
  const toggleBtn = container.querySelector(".chart-table-toggle");
  const dataTable = container.querySelector(".chart-data-table");
  toggleBtn.addEventListener("click", () => {
    const isHidden = dataTable.hasAttribute("hidden");
    dataTable.toggleAttribute("hidden", !isHidden);
    toggleBtn.setAttribute("aria-expanded", String(isHidden));
    toggleBtn.textContent = isHidden ? "Hide chart data table" : "View chart data as a table";
  });
}

// ---------------------------------------------------------------------------
// Weekly placement + reach trend — same bar+line combo as
// PerformanceChart.js, bucketed by week instead of month, with a second
// series (audience reach) plotted as the line instead of placement count,
// matching the "Placement Trends" chart's own two-metric shape.
// ---------------------------------------------------------------------------
export function renderWeeklyTrendChart(container, series) {
  if (!series.length) {
    container.innerHTML = `<div class="state-panel compact"><h3>No placement data in this range</h3></div>`;
    return;
  }
  const width = 640;
  const height = 220;
  const padding = { top: 10, right: 46, bottom: 30, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const maxPlacements = Math.max(1, ...series.map((d) => d.placements));
  const maxReach = Math.max(1, ...series.map((d) => d.reach));
  const n = series.length;
  const slot = plotW / n;
  const barWidth = Math.min(34, slot * 0.5);

  const bars = series
    .map((d, i) => {
      const barH = (d.placements / maxPlacements) * plotH;
      const x = padding.left + i * slot + (slot - barWidth) / 2;
      const y = padding.top + (plotH - barH);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" fill="#1f2a52"></rect>`;
    })
    .join("");
  const linePoints = series
    .map((d, i) => {
      const x = padding.left + i * slot + slot / 2;
      const y = padding.top + (plotH - (d.reach / maxReach) * plotH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const dots = series
    .map((d, i) => {
      const x = padding.left + i * slot + slot / 2;
      const y = padding.top + (plotH - (d.reach / maxReach) * plotH);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#3f9e97"></circle>`;
    })
    .join("");
  const xLabels = series
    .map((d, i) => {
      const x = padding.left + i * slot + slot / 2;
      return `<text x="${x.toFixed(1)}" y="${height - 8}" font-size="10" fill="#7a6d64" text-anchor="middle">${escapeHtml(d.label)}</text>`;
    })
    .join("");
  const summary = series.map((d) => `${d.label}: ${d.placements} placements, ${d.reach.toLocaleString()} reach`).join("; ");
  const tableRows = series.map((d) => `<tr><td>${escapeHtml(d.label)}</td><td>${d.placements}</td><td>${d.reach.toLocaleString()}</td></tr>`).join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Weekly placements and audience reach. ${escapeHtml(summary)}" style="width:100%; height:auto;">
      ${bars}
      <polyline points="${linePoints}" fill="none" stroke="#3f9e97" stroke-width="2"></polyline>
      ${dots}
      ${xLabels}
    </svg>
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-swatch" style="background:#1f2a52;"></span> Press placements</span>
      <span class="legend-item"><span class="legend-swatch" style="background:#3f9e97; border-radius:50%;"></span> Estimated reach</span>
    </div>
    <button type="button" class="chart-table-toggle" aria-expanded="false">View chart data as a table</button>
    <table class="chart-data-table" hidden>
      <thead><tr><th>Week</th><th>Placements</th><th>Reach</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
  const toggleBtn = container.querySelector(".chart-table-toggle");
  const dataTable = container.querySelector(".chart-data-table");
  toggleBtn.addEventListener("click", () => {
    const isHidden = dataTable.hasAttribute("hidden");
    dataTable.toggleAttribute("hidden", !isHidden);
    toggleBtn.setAttribute("aria-expanded", String(isHidden));
    toggleBtn.textContent = isHidden ? "Hide chart data table" : "View chart data as a table";
  });
}
