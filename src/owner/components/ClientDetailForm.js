import { escapeHtml } from "../../client/utils.js";

const STATUS_LABELS = { active: "Active", past: "Past / Portfolio", unconfirmed: "Unconfirmed" };
const ENGAGEMENT_LABELS = { pr: "PR", coaching: "Coaching", pr_and_coaching: "PR + Coaching" };

function val(existing, field, fallback = "") {
  if (!existing) return fallback;
  const v = existing[field];
  return v == null ? fallback : v;
}

/**
 * Add/edit form for a client's profile info (status, engagement type,
 * contact, industry, engagement date) — the fields a real Client record
 * (src/clientSchema.js) carries beyond just placements. `initialData` null
 * means "create," otherwise "edit an existing client."
 *
 * Deliberately separate from PlacementForm.js's free-text Client field:
 * that field stays exactly as-is (no migration, matches this project's
 * "don't break what works" pattern) — this form is the NEW place profile
 * info lives, matched to a placement's client string by exact name.
 */
export function renderClientDetailForm(container, { onSubmit, onCancel, initialData = null }) {
  const isEdit = Boolean(initialData);

  container.innerHTML = `
    <form class="entry-form" id="client-detail-form">
      <div class="field-row">
        <label for="cd-name">Client Name *</label>
        <input type="text" id="cd-name" name="name" placeholder="Must match the Client field on placements exactly" value="${escapeHtml(val(initialData, "name"))}" required ${isEdit ? "readonly" : ""} />
        ${isEdit ? `<p class="hint" style="margin-top:4px;">Name isn't editable here — it's how placements/campaigns are matched to this client. Renaming would orphan their existing records.</p>` : ""}
      </div>

      <div class="field-row two-col">
        <div>
          <label for="cd-status">Status</label>
          <select id="cd-status" name="status">
            ${Object.entries(STATUS_LABELS)
              .map(([value, label]) => `<option value="${value}" ${val(initialData, "status", "unconfirmed") === value ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </div>
        <div>
          <label for="cd-engagementType">Engagement Type</label>
          <select id="cd-engagementType" name="engagementType">
            ${Object.entries(ENGAGEMENT_LABELS)
              .map(([value, label]) => `<option value="${value}" ${val(initialData, "engagementType", "pr") === value ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </div>
      </div>
      <p class="hint" style="margin:-4px 0 10px;">"Unconfirmed" is the honest default for a portfolio client Tenyse hasn't explicitly said is current or closed — leave it as-is rather than guessing.</p>

      <div class="field-row two-col">
        <div>
          <label for="cd-contactEmail">Contact Email</label>
          <input type="email" id="cd-contactEmail" name="contactEmail" placeholder="Not yet provided" value="${escapeHtml(val(initialData, "contactEmail"))}" />
        </div>
        <div>
          <label for="cd-engagementStartDate">Engagement Start Date</label>
          <input type="date" id="cd-engagementStartDate" name="engagementStartDate" value="${escapeHtml(val(initialData, "engagementStartDate"))}" />
        </div>
      </div>

      <div class="field-row">
        <label for="cd-industry">Industry</label>
        <input type="text" id="cd-industry" name="industry" placeholder="e.g. Food & Beverage, Culinary" value="${escapeHtml(val(initialData, "industry"))}" />
      </div>

      <div class="field-row">
        <label for="cd-notes">Notes</label>
        <textarea id="cd-notes" name="notes" rows="3" placeholder="Owner-only context — engagement details, standing rules, anything worth remembering">${escapeHtml(val(initialData, "notes"))}</textarea>
      </div>

      <div class="form-actions" style="display:flex; gap:10px;">
        <button type="submit" class="btn-primary">${isEdit ? "Save Client Info" : "Add Client"}</button>
        <button type="button" class="btn-secondary" id="cd-cancel">Cancel</button>
      </div>
    </form>
  `;

  const form = container.querySelector("#client-detail-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(form).entries());
    if (isEdit) raw.name = initialData.name; // name field is readonly in edit mode; FormData would still include it, but pin explicitly
    onSubmit(raw);
  });

  container.querySelector("#cd-cancel").addEventListener("click", onCancel);
}
