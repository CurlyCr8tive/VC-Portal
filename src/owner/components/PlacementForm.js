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
import { estimateAVE, formatEstimateRange } from "../../aveEstimation.js";
import { findOutletTraffic } from "../../outletTrafficReference.js";
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

export function renderPlacementForm(
  container,
  {
    onSubmit,
    onCancel,
    initialData = null,
    onResearchRate,
    onSuggestHeadline,
    onAnalyzeSentiment,
    onFindPitchDate,
    knownClients = [],
    submitDisabledReason = "",
  }
) {
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
        <input type="text" id="op-client" name="client" list="op-client-list" placeholder="Client name" value="${val(initialData, "client")}" required />
        <datalist id="op-client-list">
          ${knownClients.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}
        </datalist>
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
          <div style="display:flex; gap:6px;">
            <input type="date" id="op-pitchSentDate" name="pitchSentDate" value="${val(initialData, "pitchSentDate")}" style="flex:1;" />
            ${onFindPitchDate ? `<button type="button" class="btn-secondary" id="op-gmail-search">Find in Gmail</button>` : ""}
          </div>
          <div id="op-gmail-search-result" style="margin-top:6px; font-size:0.82rem;"></div>
        </div>
        <div>
          <label for="op-landedDate">Landed Date</label>
          <input type="date" id="op-landedDate" name="landedDate" value="${val(initialData, "landedDate")}" />
        </div>
      </div>
      <p class="hint">Lead time is calculated automatically from these two dates unless you add a manual/sample override below.</p>

      <div class="field-row">
        <label for="op-notes">Notes</label>
        <textarea id="op-notes" name="notes" rows="3" placeholder="Owner-only notes (e.g. journalist wants a follow-up, syndicated nationally)">${val(initialData, "notes")}</textarea>
      </div>

      <details class="optional-block" ${val(initialData, "campaign") || val(initialData, "sentiment") || val(initialData, "audienceReach") || val(initialData, "leadTimeOverrideDays") ? "open" : ""}>
        <summary>Additional (optional)</summary>
        <div class="field-row two-col" style="margin-top:10px;">
          <div>
            <label for="op-leadTimeOverrideDays">Lead Time Override (days)</label>
            <input type="number" id="op-leadTimeOverrideDays" name="leadTimeOverrideDays" min="0" step="1" placeholder="e.g. 18" value="${val(initialData, "leadTimeOverrideDays")}" />
          </div>
          <div>
            <label for="op-leadTimeSource">Lead Time Source</label>
            <select id="op-leadTimeSource" name="leadTimeSource">
              ${["dates", "manual", "sample", "gmail", "unknown"]
                .map((source) => `<option value="${source}" ${val(initialData, "leadTimeSource") === source ? "selected" : ""}>${source}</option>`)
                .join("")}
            </select>
          </div>
        </div>
        <div class="field-row">
          <label for="op-leadTimeNotes">Lead Time Notes</label>
          <textarea id="op-leadTimeNotes" name="leadTimeNotes" rows="2" placeholder="Why this lead time is manual/sample, if applicable">${val(initialData, "leadTimeNotes")}</textarea>
        </div>
        <div class="field-row" style="margin-top:10px;">
          <label for="op-campaign">Campaign</label>
          <input type="text" id="op-campaign" name="campaign" placeholder="e.g. Techstars Launch" value="${val(initialData, "campaign")}" />
        </div>
        <div class="field-row">
          <label for="op-audienceReach">Audience Reach</label>
          <input type="number" id="op-audienceReach" name="audienceReach" min="0" step="1" placeholder="e.g. 1500000" value="${val(initialData, "audienceReach")}" />
          <p class="hint" style="margin-top:6px;">Leave blank unless you have a real reach figure for this specific placement — an unknown reach shouldn't be entered as 0.</p>
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
        <button type="submit" class="btn-primary" ${submitDisabledReason ? "disabled" : ""} title="${escapeHtml(submitDisabledReason)}">
          ${submitDisabledReason ? "Sign in to Save Placement" : isEdit ? "Save Changes" : "Add Placement"}
        </button>
        ${isEdit ? `<button type="button" class="btn-secondary" id="op-cancel">Cancel</button>` : ""}
      </div>
      ${submitDisabledReason ? `<p class="hint" style="margin:8px 0 0;">${escapeHtml(submitDisabledReason)}</p>` : ""}
    </form>
  `;

  const form = container.querySelector("#owner-placement-form");
  const aveInput = container.querySelector("#op-aveValue");
  const publicationInput = container.querySelector("#op-publication");
  const fallbackEl = container.querySelector("#op-ave-fallback");
  const gmailSearchBtn = container.querySelector("#op-gmail-search");
  const gmailSearchResult = container.querySelector("#op-gmail-search-result");

  if (gmailSearchBtn) {
    gmailSearchBtn.addEventListener("click", async () => {
      gmailSearchBtn.disabled = true;
      gmailSearchResult.textContent = "Searching Gmail...";
      try {
        const result = await onFindPitchDate({
          clientName: container.querySelector("#op-client").value,
          publication: publicationInput.value,
          headline: container.querySelector("#op-headline").value,
        });
        if (!result.ok) {
          gmailSearchResult.textContent = `Could not search Gmail: ${result.message}`;
        } else if (result.suggestedDate) {
          aveInput.form.querySelector("#op-pitchSentDate").value = result.suggestedDate;
          gmailSearchResult.textContent = `Suggested pitch date from Gmail: ${result.suggestedDate}. Review before saving.`;
        } else {
          gmailSearchResult.textContent = "No matching pitch email found in Gmail.";
        }
      } catch (err) {
        gmailSearchResult.textContent = `Could not search Gmail: ${err.message}`;
      } finally {
        gmailSearchBtn.disabled = false;
      }
    });
  }

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
    // No saved rate, but we may still have a sourced audience figure for
    // this outlet — in which case the two published industry formulas can
    // bracket a value. This is an ESTIMATE with its inputs shown, not a
    // rate: the owner still has to decide, and nothing is written to the
    // AVE field on her behalf.
    const traffic = findOutletTraffic(outlet);
    const estimate = traffic ? estimateAVE(traffic.value, traffic.metric) : null;
    const estimateBlock = estimate
      ? `<div style="margin:0 0 10px; padding:10px 12px; background:#fff; border:1px solid #e4d9bd; border-radius:var(--radius-sm);">
        <p style="margin:0 0 6px; font-size:0.85rem; font-weight:600;">Industry-formula estimate: ${escapeHtml(
             formatEstimateRange(estimate)
           )}</p>
           <p style="margin:0 0 6px; font-size:0.78rem; color:var(--text-secondary);">
             Muck Rack method ${escapeHtml(`$${Math.round(estimate.muckRack).toLocaleString("en-US")}`)} ·
             Agility PR method ${escapeHtml(`$${Math.round(estimate.agility).toLocaleString("en-US")}`)}.
             Review the range and choose the value that best fits this placement before saving.
           </p>
           <p style="margin:0; font-size:0.75rem; color:var(--text-secondary);">
             Based on ${escapeHtml(estimate.audience.toLocaleString("en-US"))}
             ${escapeHtml(estimate.audienceMetric === "monthly_visits" ? "monthly visits" : "monthly unique visitors")}
             — ${escapeHtml(traffic.source)}${traffic.sourceDate ? ` (${escapeHtml(traffic.sourceDate)})` : ""}.
             ${
               estimate.overstated
                 ? "<strong>Note:</strong> this estimate uses total visits because unique visitors are not available for this outlet."
                 : ""
             }
           </p>
           ${
             // No one-click fill when the input is the wrong metric. An
             // overstating figure shouldn't be one button away from a
             // client-facing number — she can still type it, but she has
             // to decide to. (Sanity check on how far off this can get:
             // the Muck Rack formula on Forbes' visits count returns
             // ~$665K for one placement, while Forbes charges ~$12,500
             // for a BrandVoice sponsored article covering the same
             // space.)
             estimate.overstated
               ? `<p style="margin:8px 0 0; font-size:0.75rem; color:var(--text-secondary);">Enter a final value manually after reviewing the estimate.</p>`
               : `<button type="button" class="btn-secondary" id="op-ave-use-estimate" style="margin-top:8px;">Use ${escapeHtml(
                   `$${Math.round(estimate.muckRack).toLocaleString("en-US")}`
                 )} (Muck Rack method)</button>`
           }
         </div>`
      : "";
    fallbackEl.innerHTML = `
      <div style="margin:10px 0 14px; padding:12px 14px; background:#fff8e6; border:1px solid #f0ddab; border-radius:var(--radius-md);">
        <p style="margin:0 0 8px; font-size:0.85rem; font-weight:600;">No saved rate for "${escapeHtml(outlet)}" yet. ${
          estimate
            ? "Review the estimate below, or enter a value in AVE ($) above by hand."
            : onResearchRate
              ? "Looking up an estimate from this outlet's published ad rates — review it before using it."
              : "Enter a value in AVE ($) above by hand."
        }</p>
        ${estimateBlock}
        <details style="margin-bottom:10px;">
          <summary style="cursor:pointer; font-size:0.8rem;">General industry benchmarks (not a confirmed rate)</summary>
          <ul style="margin:8px 0 0; padding-left:18px; font-size:0.78rem; color:var(--text-secondary);">
            ${AVE_BENCHMARKS.map((b) => `<li>${escapeHtml(b.type)}: ${escapeHtml(b.range)}</li>`).join("")}
          </ul>
          <p style="margin:10px 0 0; font-size:0.74rem; color:var(--text-secondary); line-height:1.5;">
            <strong>There is no industry standard for AVE.</strong> The Barcelona Principles (AMEC, V4.0) state that
            AVE measures the cost of media space, not the value of coverage, and advise against using it. The two
            PR platforms that still publish a formula disagree by about 11x on the same outlet, which is why
            estimates here are shown as a range. Figures are defensible as "the method Muck Rack and Agility PR
            publish" — not as an industry standard.
          </p>
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

    const useEstimateBtn = container.querySelector("#op-ave-use-estimate");
    if (useEstimateBtn) {
      // Fills the field; deliberately does NOT save or submit. The owner
      // still reviews the number and decides — an estimate that wrote
      // itself into a client-facing figure would be the same class of
      // problem as the unflagged duplicate.
      useEstimateBtn.addEventListener("click", () => {
        aveInput.value = estimate.muckRack.toFixed(2);
      });
    }

    if (onResearchRate) {
      const researchBtn = container.querySelector("#op-ave-research");
      const resultEl = container.querySelector("#op-ave-research-result");
      const runResearch = async () => {
        researchBtn.disabled = true;
        resultEl.textContent = "Researching…";
        try {
          const result = await onResearchRate(outlet);
          if (result.available) {
            resultEl.innerHTML = `<strong>Researched estimate</strong> (${escapeHtml(
              result.source || "not a confirmed rate"
            )}):<br>${escapeHtml(result.suggestion)}`;
          } else {
            resultEl.textContent = result.error || "Using the saved Demo Day estimate for this outlet.";
          }
        } catch (err) {
          logError({ source: "AVE research (Perplexity)", message: err.message });
          resultEl.textContent = "Using the saved Demo Day estimate for this outlet.";
        } finally {
          researchBtn.disabled = false;
        }
      };
      researchBtn.addEventListener("click", runResearch);

      // Run it automatically when there's nothing else to show. Clicking
      // "Calculate" is already the owner asking for a number — making her
      // click a second button to get one, under a panel that says "enter a
      // value by hand", read as though the agent had nothing to offer. It
      // does: for an outlet with no audience figure on file this path
      // returns an estimate grounded in the outlet's own published ad
      // rates. When a local estimate IS available it's shown instantly and
      // for free, so research stays on the button rather than firing an
      // API call nobody asked for.
      if (!estimate) runResearch();
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
      suggestionsEl.textContent = "Drafting suggested report copy...";
      const result = await onSuggestHeadline(headline);
      suggestBtn.disabled = false;
      suggestionsEl.innerHTML = result.ok
        ? `<strong>Suggested report copy</strong> (not the actual published headline):<br>${escapeHtml(result.text).replace(/\n/g, "<br>")}`
        : `${escapeHtml(result.message)}`;
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
        resultEl.textContent = "Use the sentiment dropdown above for this placement.";
        return;
      }
      const match = result.text.toLowerCase().match(/\b(positive|neutral|negative)\b/);
      if (match) {
        container.querySelector("#op-sentiment").value = match[1];
      }
      resultEl.innerHTML = `<strong>${match ? `Suggested: ${escapeHtml(match[1])}` : "Suggested classification"}</strong> (still editable above) — ${escapeHtml(result.text)}`;
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(form).entries());
    const succeeded = await onSubmit(raw);
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
