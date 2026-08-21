// src/owner/components/OutletRatesView.js
//
// Rate list/edit view for outletRatesStorage.js — the piece flagged as
// missing everywhere else in this build ("storage + calc logic built and
// pushed, mainly needs the form/UI wiring"). Feeds the AVE Calculation
// Agent's automatic lookup: PlacementForm's "Calculate" button (see
// PlacementForm.js) reads whatever's saved here via calculateAVE().
//
// No seeded rates — see outletRatesStorage.js's own header: no real
// per-outlet rate has been confirmed for any outlet yet
// (docs/ave-agent-details.md section 5), so an empty list here is
// accurate, not a placeholder waiting to be filled with fake data.

import { escapeHtml } from "../../client/utils.js";
import { formatCurrency } from "../../calculations.js";
import { listAllRates, saveRate, daysSinceUpdated } from "../../outletRatesStorage.js";
import { logError } from "../../errorLog.js";

export function renderOutletRatesView(container) {
  render();

  function render() {
    const rates = listAllRates();
    container.innerHTML = `
      <p class="hint" style="margin:0 0 12px;">
        <code>AVE = rate × multiplier</code>. Multiplier defaults to 1 (equal to advertising) — no industry-standard
        multiplier exists, so only raise it with a real reason. Saving a rate for an outlet that's already on file
        overwrites it (the edit path — same outlet name, new numbers).
      </p>
      <div class="card" style="margin-bottom:16px;">
        <form class="entry-form" id="outlet-rate-form">
          <div class="field-row">
            <label for="or-outlet">Outlet name</label>
            <input type="text" id="or-outlet" placeholder="e.g. PIX11" required />
          </div>
          <div class="field-row two-col">
            <div>
              <label for="or-rate">Rate estimate ($)</label>
              <input type="number" id="or-rate" step="0.01" min="0.01" placeholder="0.00" required />
            </div>
            <div>
              <label for="or-multiplier">Multiplier</label>
              <input type="number" id="or-multiplier" step="0.1" min="0.1" value="1" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary">Save Rate</button>
          </div>
        </form>
      </div>
      <div id="outlet-rate-list"></div>
    `;

    renderList(rates);

    const form = container.querySelector("#outlet-rate-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const outlet = container.querySelector("#or-outlet").value;
      const rate = container.querySelector("#or-rate").value;
      const multiplier = container.querySelector("#or-multiplier").value || 1;
      try {
        saveRate(outlet, rate, multiplier);
        render();
      } catch (err) {
        logError({ source: "Outlet rates form", message: err.message });
        alert(err.message);
      }
    });
  }

  function renderList(rates) {
    const listEl = container.querySelector("#outlet-rate-list");
    if (!listEl) return;

    if (rates.length === 0) {
      listEl.innerHTML = `
        <div class="state-panel">
          <div class="state-icon" aria-hidden="true">💲</div>
          <h3>No outlet rates on file yet</h3>
          <p>Rates you save here are what the AVE Calculation Agent's "Calculate" button looks up — nothing is seeded or guessed.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="review-queue-list">
        ${rates
          .map((r) => {
            const days = daysSinceUpdated(r);
            const stale = days != null && days > 365;
            return `
          <div class="review-queue-item">
            <div class="rq-info">
              <p class="rq-headline">${escapeHtml(r.outletName)}</p>
              <p class="rq-meta">
                ${formatCurrency(r.rateEstimate)} × ${r.multiplier} multiplier
                ${days != null ? ` · updated ${days === 0 ? "today" : `${days}d ago`}` : ""}
                ${stale ? ' · <strong style="color:#b8860b;">not reviewed in 12+ months</strong>' : ""}
              </p>
            </div>
            <div class="review-queue-actions">
              <button type="button" class="btn-secondary" data-edit-rate="${escapeHtml(r.outletName)}">Edit</button>
            </div>
          </div>`;
          })
          .join("")}
      </div>
    `;

    listEl.querySelectorAll("[data-edit-rate]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rate = rates.find((r) => r.outletName === btn.dataset.editRate);
        if (!rate) return;
        container.querySelector("#or-outlet").value = rate.outletName;
        container.querySelector("#or-rate").value = rate.rateEstimate;
        container.querySelector("#or-multiplier").value = rate.multiplier;
        container.querySelector("#or-outlet").focus();
      });
    });
  }
}
