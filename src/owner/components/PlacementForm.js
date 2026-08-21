// Owner-side "Add Placement" form — the same fields, in the same order, as
// the original standalone tool (index.html), just restyled to match the
// dashboard shell. This does NOT duplicate schema/validation/persistence
// logic: the caller is expected to run the submitted raw values through
// schema.js's createPlacement()/applyPlacementEdit() and storage.js's
// addPlacement()/updatePlacement(), exactly as index.html's src/app.js
// already does for the create path. This component only renders the fields
// and hands back what was typed.
//
// Passing `initialData` switches this into edit mode: fields are pre-filled,
// the submit button reads "Save Changes" instead of "Add Placement", and a
// Cancel button appears (only onCancel makes sense to show there).

import { OUTLET_REFERENCE, KNOWN_OUTLETS_NO_RATE_YET } from "../../outletReference.js";
import { calculateAVE } from "../../aveCalculation.js";
import { saveRate } from "../../outletRatesStorage.js";
import { logError } from "../../errorLog.js";
import { escapeHtml } from "../../client/utils.js";

// Suggestions only — <datalist> never restricts input, so typing an outlet
// that isn't in either list still works fine. Combines the ones with a real
// reach figure and the larger known-but-unrated list from Tenyse's case
// studies, deduped and sorted for a predictable dropdown order.
const OUTLET_SUGGESTIONS = [...new Set([...OUTLET_REFERENCE.map((o) => o.name), ...KNOWN_OUTLETS_NO_RATE_YET])].sort();

// General industry ranges only — NOT Tenyse's confirmed rates. Mirrors
// docs/ave-agent-details.md section 3 exactly; shown as a manual-fallback
// suggestion only, never written to outlet_rates automatically. Keep this
// list in sync with that doc if the benchmarks there ever change.
const AVE_BENCHMARKS = [
  { type: "Print — national", range: "$20–50/col-cm" },
  { type: "Print — local", range: "$5–20/col-cm" },
  { type: "Print — magazine", range: "$30–150/col-cm" },
  { type: "Digital/online news", range: "$3–15 CPM" },
  { type: "Podcast — mid-roll, host-read", range: "$25–40 CPM" },
  { type: "Podcast — pre-roll", range: "$15–25 CPM" },
  { type: "Podcast — post-roll", range: "$5–15 CPM" },
  { type: "Social/influencer — nano (1K–10K)", range: "$200–1,000/post" },
  { type: "Social/influencer — micro (10K–100K)", range: "$1,000–10,000/post" },
  { type: "Social/influencer — mid (100K–1M)", range: "$10,000–50,000/post" },
  { type: "TV/broadcast", range: "No reliable benchmark found" },
  { type: "Radio (terrestrial)", range: "No reliable benchmark found" },
];

function val(initialData, field) {
  if (!initialData) return "";
  const v = initialData[field];
  return v == null ? "" : v;
}

export function renderPlacementForm(container, { onSubmit, onCancel, initialData = null, onResearchRate, onSuggestHeadline, onAnalyzeSentiment }) {
  const isEdit = Boolean(initialData);

  container.innerHTML = `
    <form class="entry-form" id="owner-placement-form">
      <div class="field-row">
        <label for="op-publication">Publication *</label>
        <input type="text" id="op-publication" name="publication" list="op-publication-list" placeholder="e.g. Forbes" value="${val(initialData, "publication")}" required />
        <datalist id="op-publication-list">
          ${OUTLET_SUGGESTIONS.map((name) => `<option value="${name.replace(/"/g, "&quot;")}"></option>`).join("")}
        </datalist>
      </div>

      <div class="field-row">
        <label for="op-headline">Headline *</label>
        <div style="display:flex; gap:6px;">
          <input type="text" id="op-headline" name="headline" placeholder="Title of the piece" value="${val(initialData, "headline")}" required style="flex:1;" />
          ${onSuggestHeadline ? `<button type="button" class="btn-secondary" id="op-headline-suggest">💡 Report phrasing</button>` : ""}
        </div>
        ${
          onSuggestHeadline
            ? `<p class="hint" style="margin-top:4px;">This field is the actual published headline — suggestions below are alternate copy for a client report, not a replacement for it.</p>
               <div id="op-headline-suggestions" style="margin-top:6px; font-size:0.82rem;"></div>`
            : ""
        }
      </div>

      <div class="field-row">
        <label for="op-articleUrl">Article URL</label>
        <input type="url" id="op-articleUrl" name="articleUrl" placeholder="https://..." value="${val(initialData, "articleUrl")}" />
      </div>

      <div class="field-row">
        <label for="op-client">Client *</label>
        <input type="text" id="op-client" name="client" placeholder="Client name" value="${val(initialData, "client")}" required />
      </div>

      <div class="field-row two-col">
        <div>
          <label for="op-publicationDate">Publication Date</label>
          <input type="date" id="op-publicationDate" name="publicationDate" value="${val(initialData, "publicationDate")}" />
        </div>
        <div>
          <label for="op-aveValue">AVE ($)</label>
          <div style="display:flex; gap:6px;">
            <input type="number" id="op-aveValue" name="aveValue" step="0.01" min="0" placeholder="0.00" value="${val(initialData, "aveValue")}" style="flex:1;" />
            <button type="button" class="btn-secondary" id="op-ave-calculate">Calculate</button>
          </div>
        </div>
      </div>
      <div id="op-ave-fallback"></div>

      <div class="field-row two-col">
        <div>
          <label for="op-pitchSentDate">Pitch Sent Date</label>
          <input type="date" id="op-pitchSentDate" name="pitchSentDate" value="${val(initialData, "pitchSentDate")}" />
        </div>
        <div>
          <label for="op-landedDate">Landed Date</label>
          <input type="date" id="op-landedDate" name="landedDate" value="${val(initialData, "landedDate")}" />
        </div>
      </div>
      <p class="hint">Lead time is calculated automatically from these two dates — leave either blank and it'll show as "—" until both are filled in.</p>

      <div class="field-row">
        <label for="op-notes">Notes</label>
        <textarea id="op-notes" name="notes" rows="3" placeholder="Owner-only notes (e.g. journalist wants a follow-up, syndicated nationally)">${val(initialData, "notes")}</textarea>
      </div>

      <details class="optional-block" ${val(initialData, "campaign") || val(initialData, "sentiment") ? "open" : ""}>
        <summary>Additional (optional)</summary>
        <div class="field-row" style="margin-top:10px;">
          <label for="op-campaign">Campaign</label>
          <input type="text" id="op-campaign" name="campaign" placeholder="e.g. Techstars Launch" value="${val(initialData, "campaign")}" />
        </div>
        <div class="field-row" style="margin-bottom:0;">
          <label for="op-sentiment">Sentiment</label>
          <div style="display:flex; gap:6px;">
            <select id="op-sentiment" name="sentiment" style="flex:1;">
              <option value="" ${!val(initialData, "sentiment") ? "selected" : ""}>Not set</option>
              <option value="positive" ${val(initialData, "sentiment") === "positive" ? "selected" : ""}>Positive</option>
              <option value="neutral" ${val(initialData, "sentiment") === "neutral" ? "selected" : ""}>Neutral</option>
              <option value="negative" ${val(initialData, "sentiment") === "negative" ? "selected" : ""}>Negative</option>
            </select>
            ${onAnalyzeSentiment ? `<button type="button" class="btn-secondary" id="op-sentiment-analyze">Analyze</button>` : ""}
          </div>
          <p class="hint" style="margin-top:6px;">This is your own read on the coverage's tone${onAnalyzeSentiment ? " — or click Analyze for an AI suggestion, still editable after" : ", set by hand"}.</p>
          ${onAnalyzeSentiment ? `<div id="op-sentiment-result" style="margin-top:6px; font-size:0.8rem;"></div>` : ""}
        </div>
      </details>

      <div class="form-actions" style="display:flex; gap:10px;">
        <button type="submit" class="btn-primary">${isEdit ? "Save Changes" : "Add Placement"}</button>
        ${isEdit ? `<button type="button" class="btn-secondary" id="op-cancel">Cancel</button>` : ""}
      </div>
    </form>
  `;

  const form = container.querySelector("#owner-placement-form");
  const aveInput = container.querySelector("#op-aveValue");
  const publicationInput = container.querySelector("#op-publication");
  const fallbackEl = container.querySelector("#op-ave-fallback");

  // Set (and cleared) by the "save this rate for next time" checkbox inside
  // renderFallback below — read at submit time so the rate saved matches
  // whatever AVE value actually got submitted, not a snapshot from when
  // Calculate was clicked.
  let pendingRateSave = null;

  container.querySelector("#op-ave-calculate").addEventListener("click", () => {
    const outlet = publicationInput.value.trim();
    if (!outlet) {
      alert("Enter a Publication name first — AVE is looked up by outlet.");
      return;
    }
    pendingRateSave = null;
    const result = calculateAVE(outlet);
    if (result.found) {
      aveInput.value = result.value.toFixed(2);
      fallbackEl.innerHTML = `<p class="hint" style="margin:6px 0 10px; color:var(--color-teal);">✓ Calculated from a saved rate for "${escapeHtml(outlet)}".</p>`;
    } else {
      renderFallback(outlet);
    }
  });

  function renderFallback(outlet) {
    fallbackEl.innerHTML = `
      <div style="margin:10px 0 14px; padding:12px 14px; background:#fff8e6; border:1px solid #f0ddab; border-radius:var(--radius-md);">
        <p style="margin:0 0 8px; font-size:0.85rem; font-weight:600;">No saved rate for "${escapeHtml(
          outlet
        )}" — this never guesses. Enter a value in AVE ($) above by hand.</p>
        <details style="margin-bottom:10px;">
          <summary style="cursor:pointer; font-size:0.8rem;">General industry benchmarks (not a confirmed rate)</summary>
          <ul style="margin:8px 0 0; padding-left:18px; font-size:0.78rem; color:var(--text-secondary);">
            ${AVE_BENCHMARKS.map((b) => `<li>${escapeHtml(b.type)}: ${escapeHtml(b.range)}</li>`).join("")}
          </ul>
        </details>
        ${
          onResearchRate
            ? `<button type="button" class="btn-secondary" id="op-ave-research">Research this rate</button>
        <div id="op-ave-research-result" style="margin-top:8px; font-size:0.82rem;"></div>`
            : ""
        }
        <label style="display:flex; align-items:center; gap:6px; margin-top:10px; font-size:0.82rem;">
          <input type="checkbox" id="op-ave-save-rate" /> Save this rate for "${escapeHtml(outlet)}" for next time
        </label>
      </div>
    `;

    container.querySelector("#op-ave-save-rate").addEventListener("change", (e) => {
      pendingRateSave = e.target.checked ? { outlet } : null;
    });

    if (onResearchRate) {
      const researchBtn = container.querySelector("#op-ave-research");
      const resultEl = container.querySelector("#op-ave-research-result");
      researchBtn.addEventListener("click", async () => {
        researchBtn.disabled = true;
        resultEl.textContent = "Researching…";
        try {
          const result = await onResearchRate(outlet);
          if (result.available) {
            resultEl.innerHTML = `<strong>Perplexity suggestion</strong> (${escapeHtml(
              result.source || "not a confirmed rate"
            )}):<br>${escapeHtml(result.suggestion)}`;
          } else {
            resultEl.textContent = result.error || "Perplexity isn't connected yet — no PERPLEXITY_API_KEY set.";
          }
        } catch (err) {
          logError({ source: "AVE research (Perplexity)", message: err.message });
          resultEl.textContent = "Research request failed.";
        } finally {
          researchBtn.disabled = false;
        }
      });
    }
  }

  if (onSuggestHeadline) {
    const suggestBtn = container.querySelector("#op-headline-suggest");
    const suggestionsEl = container.querySelector("#op-headline-suggestions");
    suggestBtn.addEventListener("click", async () => {
      const headline = container.querySelector("#op-headline").value.trim();
      if (!headline) {
        alert("Enter a headline first — there's nothing to suggest phrasing for yet.");
        return;
      }
      suggestBtn.disabled = true;
      suggestionsEl.textContent = "Thinking…";
      const result = await onSuggestHeadline(headline);
      suggestBtn.disabled = false;
      suggestionsEl.innerHTML = result.ok
        ? `<strong>Suggested report copy</strong> (via ${escapeHtml(result.providerUsed)}, not the actual published headline):<br>${escapeHtml(result.text).replace(/\n/g, "<br>")}`
        : `⚠ ${escapeHtml(result.message)}`;
    });
  }

  if (onAnalyzeSentiment) {
    const analyzeBtn = container.querySelector("#op-sentiment-analyze");
    const resultEl = container.querySelector("#op-sentiment-result");
    analyzeBtn.addEventListener("click", async () => {
      const publication = container.querySelector("#op-publication").value.trim();
      const headline = container.querySelector("#op-headline").value.trim();
      if (!headline) {
        alert("Enter a headline first — there's nothing to analyze yet.");
        return;
      }
      analyzeBtn.disabled = true;
      resultEl.textContent = "Analyzing…";
      const result = await onAnalyzeSentiment({ publication, headline });
      analyzeBtn.disabled = false;
      if (!result.ok) {
        resultEl.textContent = `⚠ ${result.message}`;
        return;
      }
      const match = result.text.toLowerCase().match(/\b(positive|neutral|negative)\b/);
      if (match) {
        container.querySelector("#op-sentiment").value = match[1];
      }
      resultEl.innerHTML = `<strong>${match ? `Suggested: ${escapeHtml(match[1])}` : "Couldn't parse a clear classification"}</strong> (via ${escapeHtml(result.providerUsed)}, still editable above) — ${escapeHtml(result.text)}`;
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(form).entries());
    const succeeded = onSubmit(raw);
    if (succeeded) {
      if (pendingRateSave && raw.aveValue) {
        try {
          saveRate(pendingRateSave.outlet, raw.aveValue, 1);
        } catch (err) {
          logError({ source: "Outlet rates (saved from placement form)", message: err.message });
        }
      }
      if (!isEdit) form.reset();
    }
  });

  if (isEdit && onCancel) {
    container.querySelector("#op-cancel").addEventListener("click", onCancel);
  }
}
