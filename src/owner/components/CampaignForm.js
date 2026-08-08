// Owner-side Add/Edit Campaign form. Same create-vs-edit pattern as
// PlacementForm.js: passing `initialData` pre-fills the fields, swaps the
// submit label to "Save Changes", and shows a Cancel button.

function val(initialData, field, fallback = "") {
  if (!initialData) return fallback;
  const v = initialData[field];
  return v == null ? fallback : v;
}

export function renderCampaignForm(container, { onSubmit, onCancel, initialData = null }) {
  const isEdit = Boolean(initialData);

  container.innerHTML = `
    <form class="entry-form" id="owner-campaign-form">
      <div class="field-row two-col">
        <div>
          <label for="oc-name">Campaign Name *</label>
          <input type="text" id="oc-name" name="name" placeholder="e.g. Fall Press Push" value="${val(initialData, "name")}" required />
        </div>
        <div>
          <label for="oc-client">Client *</label>
          <input type="text" id="oc-client" name="client" placeholder="Client name" value="${val(initialData, "client")}" required />
        </div>
      </div>
      <div class="field-row two-col">
        <div>
          <label for="oc-startDate">Start Date</label>
          <input type="date" id="oc-startDate" name="startDate" value="${val(initialData, "startDate")}" />
        </div>
        <div>
          <label for="oc-status">Status</label>
          <select id="oc-status" name="status">
            <option value="active" ${val(initialData, "status", "active") === "active" ? "selected" : ""}>Active</option>
            <option value="paused" ${val(initialData, "status") === "paused" ? "selected" : ""}>Paused</option>
            <option value="completed" ${val(initialData, "status") === "completed" ? "selected" : ""}>Completed</option>
          </select>
        </div>
      </div>
      <p class="hint">Use the same Client name you use on placements — that's how a campaign gets matched to its coverage.</p>
      <div class="form-actions" style="display:flex; gap:10px;">
        <button type="submit" class="btn-primary">${isEdit ? "Save Changes" : "Add Campaign"}</button>
        ${isEdit ? `<button type="button" class="btn-secondary" id="oc-cancel">Cancel</button>` : ""}
      </div>
    </form>
  `;

  const form = container.querySelector("#owner-campaign-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(form).entries());
    const succeeded = onSubmit(raw);
    if (succeeded && !isEdit) form.reset();
  });

  if (isEdit && onCancel) {
    container.querySelector("#oc-cancel").addEventListener("click", onCancel);
  }
}
