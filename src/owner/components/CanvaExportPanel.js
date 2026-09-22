import { escapeHtml } from "../../client/utils.js";

/**
 * Pure UI: collects client + date range, hands off to onGenerate, and
 * displays whatever result it gets back. All the actual export logic
 * (validation, CSV building, the download itself) lives in canvaExport.js
 * and is orchestrated by owner/app.js — this component doesn't know or care
 * how "generate" works, only how to ask for it and show the outcome.
 */
export function renderCanvaExportPanel(container, { clients, onGenerate, getSummaryStatus, getDateRangeForClient }) {
  container.innerHTML = `
    <div class="card report-export-card">
      <p class="eyebrow">Final Export</p>
      <h3 style="color:var(--color-navy); font-size:1.15rem; margin:0 0 4px;">Canva Bulk Create CSV</h3>
      <p style="color:var(--text-secondary); font-size:0.85rem; margin:0 0 14px;">
        Package a client's confirmed placements and approved executive summary into a Canva-ready file.
        This is the bridge from tracked work to Tenyse's branded report template.
      </p>

      <div class="report-export-note">
        <strong>Demo path:</strong> generate the CSV here, upload it to Canva Bulk Create, then do the final visual review inside Tenyse's template.
      </div>

      <div id="canva-summary-status" style="margin-bottom:14px;"></div>

      <div class="entry-form">
        <div class="field-row">
          <label for="canva-export-client">Report package</label>
          <select id="canva-export-client">
            ${clients.length === 0 ? `<option value="">No clients yet</option>` : ""}
            ${clients.map((c) => `<option value="${escapeHtml(c.name)}" data-report-target="${escapeHtml(c.id || "")}">${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div id="canva-window-helper" class="report-window-helper"></div>
        <div class="report-date-presets" aria-label="Quick reporting windows">
          <button type="button" class="btn-secondary report-window-button" data-range-preset="full" aria-pressed="false">Use full coverage window</button>
          <button type="button" class="btn-secondary report-window-button" data-range-preset="90" aria-pressed="false">Last 90 days</button>
          <button type="button" class="btn-secondary report-window-button" data-range-preset="year" aria-pressed="false">This year</button>
        </div>
        <div id="canva-window-feedback" class="report-window-feedback" aria-live="polite"></div>
        <div class="field-row two-col">
          <div>
            <label for="canva-export-start">Report starts</label>
            <input type="date" id="canva-export-start" />
          </div>
          <div>
            <label for="canva-export-end">Report ends</label>
            <input type="date" id="canva-export-end" />
          </div>
        </div>
        <div class="form-actions report-export-actions">
          <button type="button" class="btn-secondary" id="canva-export-review-summary">Review + approve summary</button>
          <button type="button" class="btn-primary" id="canva-export-generate">Download Canva CSV</button>
        </div>
      </div>

      <div id="canva-export-result" style="margin-top:14px;"></div>
    </div>
  `;

  const resultEl = container.querySelector("#canva-export-result");
  const clientSelect = container.querySelector("#canva-export-client");
  const summaryStatusEl = container.querySelector("#canva-summary-status");
  const startInput = container.querySelector("#canva-export-start");
  const endInput = container.querySelector("#canva-export-end");
  const windowHelper = container.querySelector("#canva-window-helper");
  const windowFeedback = container.querySelector("#canva-window-feedback");
  const presetButtons = Array.from(container.querySelectorAll("[data-range-preset]"));

  // Shown before generating, not after — silently exporting without an
  // approved summary should read as a visible choice, not a surprise
  // discovered only once the CSV is already downloaded.
  function updateSummaryStatus() {
    const clientName = clientSelect.value;
    const approvedSummary = clientName && getSummaryStatus ? getSummaryStatus(clientName) : null;
    renderSummaryStatus(summaryStatusEl, approvedSummary);
  }

  function updateDateRange() {
    const clientName = clientSelect.value;
    const range = clientName && getDateRangeForClient ? getDateRangeForClient(clientName) : null;
    startInput.value = range?.startDate || "";
    endInput.value = range?.endDate || "";
    renderWindowHelper(windowHelper, range);
    setActivePreset("full");
    renderWindowFeedback(windowFeedback, range, "full");
  }

  function selectedCoverageRange() {
    const clientName = clientSelect.value;
    return clientName && getDateRangeForClient ? getDateRangeForClient(clientName) : null;
  }

  function applyPreset(preset) {
    const range = selectedCoverageRange();
    if (!range?.startDate || !range?.endDate) {
      startInput.value = "";
      endInput.value = "";
      renderWindowHelper(windowHelper, null);
      setActivePreset(preset);
      renderWindowFeedback(windowFeedback, null, preset);
      return null;
    }
    const end = new Date(`${range.endDate}T00:00:00`);
    let start = new Date(`${range.startDate}T00:00:00`);
    if (preset === "90") {
      start = new Date(end);
      start.setDate(start.getDate() - 89);
      const floor = new Date(`${range.startDate}T00:00:00`);
      if (start < floor) start = floor;
    }
    if (preset === "year") {
      start = new Date(end.getFullYear(), 0, 1);
      const floor = new Date(`${range.startDate}T00:00:00`);
      if (start < floor) start = floor;
    }
    const selectedRange = {
      startDate: start.toISOString().slice(0, 10),
      endDate: range.endDate,
      coverageStartDate: range.startDate,
      coverageEndDate: range.endDate,
    };
    startInput.value = selectedRange.startDate;
    endInput.value = range.endDate;
    setActivePreset(preset);
    renderWindowFeedback(windowFeedback, selectedRange, preset);
    return selectedRange;
  }

  function setActivePreset(preset) {
    presetButtons.forEach((btn) => {
      const active = btn.dataset.rangePreset === preset;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  if (clients.length > 0) {
    clientSelect.addEventListener("change", () => {
      updateDateRange();
      updateSummaryStatus();
      resultEl.innerHTML = "";
    });
    updateDateRange();
    updateSummaryStatus();
  }

  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      applyPreset(btn.dataset.rangePreset);
      resultEl.innerHTML = "";
    });
  });

  [startInput, endInput].forEach((input) => {
    input.addEventListener("change", () => {
      setActivePreset("");
      renderWindowFeedback(windowFeedback, { startDate: startInput.value, endDate: endInput.value }, "custom");
      resultEl.innerHTML = "";
    });
  });

  container.querySelector("#canva-export-review-summary").addEventListener("click", () => {
    if (!clients.length || !clientSelect.value) {
      resultEl.innerHTML = `
        <div class="report-action-feedback warn">
          <strong>No report package is available yet.</strong>
          Add or import a client with confirmed placements, then return here to approve the summary.
        </div>
      `;
      return;
    }
    const selected = clientSelect.selectedOptions[0];
    const targetId = selected?.dataset.reportTarget;
    const target = targetId ? document.getElementById(`summary-form-${targetId}`) : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("report-work-card-highlight");
      window.setTimeout(() => target.classList.remove("report-work-card-highlight"), 1600);
      resultEl.innerHTML = `
        <div class="report-action-feedback success">
          <strong>Summary workspace opened for ${escapeHtml(clientSelect.value)}.</strong>
          Review the AI draft, click <strong>Save Draft</strong>, then <strong>Approve</strong> so Canva receives the client-ready narrative.
        </div>
      `;
      return;
    }
    resultEl.innerHTML = `
      <div class="report-action-feedback warn">
        <strong>No summary editor found for ${escapeHtml(clientSelect.value || "this client")}.</strong>
        Try another report package, or export placement rows without a narrative summary.
      </div>
    `;
  });

  container.querySelector("#canva-export-generate").addEventListener("click", () => {
    const clientName = clientSelect.value;
    if (!clients.length || !clientName) {
      resultEl.innerHTML = `
        <div class="report-action-feedback warn">
          <strong>No Canva export is ready yet.</strong>
          Add a client and confirmed placement rows first; the CSV export will use that data plus an approved summary when available.
        </div>
      `;
      return;
    }
    const startDate = container.querySelector("#canva-export-start").value;
    const endDate = container.querySelector("#canva-export-end").value;
    const result = onGenerate({ clientName, startDate, endDate });
    renderResult(resultEl, result);
  });
}

function renderWindowFeedback(el, range, preset) {
  if (!el) return;
  const labels = {
    full: "Full coverage window selected",
    90: "Last 90 days selected",
    year: "This year selected",
    custom: "Custom report window selected",
  };

  if (!range?.startDate || !range?.endDate) {
    el.innerHTML = `
      <p><strong>${escapeHtml(labels[preset] || "Report window selected")}:</strong> no dated placements are available yet, so this can only export an approved summary.</p>
    `;
    return;
  }

  const sameAsFull =
    range.coverageStartDate &&
    range.coverageEndDate &&
    range.startDate === range.coverageStartDate &&
    range.endDate === range.coverageEndDate &&
    preset !== "full";

  el.innerHTML = `
    <p>
      <strong>${escapeHtml(labels[preset] || "Report window selected")}:</strong>
      ${escapeHtml(range.startDate)} to ${escapeHtml(range.endDate)}.
      ${sameAsFull ? "This client only has coverage inside that available window, so the preset resolves to the full demo range." : ""}
    </p>
  `;
}

function renderWindowHelper(el, range) {
  if (!el) return;
  if (!range?.startDate || !range?.endDate) {
    el.innerHTML = `<p class="hint">No dated placements found yet for this client. Approving the summary can still create a summary-only Canva file.</p>`;
    return;
  }
  el.innerHTML = `
    <p class="hint">Available coverage window: <strong>${escapeHtml(range.startDate)}</strong> to <strong>${escapeHtml(range.endDate)}</strong>. Use the full window for demo day unless you want a narrower report.</p>
  `;
}

function renderSummaryStatus(el, approvedSummary) {
  if (!approvedSummary) {
    el.innerHTML = `
      <div class="warn" style="background:#fff8e6; border:1px solid #f0ddab; color:#7a5c15; border-radius:var(--radius-md); padding:10px 14px; font-size:0.82rem;">
        <strong>Approval needed:</strong> review the Executive Summary below, click <strong>Save Draft</strong>, then <strong>Approve</strong>. Placement rows can still export, but the approved summary is what gives the Canva report its client-ready narrative.
      </div>
    `;
    return;
  }
  el.innerHTML = `
    <div class="warn" style="background:#eafaf6; border:1px solid #bfe8dc; color:#146c56; border-radius:var(--radius-md); padding:10px 14px; font-size:0.82rem;">
      ✓ Executive summary approved ${escapeHtml(approvedSummary.approvedAt.slice(0, 10))} — it will be included in the export.
    </div>
  `;
}

function renderResult(resultEl, result) {
  if (!result) {
    resultEl.innerHTML = "";
    return;
  }

  if (result.ok) {
    resultEl.innerHTML = `
      <div class="review-queue-item" style="border-color:var(--color-teal);">
        <div class="rq-info">
          <p class="rq-headline">CSV downloaded — ${result.summaryOnly ? "approved summary included" : `${result.count} placement${result.count === 1 ? "" : "s"} included`}.</p>
          <p class="rq-meta"><strong>File:</strong> ${escapeHtml(result.filename || "Canva CSV")}</p>
          <p class="rq-meta">${
            result.summaryOnly
              ? "No landed placements matched this range, so this file gives Canva the approved report summary only."
              : "Next: in Canva, open Tenyse's report template, choose Apps → Bulk Create, upload this CSV, connect each CSV field to the matching text/image areas, generate the report pages, then review before sending."
          }</p>
          ${
            result.warnings?.length
              ? `<ul style="margin:8px 0 0; padding-left:18px; font-size:0.84rem; color:var(--text-secondary);">${result.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
              : ""
          }
        </div>
      </div>
    `;
    return;
  }

  if (result.reason === "no_placements") {
    resultEl.innerHTML = `
      <div class="state-panel" style="padding:20px;">
        <p style="margin:0;">${escapeHtml(result.message)}</p>
      </div>
    `;
    return;
  }

  if (result.reason === "missing_fields") {
    resultEl.innerHTML = `
      <div class="warn" style="background:#fdeceb; border:1px solid #f3cfc9; color:#8a3b2c; border-radius:var(--radius-md); padding:14px 16px;">
        <p style="margin:0 0 8px; font-weight:600;">A few placement details are needed before export.</p>
        <p style="margin:0 0 8px; font-size:0.85rem;">Complete these fields, then download the Canva CSV again.</p>
        <ul style="margin:0; padding-left:18px; font-size:0.85rem;">
          ${result.issues
            .map((issue) => `<li><strong>${escapeHtml(issue.placement)}</strong>: missing ${issue.missingColumns.map(escapeHtml).join(", ")}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }
}
