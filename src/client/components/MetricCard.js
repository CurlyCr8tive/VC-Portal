import { formatCurrency } from "../../calculations.js";
import { nextId } from "../utils.js";

function deltaLabel(delta, { lowerIsBetter = false } = {}) {
  if (delta == null) return "";
  const isGood = lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const cls = delta === 0 ? "" : isGood ? "positive" : "negative";
  return `<p class="metric-delta ${cls}">${arrow} ${Math.abs(delta)}% vs last period</p>`;
}

function tooltipMarkup(id, text) {
  return `
    <div class="info-tooltip-wrap" data-tooltip-wrap>
      <button type="button" class="info-icon" aria-expanded="false" aria-describedby="${id}" aria-label="What is this metric?">i</button>
      <div class="info-tooltip" role="tooltip" id="${id}">${text}</div>
    </div>
  `;
}

function card({ label, value, icon, iconBg, delta, deltaOpts, tooltipText }) {
  const tipId = nextId("tip");
  return `
    <div class="card metric-card">
      <div class="metric-top">
        <span class="metric-label">${label} ${tooltipText ? tooltipMarkup(tipId, tooltipText) : ""}</span>
        <span class="metric-icon" style="background:${iconBg}">${icon}</span>
      </div>
      <p class="metric-value">${value}</p>
      ${delta != null ? deltaLabel(delta, deltaOpts) : ""}
    </div>
  `;
}

export function renderMetricsGrid(container, metrics) {
  container.innerHTML = `
    ${card({
      label: "Total Publicity Value (AVE)",
      value: formatCurrency(metrics.totalAVE),
      icon: "$",
      iconBg: "#fbe2da",
      delta: metrics.aveDelta,
      tooltipText: "An estimate of what similar exposure may have cost as paid advertising.",
    })}
    ${card({
      label: "Total Press Placements",
      value: metrics.totalPlacements != null ? metrics.totalPlacements : "—",
      icon: "📰",
      iconBg: "#e1f2f0",
      delta: metrics.placementsDelta,
    })}
    ${card({
      label: "Avg. Lead Time",
      value: metrics.avgLeadTime != null ? `${metrics.avgLeadTime} days` : "—",
      icon: "⏱",
      iconBg: "#fdf0d8",
      delta: metrics.leadTimeDelta,
      deltaOpts: { lowerIsBetter: true },
      tooltipText: "The time between the beginning of outreach and the publication of a press placement.",
    })}
    ${card({
      label: "Active Campaigns",
      value: metrics.activeCampaigns,
      icon: "📁",
      iconBg: "#efe9f5",
      delta: null,
    })}
  `;

  container.querySelectorAll("[data-tooltip-wrap]").forEach((wrap) => {
    const btn = wrap.querySelector(".info-icon");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
      container.querySelectorAll("[data-tooltip-wrap]").forEach((other) => {
        if (other !== wrap) {
          other.classList.remove("open");
          other.querySelector(".info-icon").setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  document.addEventListener("click", () => {
    container.querySelectorAll("[data-tooltip-wrap].open").forEach((wrap) => {
      wrap.classList.remove("open");
      wrap.querySelector(".info-icon").setAttribute("aria-expanded", "false");
    });
  });
}
