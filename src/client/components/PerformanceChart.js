import { formatCurrency } from "../../calculations.js";
import { escapeHtml } from "../utils.js";

const RANGE_LABELS = {
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "1y": "This Year",
  all: "All Time",
};

/**
 * Hand-rolled SVG bar+line chart — no charting library exists in this project,
 * so this stays dependency-free rather than pulling one in for a single chart.
 * A "view as table" toggle exists specifically so the same data is available
 * to anyone who can't read the chart visually.
 */
export function renderPerformanceChart(container, { series, range, onRangeChange, rangeLabel }) {
  const safeSeries = Array.isArray(series) ? series : [];
  const hasDataPoints = safeSeries.some((point) => (Number(point.ave) || 0) > 0 || (Number(point.placements) || 0) > 0);
  if (!safeSeries.length || !hasDataPoints) {
    container.innerHTML = `
      <div class="section-heading">
        <h2>Placement &amp; Value Overview</h2>
        ${
          rangeLabel
            ? `<span class="hint" style="margin:0;">${escapeHtml(rangeLabel)}</span>`
            : `<select class="chart-range-select" aria-label="Select date range for chart">
          ${Object.entries(RANGE_LABELS)
            .map(([value, label]) => `<option value="${value}" ${value === range ? "selected" : ""}>${label}</option>`)
            .join("")}
        </select>`
        }
      </div>
      <div class="state-panel compact">
        <h3>No placement value data yet</h3>
        <p>Add placements with publication dates and AVE values, or choose a wider date range.</p>
      </div>
    `;
    const rangeSelect = container.querySelector(".chart-range-select");
    if (rangeSelect) rangeSelect.addEventListener("change", (e) => onRangeChange(e.target.value));
    return;
  }

  series = safeSeries;
  const totalAve = series.reduce((sum, d) => sum + (Number(d.ave) || 0), 0);
  const totalPlacements = series.reduce((sum, d) => sum + (Number(d.placements) || 0), 0);
  const periodsWithCoverage = series.filter((d) => (Number(d.ave) || 0) > 0 || (Number(d.placements) || 0) > 0).length;
  const strongestByValue = [...series].sort((a, b) => (Number(b.ave) || 0) - (Number(a.ave) || 0))[0];
  const strongestByPlacements = [...series].sort((a, b) => (Number(b.placements) || 0) - (Number(a.placements) || 0))[0];
  const latestWithCoverage = [...series].reverse().find((d) => (Number(d.ave) || 0) > 0 || (Number(d.placements) || 0) > 0);
  const maxAve = Math.max(1, ...series.map((d) => Number(d.ave) || 0));
  const maxPlacements = Math.max(1, ...series.map((d) => Number(d.placements) || 0));
  const avgValue = totalPlacements ? totalAve / totalPlacements : 0;

  const storyParts = [
    `${formatCurrency(totalAve)} in publicity value`,
    `${totalPlacements} press placement${totalPlacements === 1 ? "" : "s"}`,
    `${periodsWithCoverage} active period${periodsWithCoverage === 1 ? "" : "s"}`,
  ];
  const storySentence = `${storyParts.join(" across ")}. ${
    strongestByValue
      ? `${strongestByValue.label} drove the highest value (${formatCurrency(strongestByValue.ave)}).`
      : ""
  }`;

  const graphWidth = 620;
  const graphHeight = 180;
  const graphPadding = { top: 18, right: 18, bottom: 34, left: 18 };
  const graphW = graphWidth - graphPadding.left - graphPadding.right;
  const graphH = graphHeight - graphPadding.top - graphPadding.bottom;
  const slot = graphW / Math.max(1, series.length);
  const graphBarWidth = Math.min(42, slot * 0.52);
  const graphPoints = series.map((d, i) => {
    const ave = Number(d.ave) || 0;
    const placements = Number(d.placements) || 0;
    const x = graphPadding.left + i * slot + slot / 2;
    const barHeight = (ave / maxAve) * graphH;
    const barX = x - graphBarWidth / 2;
    const barY = graphPadding.top + graphH - barHeight;
    const dotY = graphPadding.top + graphH - (placements / maxPlacements) * graphH;
    const share = totalAve ? Math.round((ave / totalAve) * 100) : 0;
    return { ...d, ave, placements, x, barX, barY, barHeight, dotY, share };
  });
  const placementLine = graphPoints.map((p) => `${p.x.toFixed(1)},${p.dotY.toFixed(1)}`).join(" ");
  const interactiveGraph = `
    <div class="value-graph-wrap">
      <svg class="value-graph" viewBox="0 0 ${graphWidth} ${graphHeight}" role="img" aria-label="Interactive publicity value graph. Hover or tab through each period for details. ${escapeHtml(summary)}">
        <line x1="${graphPadding.left}" y1="${graphPadding.top + graphH}" x2="${graphWidth - graphPadding.right}" y2="${graphPadding.top + graphH}" stroke="#ead8cf" stroke-width="1"></line>
        ${graphPoints
          .map((p) => {
            const tooltip = `${p.label}: ${formatCurrency(p.ave)} publicity value, ${p.placements} placement${p.placements === 1 ? "" : "s"}, ${p.share}% of total value.`;
            return `
              <g class="value-graph-point" tabindex="0" aria-label="${escapeHtml(tooltip)}">
                <rect x="${p.barX.toFixed(1)}" y="${p.barY.toFixed(1)}" width="${graphBarWidth.toFixed(1)}" height="${Math.max(2, p.barHeight).toFixed(1)}" rx="6"></rect>
                <circle cx="${p.x.toFixed(1)}" cy="${p.dotY.toFixed(1)}" r="5"></circle>
                <text x="${p.x.toFixed(1)}" y="${graphHeight - 10}" text-anchor="middle">${escapeHtml(p.label)}</text>
                <foreignObject x="${Math.max(4, Math.min(graphWidth - 176, p.x - 84)).toFixed(1)}" y="${Math.max(4, p.barY - 82).toFixed(1)}" width="172" height="74" class="value-graph-tooltip">
                  <div xmlns="http://www.w3.org/1999/xhtml">
                    <strong>${escapeHtml(p.label)}</strong>
                    <span>${formatCurrency(p.ave)} publicity value</span>
                    <span>${p.placements} placement${p.placements === 1 ? "" : "s"} · ${p.share}% of total</span>
                  </div>
                </foreignObject>
              </g>
            `;
          })
          .join("")}
        <polyline points="${placementLine}" fill="none" stroke="#1f2a52" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
      </svg>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-swatch" style="background:var(--color-coral);"></span> Publicity value</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#1f2a52; border-radius:50%;"></span> Press placements</span>
      </div>
    </div>
  `;

  const timelineRows = graphPoints
    .map((d) => {
      const barWidth = Math.max(d.ave > 0 ? 8 : 0, Math.round((d.ave / maxAve) * 100));
      const isValueLeader = strongestByValue && d.label === strongestByValue.label && d.ave > 0;
      const isPlacementLeader = strongestByPlacements && d.label === strongestByPlacements.label && d.placements > 0;
      return `
        <div class="value-timeline-row" tabindex="0">
          <div class="value-period">
            <strong>${escapeHtml(d.label)}</strong>
            ${isValueLeader ? `<span>Highest value</span>` : isPlacementLeader ? `<span>Most placements</span>` : `<span>${d.placements ? "Coverage landed" : "No coverage"}</span>`}
          </div>
          <div class="value-bar-track" aria-hidden="true">
            <div class="value-bar-fill" style="width:${barWidth}%;"></div>
          </div>
          <div class="value-row-metrics">
            <strong>${formatCurrency(d.ave)}</strong>
            <span>${d.placements} placement${d.placements === 1 ? "" : "s"}</span>
          </div>
          <div class="value-row-tooltip" role="tooltip">
            <strong>${escapeHtml(d.label)}</strong>
            <span>${formatCurrency(d.ave)} publicity value</span>
            <span>${d.placements} press placement${d.placements === 1 ? "" : "s"}</span>
            <span>${d.share}% of total value shown</span>
          </div>
        </div>
      `;
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
      ${
        rangeLabel
          ? `<span class="hint" style="margin:0;">${escapeHtml(rangeLabel)}</span>`
          : `<select class="chart-range-select" aria-label="Select date range for chart">
        ${Object.entries(RANGE_LABELS)
          .map(([value, label]) => `<option value="${value}" ${value === range ? "selected" : ""}>${label}</option>`)
          .join("")}
      </select>`
      }
    </div>
    <div class="value-story" role="img" aria-label="Publicity value story. ${escapeHtml(summary)}">
      <div class="value-story-summary">
        <p class="eyebrow">What this shows</p>
        <h3>${escapeHtml(storySentence)}</h3>
        <p>This connects Tenyse's press wins to visible business value: when coverage landed, how much publicity value it created, and how many placements supported that momentum.</p>
      </div>
      <div class="value-story-metrics">
        <div>
          <span>Total value</span>
          <strong>${formatCurrency(totalAve)}</strong>
        </div>
        <div>
          <span>Press wins</span>
          <strong>${totalPlacements}</strong>
        </div>
        <div>
          <span>Avg. value / win</span>
          <strong>${formatCurrency(avgValue)}</strong>
        </div>
      </div>
      ${interactiveGraph}
      <div class="value-timeline" aria-hidden="true">
        ${timelineRows}
      </div>
      ${
        latestWithCoverage
          ? `<p class="value-story-note">Most recent visible activity: <strong>${escapeHtml(latestWithCoverage.label)}</strong> with ${latestWithCoverage.placements} placement${latestWithCoverage.placements === 1 ? "" : "s"} and ${formatCurrency(latestWithCoverage.ave)} in value.</p>`
          : ""
      }
    </div>
    <button type="button" class="chart-table-toggle" aria-expanded="false">View chart data as a table</button>
    <table class="chart-data-table" hidden>
      <thead><tr><th>Period</th><th>Publicity value</th><th>Press placements</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  const rangeSelect = container.querySelector(".chart-range-select");
  if (rangeSelect) rangeSelect.addEventListener("change", (e) => onRangeChange(e.target.value));

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
