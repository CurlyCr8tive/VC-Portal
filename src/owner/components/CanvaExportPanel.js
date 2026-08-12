import { escapeHtml } from "../../client/utils.js";

/**
 * Pure UI: collects client + date range, hands off to onGenerate, and
 * displays whatever result it gets back. All the actual export logic
 * (validation, CSV building, the download itself) lives in canvaExport.js
 * and is orchestrated by owner/app.js — this component doesn't know or care
 * how "generate" works, only how to ask for it and show the outcome.
 */
export function renderCanvaExportPanel(container, { clients, onGenerate }) {
  container.innerHTML = `
    <div class="card">
      <h3 style="color:var(--color-navy); font-size:1.05rem; margin:0 0 4px;">Canva Report Export</h3>
      <p style="color:var(--text-secondary); font-size:0.85rem; margin:0 0 14px;">
        Generates a CSV of a client's confirmed placements, mapped to Canva Bulk Create's expected columns.
        You'll still upload it into Canva and do a final visual check before sending anything to a client —
        this only automates the data entry that comes before that.
      </p>

      <div class="warn" style="background:#fff8e6; border:1px solid #f0ddab; color:#7a5c15; border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; font-size:0.82rem;">
        <strong>Column labels are inferred, not confirmed.</strong> They're built from Tenyse's website case studies and the PRD, not her real Canva template — she hasn't shared it yet. Expect the header row to need updating once she does.
      </div>

      <div class="entry-form">
        <div class="field-row">
          <label for="canva-export-client">Client</label>
          <select id="canva-export-client">
            ${clients.length === 0 ? `<option value="">No clients yet</option>` : ""}
            ${clients.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field-row two-col">
          <div>
            <label for="canva-export-start">From (publication date)</label>
            <input type="date" id="canva-export-start" />
          </div>
          <div>
            <label for="canva-export-end">To</label>
            <input type="date" id="canva-export-end" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-primary" id="canva-export-generate" ${clients.length === 0 ? "disabled" : ""}>Generate CSV</button>
        </div>
      </div>

      <div id="canva-export-result" style="margin-top:14px;"></div>
    </div>
  `;

  const resultEl = container.querySelector("#canva-export-result");

  container.querySelector("#canva-export-generate").addEventListener("click", () => {
    const clientName = container.querySelector("#canva-export-client").value;
    const startDate = container.querySelector("#canva-export-start").value;
    const endDate = container.querySelector("#canva-export-end").value;
    const result = onGenerate({ clientName, startDate, endDate });
    renderResult(resultEl, result);
  });
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
          <p class="rq-headline">CSV downloaded — ${result.count} placement${result.count === 1 ? "" : "s"} included.</p>
          <p class="rq-meta">Upload it into Canva's Bulk Create, then do a final visual check before sending it to the client.</p>
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
        <p style="margin:0 0 8px; font-weight:600;">Export stopped — some confirmed placements are missing required fields.</p>
        <p style="margin:0 0 8px; font-size:0.85rem;">Nothing was generated. Fix these first, then try again — a partial file would break Bulk Create silently.</p>
        <ul style="margin:0; padding-left:18px; font-size:0.85rem;">
          ${result.issues
            .map((issue) => `<li><strong>${escapeHtml(issue.placement)}</strong>: missing ${issue.missingColumns.map(escapeHtml).join(", ")}</li>`)
            .join("")}
        </ul>
      </div>
    `;
  }
}
