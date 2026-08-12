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

// Suggestions only — <datalist> never restricts input, so typing an outlet
// that isn't in either list still works fine. Combines the ones with a real
// reach figure and the larger known-but-unrated list from Tenyse's case
// studies, deduped and sorted for a predictable dropdown order.
const OUTLET_SUGGESTIONS = [...new Set([...OUTLET_REFERENCE.map((o) => o.name), ...KNOWN_OUTLETS_NO_RATE_YET])].sort();

function val(initialData, field) {
  if (!initialData) return "";
  const v = initialData[field];
  return v == null ? "" : v;
}

export function renderPlacementForm(container, { onSubmit, onCancel, initialData = null }) {
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
        <input type="text" id="op-headline" name="headline" placeholder="Title of the piece" value="${val(initialData, "headline")}" required />
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
          <input type="number" id="op-aveValue" name="aveValue" step="0.01" min="0" placeholder="0.00" value="${val(initialData, "aveValue")}" />
        </div>
      </div>

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
          <select id="op-sentiment" name="sentiment">
            <option value="" ${!val(initialData, "sentiment") ? "selected" : ""}>Not set</option>
            <option value="positive" ${val(initialData, "sentiment") === "positive" ? "selected" : ""}>Positive</option>
            <option value="neutral" ${val(initialData, "sentiment") === "neutral" ? "selected" : ""}>Neutral</option>
            <option value="negative" ${val(initialData, "sentiment") === "negative" ? "selected" : ""}>Negative</option>
          </select>
          <p class="hint" style="margin-top:6px;">No sentiment agent exists yet — this is your own read on the coverage's tone, set by hand.</p>
        </div>
      </details>

      <div class="form-actions" style="display:flex; gap:10px;">
        <button type="submit" class="btn-primary">${isEdit ? "Save Changes" : "Add Placement"}</button>
        ${isEdit ? `<button type="button" class="btn-secondary" id="op-cancel">Cancel</button>` : ""}
      </div>
    </form>
  `;

  const form = container.querySelector("#owner-placement-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(form).entries());
    const succeeded = onSubmit(raw);
    if (succeeded && !isEdit) form.reset();
  });

  if (isEdit && onCancel) {
    container.querySelector("#op-cancel").addEventListener("click", onCancel);
  }
}
