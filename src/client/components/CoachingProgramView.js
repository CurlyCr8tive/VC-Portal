import { escapeHtml } from "../utils.js";

// Coaching Program — mentee preview. Per the Aug 10 client-call scope
// decision (locked, superseding the PRD's earlier "do not fold into
// current build phases" note): a structural/visual-only prototype toggle,
// non-functional, ahead of the Aug 28 Feature-Complete gate. Every piece
// of actual content is honestly "Coming soon" — Tenyse hasn't sent her
// organized program materials yet, so nothing here invents curriculum
// that would look like it's already real.
//
// Lives inside the existing client portal (same mock/real toggle as every
// other view) rather than a real coaching_mentee login — no such account
// type is wired up anywhere, on purpose. This is a preview of what a
// mentee would eventually see, not a working feature.
//
// The "90-Day Culture Visibility to Revenue" name is the one confirmed
// detail from the PRD ("Coaching Program — future scope, add"). Module
// titles below are NOT real curriculum — deliberately generic numbered
// placeholders, not invented content dressed up to look confirmed.

const PLACEHOLDER_MODULE_COUNT = 6;

export function renderCoachingProgramView(container) {
  container.innerHTML = `
    <div class="section-heading">
      <h2>Coaching Program</h2>
      <p class="hint" style="margin-top:4px;">Preview — this program hasn't started yet. Everything below is a structural preview, not live content.</p>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <p style="margin:0 0 4px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Program format</p>
          <p style="margin:0; font-size:1.05rem; font-weight:600; color:var(--color-navy);">90-Day — Culture Visibility to Revenue</p>
        </div>
        <span class="badge" style="background:var(--color-teal-tint); border:1px solid var(--color-teal); color:var(--color-teal); padding:4px 12px; border-radius:999px; font-size:0.78rem; font-weight:600;">Not yet started</span>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <p style="margin:0 0 4px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Your progress</p>
      <div style="background:var(--color-teal-tint); border-radius:var(--radius-md); height:10px; margin:10px 0; overflow:hidden;">
        <div style="background:var(--color-teal); height:100%; width:0%;"></div>
      </div>
      <p class="hint" style="margin:0;">Start date: — (not yet set). Progress tracking begins once your program start date is confirmed.</p>
    </div>

    <div class="section-heading" style="margin-top:20px;"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Modules</h3></div>
    <div style="display:grid; gap:10px; margin-bottom:20px;">
      ${Array.from({ length: PLACEHOLDER_MODULE_COUNT }, (_, i) => renderModuleRow(i + 1)).join("")}
    </div>

    <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Milestones</h3></div>
    <div class="state-panel" style="margin-bottom:20px;">
      <div class="state-icon" aria-hidden="true">🎯</div>
      <h3>Coming soon</h3>
      <p>Your milestone tracker will appear here once the program begins.</p>
    </div>

    <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Video Resources</h3></div>
    <div class="state-panel">
      <div class="state-icon" aria-hidden="true">🎥</div>
      <h3>Coming soon</h3>
      <p>Video content will live here once it's ready.</p>
    </div>
  `;
}

function renderModuleRow(number) {
  return `
    <div class="review-queue-item">
      <div class="rq-info">
        <p class="rq-headline">${escapeHtml(`Module ${number}`)}</p>
        <p class="rq-meta">Coming soon</p>
      </div>
    </div>
  `;
}
