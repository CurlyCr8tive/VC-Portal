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

  const isDraft = Boolean(report.isDraft);
  const statusLabel = report.statusLabel || (isDraft ? "Draft preview" : `Published ${report.datePublished}`);
  const canPreview = Boolean(report.viewUrl || report.executiveSummary);
  const canDownload = Boolean(report.pdfUrl || report.executiveSummary);
  const summaryStatus = report.executiveSummary
    ? isDraft
      ? "Draft report copy is ready to review. Open it before approving or exporting."
      : "Published report copy is ready. Open it to review the client-facing summary."
    : "Report copy appears here after the executive summary is created.";

  container.innerHTML = `
    <div class="card report-card live-card" tabindex="0" data-live-tip="${escapeHtml(`${isDraft ? "Draft preview" : "Published report"} for ${report.period}. Use View Report for the ${isDraft ? "review copy" : "client-ready summary"} or Download PDF${isDraft ? " Preview" : ""} for a shareable file.`)}" style="${report.executiveSummary ? "flex-direction:column; align-items:stretch;" : ""}">
      <div class="report-info">
        <h3>${escapeHtml(report.title)}</h3>
        <p>${escapeHtml(report.period)} · ${escapeHtml(statusLabel)}</p>
        <p class="hint" style="margin-top:10px;">${escapeHtml(summaryStatus)}</p>
      </div>
      <div class="report-actions">
        ${
          canPreview
            ? `<button class="btn-secondary" data-report-preview>${isDraft ? "View Draft" : "View Report"}</button>`
            : `<span class="report-action-note">Preview appears after summary approval.</span>`
        }
        ${
          canDownload
            ? `<button class="btn-primary" data-report-pdf>${isDraft ? "Download PDF Preview" : "Download PDF"}</button>`
            : `<span class="report-action-note">PDF appears after report approval.</span>`
        }
      </div>
      ${
        report.executiveSummary
          ? `<div class="report-preview-panel" hidden>
              <p class="eyebrow">Report Preview</p>
              <h4>${escapeHtml(report.title)}</h4>
              <p class="hint">${escapeHtml(report.period)} · ${escapeHtml(statusLabel)}</p>
              <div class="report-preview-copy">${escapeHtml(report.executiveSummary)}</div>
            </div>`
          : ""
      }
      <div class="live-tip-panel" role="tooltip">
        <strong>${escapeHtml(report.title)}</strong>
        <p>${escapeHtml(isDraft ? "This is a draft preview generated from tracked placement data. Approve the executive summary before treating it as client-facing." : `Published ${report.datePublished}. This is the client-facing output generated from tracked placements and approved summary copy.`)}</p>
        <span>${escapeHtml(isDraft ? "Review, approve, then publish." : "Preview or download the report.")}</span>
      </div>
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
