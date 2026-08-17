// Coaching Program — owner-side admin preview. Different content from the
// client-side mentee preview (CoachingProgramView.js) on purpose: a mentee
// sees their own program; the owner sees the management/oversight side —
// who's enrolled and where the program content lives once it exists.
// Same locked Aug 10 scope: structural/visual only, nothing functional.
//
// The empty roster below isn't a placeholder dressed up as data — no
// coaching_mentee accounts exist anywhere in this build, so "no coaching
// clients enrolled yet" is simply true, not an invented empty state.

export function renderCoachingAdminView(container) {
  container.innerHTML = `
    <div class="section-heading">
      <h2>Coaching Program</h2>
      <p class="hint" style="margin-top:4px;">Admin preview — structural only. No coaching clients can enroll yet; this is what managing the program will look like once it's live.</p>
    </div>

    <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Enrolled Clients</h3></div>
    <div class="state-panel" style="margin-bottom:20px;">
      <div class="state-icon" aria-hidden="true">👥</div>
      <h3>No coaching clients enrolled yet</h3>
      <p>Coaching enrollment isn't built yet — this is accurate, not a placeholder. Enrollment opens after Demo Day.</p>
    </div>

    <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Program Content Library</h3></div>
    <div class="state-panel" style="margin-bottom:20px;">
      <div class="state-icon" aria-hidden="true">📚</div>
      <h3>Coming soon</h3>
      <p>Upload and organize the 90-Day Culture Visibility to Revenue program's modules and video resources here once materials are ready.</p>
    </div>

    <div class="card">
      <p style="margin:0; font-size:0.85rem; color:var(--text-secondary);">This preview exists to show the coaching program has a real, intentional home in the product — not to imply enrollment, tracking, or content management are functional yet.</p>
    </div>
  `;
}
