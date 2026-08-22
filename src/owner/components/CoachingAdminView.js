// Coaching Program — owner-side admin preview. Different content from the
// client-side mentee preview (CoachingProgramView.js) on purpose: a mentee
// sees their own program; the owner sees the management/oversight side —
// who's enrolled and where the program content lives once it exists.
//
// Enrollment itself is real now (a real Client record with
// engagementType "coaching"/"pr_and_coaching" — see src/clientSchema.js)
// even though the full VAAM phase/homework/opportunity-evaluator system
// described in the coaching program spec is deliberately still deferred,
// scoped as its own later build. Showing a real enrolled client here
// isn't jumping ahead of that scope — it's the same "real data, structural
// preview of what's not built yet" pattern this view already used before,
// just no longer showing an empty roster now that one is genuinely true.

import { escapeHtml } from "../../client/utils.js";

export function renderCoachingAdminView(container, { coachingClients = [] } = {}) {
  container.innerHTML = `
    <div class="section-heading">
      <h2>Coaching Program</h2>
      <p class="hint" style="margin-top:4px;">Enrollment below is real. The full 6-phase Visibility to Revenue program (phase tracker, homework/reflection prompts, partnership opportunity evaluator) is scoped but not yet built — this is what managing it will look like once it's live.</p>
    </div>

    <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Enrolled Clients</h3></div>
    ${
      coachingClients.length === 0
        ? `<div class="state-panel" style="margin-bottom:20px;">
      <div class="state-icon" aria-hidden="true">👥</div>
      <h3>No coaching clients enrolled yet</h3>
      <p>Add a client via Clients → Edit Info and set Engagement Type to Coaching to enroll them here.</p>
    </div>`
        : `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
      ${coachingClients
        .map(
          (c) => `
        <div class="card">
          <h3 style="margin:0 0 4px; color:var(--color-navy);">${escapeHtml(c.name)}</h3>
          ${c.industry ? `<p style="margin:0 0 6px; font-size:0.82rem; color:var(--text-secondary);">${escapeHtml(c.industry)}</p>` : ""}
          ${c.notes ? `<p style="margin:0; font-size:0.85rem;">${escapeHtml(c.notes)}</p>` : ""}
        </div>`
        )
        .join("")}
    </div>`
    }

    <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Program Content Library</h3></div>
    <div class="state-panel" style="margin-bottom:20px;">
      <div class="state-icon" aria-hidden="true">📚</div>
      <h3>Coming soon</h3>
      <p>Phase tracker, homework/reflection prompts, resource library, and the partnership opportunity evaluator — scoped, not yet built.</p>
    </div>

    <div class="card">
      <p style="margin:0; font-size:0.85rem; color:var(--text-secondary);">Enrollment is real; phase tracking, homework, and the opportunity evaluator are not — this view is honest about which half is which.</p>
    </div>
  `;
}
