import { formatCurrency } from "../../calculations.js";
import { escapeHtml } from "../utils.js";

const RANGE_LABELS = {
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "1y": "This Year",
};

/**
 * Hand-rolled SVG bar+line chart — no charting library exists in this project,
 * so this stays dependency-free rather than pulling one in for a single chart.
 * A "view as table" toggle exists specifically so the same data is available
 * to anyone who can't read the chart visually.
 */
export function renderPerformanceChart(container, { series, range, onRangeChange }) {
  const width = 600;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 30, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxAve = Math.max(1, ...series.map((d) => d.ave));
  const maxPlacements = Math.max(1, ...series.map((d) => d.placements));
  const n = series.length || 1;
  const slot = plotW / n;
  const barWidth = Math.min(38, slot * 0.5);

  const bars = series
    .map((d, i) => {
      const barH = (d.ave / maxAve) * plotH;
      const x = padding.left + i * slot + (slot - barWidth) / 2;
      const y = padding.top + (plotH - barH);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" fill="#f3ab97"></rect>`;
    })
    .join("");

  const linePoints = series
    .map((d, i) => {
      const x = padding.left + i * slot + slot / 2;
      const y = padding.top + (plotH - (d.placements / maxPlacements) * plotH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const dots = series
    .map((d, i) => {
      const x = padding.left + i * slot + slot / 2;
      const y = padding.top + (plotH - (d.placements / maxPlacements) * plotH);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#1f2a52"></circle>`;
    })
    .join("");

  const xLabels = series
    .map((d, i) => {
      const x = padding.left + i * slot + slot / 2;
      return `<text x="${x.toFixed(1)}" y="${height - 8}" font-size="11" fill="#7a6d64" text-anchor="middle">${escapeHtml(d.label)}</text>`;
    })
    .join("");

  const summary = series
    .map((d) => `${d.label}: ${formatCurrency(d.ave)} AVE across ${d.placements} placement${d.placements === 1 ? "" : "s"}`)
    .join("; ");

  const tableRows = series
    .map((d) => `<tr><td>${escapeHtml(d.label)}</td><td>${formatCurrency(d.ave)}</td><td>${d.placements}</td></tr>`)
    .join("");

  container.innerHTML = `
    <div class="section-heading">
      <h2>Placement &amp; Value Overview</h2>
      <select class="chart-range-select" aria-label="Select date range for chart">
        ${Object.entries(RANGE_LABELS)
          .map(([value, label]) => `<option value="${value}" ${value === range ? "selected" : ""}>${label}</option>`)
          .join("")}
      </select>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Publicity value and placement count over time. ${escapeHtml(summary)}" style="width:100%; height:auto;">
      ${bars}
      <polyline points="${linePoints}" fill="none" stroke="#1f2a52" stroke-width="2"></polyline>
      ${dots}
      ${xLabels}
    </svg>
    <div class="chart-legend">
      <span class="legend-item"><span class="legend-swatch" style="background:#f3ab97"></span> AVE ($)</span>
      <span class="legend-item"><span class="legend-swatch" style="background:#1f2a52; border-radius:50%;"></span> Placements</span>
    </div>
    <button type="button" class="chart-table-toggle" aria-expanded="false">View chart data as a table</button>
    <table class="chart-data-table" hidden>
      <thead><tr><th>Period</th><th>AVE ($)</th><th>Placements</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  container.querySelector(".chart-range-select").addEventListener("change", (e) => onRangeChange(e.target.value));

  const toggleBtn = container.querySelector(".chart-table-toggle");
  const dataTable = container.querySelector(".chart-data-table");
  toggleBtn.addEventListener("click", () => {
    const isHidden = dataTable.hasAttribute("hidden");
    if (isHidden) {
      dataTable.removeAttribute("hidden");
      toggleBtn.setAttribute("aria-expanded", "true");
      toggleBtn.textContent = "Hide chart data table";
    } else {
      dataTable.setAttribute("hidden", "");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.textContent = "View chart data as a table";
    }
  });
}
