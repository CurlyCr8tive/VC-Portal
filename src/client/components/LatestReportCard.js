import { escapeHtml } from "../utils.js";
import { renderEmptyState } from "./EmptyState.js";

export function renderReportCard(container, report) {
  if (!report) {
    renderEmptyState(container, {
      icon: "📄",
      title: "No published reports yet",
      message: "Your first coverage report will appear here once it's ready.",
    });
    return;
  }

  const disabled = !report.viewUrl && !report.pdfUrl;

  container.innerHTML = `
    <div class="card report-card" style="${report.executiveSummary ? "flex-direction:column; align-items:stretch;" : ""}">
      <div class="report-info">
        <h3>${escapeHtml(report.title)}</h3>
        <p>${escapeHtml(report.period)} · Published ${escapeHtml(report.datePublished)}</p>
        ${
          report.executiveSummary
            ? `<p style="margin-top:10px; white-space:pre-wrap; color:var(--text-primary);">${escapeHtml(report.executiveSummary)}</p>`
            : ""
        }
      </div>
      <div class="report-actions">
        <button class="btn-secondary" ${disabled ? "disabled" : ""} title="${disabled ? "Not yet available in this demo" : ""}">View Report</button>
        <button class="btn-primary" ${disabled ? "disabled" : ""} title="${disabled ? "Not yet available in this demo" : ""}">Download PDF</button>
      </div>
    </div>
  `;
}
