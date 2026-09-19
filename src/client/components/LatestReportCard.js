import { escapeHtml } from "../utils.js";
import { renderEmptyState } from "./EmptyState.js";
import { downloadReportPdf } from "../../reportPdf.js";

export function renderReportCard(container, report, options = {}) {
  if (!report) {
    renderEmptyState(container, {
      icon: "📄",
      title: "No published reports yet",
      message: "Your first coverage report will appear here once it's ready.",
    });
    return;
  }

  const canPreview = Boolean(report.viewUrl || report.executiveSummary);
  const canDownload = Boolean(report.pdfUrl || report.executiveSummary);

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
        <button class="btn-secondary" data-report-preview ${!canPreview ? "disabled" : ""} title="${!canPreview ? "Save report content first" : ""}">View Report</button>
        <button class="btn-primary" data-report-pdf ${!canDownload ? "disabled" : ""} title="${!canDownload ? "Save report content first" : ""}">Download PDF</button>
      </div>
      ${
        report.executiveSummary
          ? `<div class="report-preview-panel" hidden>
              <p class="eyebrow">Report Preview</p>
              <h4>${escapeHtml(report.title)}</h4>
              <p class="hint">${escapeHtml(report.period)} · Prepared ${escapeHtml(report.datePublished)}</p>
              <div class="report-preview-copy">${escapeHtml(report.executiveSummary)}</div>
            </div>`
          : ""
      }
    </div>
  `;

  container.querySelector("[data-report-preview]")?.addEventListener("click", () => {
    if (options.onViewReport) {
      options.onViewReport(report);
      return;
    }
    if (report.viewUrl) {
      window.open(report.viewUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const panel = container.querySelector(".report-preview-panel");
    if (panel) panel.hidden = !panel.hidden;
  });

  container.querySelector("[data-report-pdf]")?.addEventListener("click", () => {
    if (options.onDownloadPdf) {
      options.onDownloadPdf(report);
      return;
    }
    if (report.pdfUrl) {
      window.open(report.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    downloadReportPdf(report);
  });
}
