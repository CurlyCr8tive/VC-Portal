import { escapeHtml } from "../utils.js";
import { loadPhasesForClient, updatePhase } from "../../coachingPhaseStorage.js";
import { updateHomeworkStatus, respondToReflection } from "../../coachingPhaseSchema.js";
import { loadResourcesForClient } from "../../coachingResourceStorage.js";
import { createOpportunity } from "../../opportunitySchema.js";
import { addOpportunity, loadOpportunitiesForClient } from "../../opportunityStorage.js";
import { calculateCoachingProgress, OPPORTUNITY_STATUS_LABELS } from "../../coachingProgress.js";

// Coaching Program — mentee (client-side) view. Real once a real Client
// record (engagementType coaching/pr_and_coaching) has phases loaded for
// it — falls back to the honest "not yet started" placeholder otherwise,
// same as it always has, just no longer permanently static now that real
// data can exist.
//
// Interactive on purpose, not just a read-only mirror of the owner admin
// view: homework is the client's half of the relationship — marking an
// action item done, or answering a reflection prompt, is something only
// the client can actually do. The Opportunity Evaluator's SCORING stays
// owner-only (that's Tenyse's judgment call, not the client's), but the
// client can submit a new opportunity for her to evaluate — directly
// operationalizing the standing rule ("bring every opportunity to Tenyse
// before responding") as a real action instead of only a policy in a deck.

const STATUS_LABEL = { not_started: "Not Started", in_progress: "In Progress", complete: "Complete" };
const HOMEWORK_TYPE_LABEL = { action: "Action Item", reflection: "Reflection Prompt", standing: "Standing Instruction" };

export function renderCoachingProgramView(container, clientName) {
  let confirmation = "";

  render();

  function render() {
    const phases = clientName ? loadPhasesForClient(clientName) : [];
    if (phases.length === 0) {
      renderPlaceholder();
      return;
    }

    const resources = loadResourcesForClient(clientName);
    const opportunities = loadOpportunitiesForClient(clientName);
    const progress = calculateCoachingProgress({ phases, resources, opportunities });

    container.innerHTML = `
      <div class="section-heading">
        <h2>Coaching Program</h2>
        <p class="hint" style="margin-top:4px;">Visibility to Revenue — 90 days across six phases.</p>
      </div>

      ${confirmation ? `<div class="save-confirmation" role="status">${escapeHtml(confirmation)}</div>` : ""}

      ${progressSummaryHtml(progress)}

      <div class="section-heading" style="margin-top:20px;"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Phases</h3></div>
      <div id="cpv-phases" style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;"></div>

      <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Resource Library</h3></div>
      ${
        resources.filter((r) => r.kind === "resource").length === 0
          ? `<div class="state-panel" style="margin-bottom:20px;"><div class="state-icon" aria-hidden="true">📚</div><h3>Nothing here yet</h3><p>Guidance and resources from Tenyse will show up here.</p></div>`
          : `<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">
          ${resources
            .filter((r) => r.kind === "resource")
            .map(
              (r) => `<div class="review-queue-item"><div class="rq-info"><p class="rq-headline">${escapeHtml(r.title)}</p>${r.content ? `<p class="rq-meta">${escapeHtml(r.content)}</p>` : ""}</div></div>`
            )
            .join("")}
        </div>`
      }

      <div class="section-heading"><h3 style="margin:0; font-size:0.95rem; color:var(--color-navy);">Have an opportunity?</h3></div>
      <div class="card">
        <p class="hint" style="margin:0 0 10px;">Standing rule: bring every incoming opportunity to Tenyse before responding — don't evaluate it yourself first. Log it here and she'll review it.</p>
        <div class="entry-form">
          <div class="field-row">
            <label for="cpv-opp-title">What's the opportunity?</label>
            <input type="text" id="cpv-opp-title" placeholder="e.g. A brand wants to sponsor an event" />
          </div>
          <div class="field-row">
            <label for="cpv-opp-desc">Any details</label>
            <textarea id="cpv-opp-desc" rows="2" placeholder="What's being offered or asked, and by whom"></textarea>
          </div>
          <button type="button" class="btn-primary" id="cpv-opp-submit">Send to Tenyse</button>
          <span id="cpv-opp-result" style="margin-left:10px; font-size:0.85rem; color:var(--text-secondary);"></span>
        </div>
      </div>
    `;

    const phasesWrap = document.getElementById("cpv-phases");
    phases.forEach((phase) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = phaseCardHtml(phase);
      phasesWrap.appendChild(card);
      wirePhaseCard(card, phase);
    });

    document.getElementById("cpv-opp-submit").addEventListener("click", () => {
      const title = document.getElementById("cpv-opp-title").value;
      const description = document.getElementById("cpv-opp-desc").value;
      try {
        addOpportunity(createOpportunity({ client: clientName, title, description }));
        document.getElementById("cpv-opp-title").value = "";
        document.getElementById("cpv-opp-desc").value = "";
        document.getElementById("cpv-opp-result").textContent = "✓ Sent — Tenyse will review it before you respond to anyone.";
      } catch (err) {
        document.getElementById("cpv-opp-result").textContent = `⚠ ${err.message}`;
      }
    });
  }

  function progressSummaryHtml(progress) {
    const pipeline = Object.entries(progress.opportunities.pipeline)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${count} ${OPPORTUNITY_STATUS_LABELS[status]}`)
      .join(" · ");

    return `
      <section class="coaching-progress-summary" aria-label="Coaching progress summary">
        ${progressMetricHtml("Phase Progress", progress.phases)}
        ${progressMetricHtml("Homework", progress.homework)}
        ${progressMetricHtml("Missing Assets", progress.checklist)}
        <div class="coaching-progress-metric">
          <p class="metric-kicker">Opportunities</p>
          <p class="metric-value">${progress.opportunities.total}</p>
          <p class="metric-note">${pipeline || "No opportunities submitted yet"}</p>
        </div>
      </section>
    `;
  }

  function progressMetricHtml(label, metric) {
    const note = metric.total > 0 ? `${metric.complete} of ${metric.total} complete` : "Nothing assigned yet";
    return `
      <div class="coaching-progress-metric">
        <p class="metric-kicker">${escapeHtml(label)}</p>
        <p class="metric-value">${metric.percent}%</p>
        <div class="progress-track" aria-hidden="true"><div class="progress-fill" style="width:${metric.percent}%;"></div></div>
        <p class="metric-note">${escapeHtml(note)}</p>
      </div>
    `;
  }

  function phaseCardHtml(phase) {
    const homework = phase.homework || [];
    return `
      <p style="margin:0; font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Phase ${phase.phaseNumber} · Weeks ${escapeHtml(phase.weeks)}</p>
      <h3 style="margin:2px 0 6px; color:var(--color-navy);">${escapeHtml(phase.name)} — ${escapeHtml(STATUS_LABEL[phase.status])}</h3>
      ${phase.goal ? `<p style="margin:0 0 10px; font-size:0.9rem;">${escapeHtml(phase.goal)}</p>` : ""}
      ${
        homework.length === 0
          ? ""
          : `<div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">${homework.map((h) => homeworkHtml(phase.id, h)).join("")}</div>`
      }
    `;
  }

  function homeworkHtml(phaseId, h) {
    if (h.type === "reflection") {
      return `
        <div data-hw="${escapeHtml(h.id)}" data-phase="${escapeHtml(phaseId)}">
          <p style="margin:0 0 4px; font-size:0.85rem; font-weight:600;">${escapeHtml(h.text)}</p>
          ${
            h.status === "complete"
              ? `<p class="hint" style="margin:0; font-style:italic;">Your answer: "${escapeHtml(h.response)}"</p>`
              : `<textarea data-reflection-input rows="2" placeholder="Your answer…" style="width:100%;"></textarea>
                 <button type="button" class="btn-secondary" data-submit-reflection style="margin-top:6px;">Submit</button>`
          }
        </div>
      `;
    }
    return `
      <div data-hw="${escapeHtml(h.id)}" data-phase="${escapeHtml(phaseId)}" style="display:flex; align-items:center; gap:8px;">
        ${h.type !== "standing" ? `<input type="checkbox" data-action-checkbox ${h.status === "complete" ? "checked" : ""} />` : "📌"}
        <span style="font-size:0.85rem;">${escapeHtml(h.text)}${h.dueDate ? ` <span class="hint">(due ${escapeHtml(h.dueDate)})</span>` : ""}</span>
      </div>
    `;
  }

  function wirePhaseCard(card, phase) {
    card.querySelectorAll("[data-submit-reflection]").forEach((btn) => {
      const wrap = btn.closest("[data-hw]");
      btn.addEventListener("click", () => {
        const homeworkId = wrap.dataset.hw;
        const response = wrap.querySelector("[data-reflection-input]").value;
        if (!response.trim()) return;
        updatePhase(respondToReflection(phase, homeworkId, response));
        confirmation = "Reflection saved. Tenyse can review it from the coaching tracker.";
        render();
      });
    });
    card.querySelectorAll("[data-action-checkbox]").forEach((checkbox) => {
      const wrap = checkbox.closest("[data-hw]");
      checkbox.addEventListener("change", () => {
        const homeworkId = wrap.dataset.hw;
        updatePhase(updateHomeworkStatus(phase, homeworkId, checkbox.checked ? "complete" : "not_started"));
        confirmation = checkbox.checked ? "Homework marked complete." : "Homework moved back to not started.";
        render();
      });
    });
  }

  function renderPlaceholder() {
    container.innerHTML = `
      <div class="section-heading">
        <h2>Coaching Program</h2>
        <p class="hint" style="margin-top:4px;">This program hasn't started yet. Everything below is a preview, not live content.</p>
      </div>
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div>
            <p style="margin:0 0 4px; font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary);">Program format</p>
            <p style="margin:0; font-size:1.05rem; font-weight:600; color:var(--color-navy);">90-Day — Visibility to Revenue</p>
          </div>
          <span class="badge" style="background:var(--color-teal-tint); border:1px solid var(--color-teal); color:var(--color-teal); padding:4px 12px; border-radius:999px; font-size:0.78rem; font-weight:600;">Not yet started</span>
        </div>
      </div>
      <div class="state-panel">
        <div class="state-icon" aria-hidden="true">🎯</div>
        <h3>Your phases will appear here</h3>
        <p>Once your coaching program is set up, you'll see each phase, its goal, and your homework right here.</p>
      </div>
    `;
  }
}
