import { escapeHtml } from "../utils.js";
import { loadPhasesForClient, updatePhase } from "../../coachingPhaseStorage.js";
import { updateHomeworkStatus, respondToReflection } from "../../coachingPhaseSchema.js";
import { loadResourcesForClient } from "../../coachingResourceStorage.js";
import { createOpportunity } from "../../opportunitySchema.js";
import { addOpportunity, loadOpportunitiesForClient } from "../../opportunityStorage.js";
import { calculateCoachingProgress } from "../../coachingProgress.js";

const STATUS_LABEL = { not_started: "Not Started", in_progress: "In Progress", complete: "Complete" };
const HOMEWORK_TYPE_LABEL = { action: "Homework", reflection: "Reflection", standing: "Standing Rule" };

export function renderCoachingProgramView(container, clientName, opts = {}) {
  const { data = null, onNavigate = null, onHomeworkPatch = null, onOpportunitySubmit = null } = opts;
  let activeData = data;
  let confirmation = "";

  render();

  function getData() {
    const phases = activeData?.phases || (clientName ? loadPhasesForClient(clientName) : []);
    const resources = activeData?.resources || (clientName ? loadResourcesForClient(clientName) : []);
    const opportunities = activeData?.opportunities || (clientName ? loadOpportunitiesForClient(clientName) : []);
    return { phases, resources, opportunities };
  }

  function render() {
    const { phases, resources, opportunities } = getData();
    if (!phases.length) {
      renderPlaceholder();
      return;
    }

    const progress = calculateCoachingProgress({ phases, resources, opportunities });
    const currentPhase = currentPhaseFor(phases);
    const progressPercent = overallProgressPercent(phases, progress);
    const phaseHomework = homeworkForPhase(currentPhase).filter((item) => item.type !== "standing");
    const reflection = phaseHomework.find((item) => item.type === "reflection") || phases.flatMap((phase) => phase.homework || []).find((item) => item.type === "reflection");
    const actionHomework = phaseHomework.filter((item) => item.type !== "reflection").slice(0, 4);
    const checklist = resources.filter((resource) => resource.kind === "checklist");
    const resource = resources.find((item) => item.kind === "resource");

    container.innerHTML = `
      <section class="cp-page">
        <div class="cp-hero">
          <div>
            <h1>Coaching Program</h1>
            <h2>Visibility to Revenue — 90-Day Sprint</h2>
            <p>A focused, hands-on program to grow your visibility, authority, partnerships, and revenue.</p>
          </div>
          <div class="cp-program-meta">
            <span>Program: 90-Day VAAM</span>
            <p><strong>Start Date:</strong> Jul 6, 2026</p>
            <p><strong>Target End Date:</strong> Oct 4, 2026</p>
          </div>
          <blockquote>
            <span aria-hidden="true">“</span>
            <p>If it doesn't support your credibility, audience, partnerships, or revenue goals, we don't chase it.</p>
            <cite>— Tenyse Williams</cite>
          </blockquote>
        </div>

        ${confirmation ? `<div class="save-confirmation" role="status">${escapeHtml(confirmation)}</div>` : ""}

        <nav class="cp-tabs" aria-label="Coaching program sections">
          ${tabButton("Overview", "overview", true)}
          ${tabButton("Phases", "phases")}
          ${tabButton("Homework", "homework")}
          ${tabButton("Resources", "resources")}
          ${tabButton("Opportunities", "opportunities")}
          ${tabButton("Notes", "notes")}
        </nav>

        <div class="cp-layout">
          <main class="cp-main-column">
            ${progressCardHtml({ phases, progressPercent })}
            ${phaseFocusHtml({ phase: currentPhase, resource })}
            ${actionCardsHtml()}
          </main>
          <aside class="cp-side-column">
            ${coachCardHtml()}
            ${homeworkCardHtml(actionHomework)}
            ${reflectionCardHtml(reflection)}
            ${encouragementCardHtml()}
          </aside>
        </div>
      </section>
    `;

    wireTabs();
    wireHomework();
    wireReflection(reflection);
    wireProgramActions();
  }

  function tabButton(label, anchor, active = false) {
    return `<button type="button" class="${active ? "active" : ""}" data-cp-anchor="${anchor}"><span aria-hidden="true">${tabIcon(label)}</span>${escapeHtml(label)}</button>`;
  }

  function tabIcon(label) {
    const icons = { Overview: "⌂", Phases: "⌘", Homework: "▤", Resources: "▣", Opportunities: "⚖", Notes: "▥" };
    return icons[label] || "•";
  }

  function currentPhaseFor(phases) {
    return [...phases].reverse().find((phase) => phase.status === "in_progress") || phases.find((phase) => phase.status === "not_started") || phases[phases.length - 1];
  }

  function overallProgressPercent(phases, progress) {
    const reached = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    return phases.length ? Math.round((reached / phases.length) * 100) : progress.phases.percent;
  }

  function homeworkForPhase(phase) {
    return phase?.homework || [];
  }

  function shortDate(dateStr) {
    if (!dateStr) return "Due date pending";
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  function progressCardHtml({ phases, progressPercent }) {
    const reached = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    return `
      <article class="cp-card cp-progress-card live-card" id="cp-overview" tabindex="0" data-live-tip="${escapeHtml(`Overall roadmap progress is ${progressPercent}%, with ${reached} of ${phases.length} phases reached.`)}">
        <div class="cp-card-head">
          <div>
            <h3>Overall Progress</h3>
            <p><strong>${progressPercent}%</strong> complete</p>
          </div>
          <span>${reached} of ${phases.length} phases</span>
        </div>
        <div class="cp-progress-track"><span style="width:${progressPercent}%;"></span></div>
        <div class="cp-roadmap">
          ${phases
            .map((phase) => {
              const displayStatus =
                phase.phaseNumber < reached ? "complete" : phase.phaseNumber === reached ? "in_progress" : "not_started";
              return `
                <div class="cp-roadmap-step ${displayStatus}">
                  <span>${displayStatus === "complete" ? "✓" : escapeHtml(String(phase.phaseNumber))}</span>
                  <strong>${escapeHtml(String(phase.phaseNumber))}</strong>
                  <p>${escapeHtml(phase.name)}</p>
                </div>`;
            })
            .join("")}
        </div>
        <div class="live-tip-panel" role="tooltip"><strong>Overall Progress</strong><p>${escapeHtml(`This shows where the client is in the coaching roadmap: ${reached} of ${phases.length} phases reached.`)}</p><span>Use the roadmap to understand what is next.</span></div>
      </article>
    `;
  }

  function phaseFocusHtml({ phase, resource }) {
    const deliverables = phase.deliverables?.length
      ? phase.deliverables
      : ["One sheet (PDF)", "Media pitch (customized)", "Partnership email template", "Influencer vetting criteria"];
    return `
      <article class="cp-card cp-phase-card live-card" id="cp-phases" tabindex="0" data-live-tip="${escapeHtml(`Current focus: Phase ${phase.phaseNumber}, ${phase.name}.`) }">
        <div class="cp-phase-header">
          <div>
            <span class="cp-phase-pill">Phase ${escapeHtml(String(phase.phaseNumber))}</span>
            <span class="cp-weeks">Weeks ${escapeHtml(phase.weeks || String(phase.phaseNumber))}</span>
          </div>
          <span class="cp-status-dot">${escapeHtml(STATUS_LABEL[phase.status] || phase.status)}</span>
        </div>
        <div class="cp-phase-content">
          <div class="cp-phase-copy">
            <h3>${escapeHtml(phase.name)}</h3>
            <p>${escapeHtml(phase.goal || "Create the tools you need to confidently reach out, pitch, and start real conversations with partners, media, and collaborators.")}</p>
            <div class="cp-phase-list">
              <h4><span aria-hidden="true">◎</span> Goals</h4>
              <ul>
                <li>Finalize outreach-ready assets</li>
                <li>Prepare for partner and media conversations</li>
                <li>Get clear on influencer and brand fit criteria</li>
              </ul>
            </div>
            <div class="cp-phase-list">
              <h4><span aria-hidden="true">▤</span> Deliverables</h4>
              <ul class="cp-checklist">
                ${deliverables.map((item) => `<li><span aria-hidden="true"></span>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
          </div>
          <div class="cp-featured-resource" id="cp-resources">
            <h4>Featured Resource</h4>
            <div class="cp-video-card">
              <div class="cp-video-art"><span aria-hidden="true">▶</span></div>
              <div class="cp-video-bar"><span></span><em>0:00 / 12:34</em></div>
            </div>
            <h5>${escapeHtml(resource?.title || "How to Craft a Strong Partnership Pitch")}</h5>
            <p>${escapeHtml(resource?.content || "A step-by-step walkthrough on what to include, how to position your value, and common mistakes to avoid.")}</p>
          </div>
        </div>
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(phase.name)}</strong><p>${escapeHtml(phase.goal || "This phase focuses the client's next steps in the coaching program.")}</p><span>Review goals, deliverables, and featured resources.</span></div>
      </article>
    `;
  }

  function coachCardHtml() {
    return `
      <article class="cp-card cp-coach-card live-card" tabindex="0" data-live-tip="Message Tenyse from inside the coaching program context.">
        <h3>Your Coach</h3>
        <div class="cp-coach-row">
          <div class="cp-coach-avatar">TW</div>
          <div>
            <strong>Tenyse Williams</strong>
            <span>Founder, Verified Consulting</span>
            <button type="button" class="btn-secondary" data-cp-anchor="notes">Message Tenyse</button>
          </div>
        </div>
        <div class="live-tip-panel" role="tooltip"><strong>Your Coach</strong><p>Reach Tenyse from the same place where homework, resources, and opportunities live.</p><span>Message Tenyse</span></div>
      </article>
    `;
  }

  function homeworkCardHtml(items) {
    const visible = items.length
      ? items
      : [
          { id: "fallback-1", text: "Send feedback on partnership email template", dueDate: "", status: "not_started", type: "action" },
          { id: "fallback-2", text: "Compile 10 potential influencer partners", dueDate: "", status: "not_started", type: "action" },
        ];
    return `
      <article class="cp-card cp-homework-card live-card" id="cp-homework" tabindex="0" data-live-tip="${escapeHtml(`${visible.length} homework items are visible for this phase.`)}">
        <h3>This Phase's Homework</h3>
        <div class="cp-homework-list">
          ${visible
            .map(
              (item) => `
                <label class="cp-homework-row" data-hw-id="${escapeHtml(item.id)}">
                  <input type="checkbox" ${item.status === "complete" ? "checked" : ""} ${item.id.startsWith("fallback-") ? "disabled" : ""} />
                  <span>
                    <strong>${escapeHtml(item.text)}</strong>
                    <small>${escapeHtml(HOMEWORK_TYPE_LABEL[item.type] || "Homework")}</small>
                  </span>
                  <em>${escapeHtml(shortDate(item.dueDate))}</em>
                </label>`
            )
            .join("")}
        </div>
        <button type="button" class="new-client-btn" data-cp-anchor="homework">View All Homework</button>
        <div class="live-tip-panel" role="tooltip"><strong>This Phase's Homework</strong><p>${escapeHtml(`${visible.length} action items keep the client moving between coaching calls.`)}</p><span>Check items off as progress happens.</span></div>
      </article>
    `;
  }

  function reflectionCardHtml(reflection) {
    return `
      <article class="cp-card cp-reflection-card live-card" id="cp-notes" tabindex="0" data-live-tip="Reflection responses help Tenyse understand what the client is thinking between sessions.">
        <h3>Reflection Prompt</h3>
        <p><span aria-hidden="true">“</span>${escapeHtml(reflection?.text || "What's one partnership opportunity that excites you right now, and what would make it a good fit for your brand?")}</p>
        <textarea id="cp-reflection-response" rows="4" placeholder="Write your response here...">${escapeHtml(reflection?.response || "")}</textarea>
        <div class="cp-reflection-actions">
          <button type="button" class="new-client-btn" id="cp-save-reflection" ${reflection ? "" : "disabled"}>Save Response</button>
          <small>${reflection?.status === "complete" ? "Saved" : "Last saved: Sep 10, 2026"}</small>
        </div>
        <div class="live-tip-panel" role="tooltip"><strong>Reflection Prompt</strong><p>This captures client context and gives Tenyse better coaching notes before the next call.</p><span>Save a response for Tenyse to review.</span></div>
      </article>
    `;
  }

  function encouragementCardHtml() {
    return `
      <article class="cp-card cp-encouragement-card">
        <p>Progress isn't just about what you do — it's about who you become in the process.</p>
        <strong>Keep going.</strong>
      </article>
    `;
  }

  function actionCardsHtml() {
    return `
      <div class="cp-action-grid" id="cp-opportunities">
        ${actionCard("⚖", "Opportunity Evaluator", "New brand or event opportunity? Run it through your scoring card before you respond.", "Evaluate an Opportunity", "opportunity")}
        ${actionCard("▣", "Resource Library", "Access guides, templates, and past call materials anytime.", "Browse Resources", "resources")}
        ${actionCard("▤", "Missing Assets Checklist", "Track what's still needed for your brand and media outreach.", "View Checklist", "files")}
      </div>
    `;
  }

  function actionCard(icon, title, body, label, action) {
    return `
      <article class="cp-card cp-action-card live-card" tabindex="0" data-live-tip="${escapeHtml(body)}">
        <span aria-hidden="true">${icon}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <button type="button" class="btn-secondary" data-cp-action="${escapeHtml(action)}">${escapeHtml(label)}</button>
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p><span>${escapeHtml(label)}</span></div>
      </article>
    `;
  }

  function wireTabs() {
    container.querySelectorAll("[data-cp-anchor]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const anchor = btn.dataset.cpAnchor;
        container.querySelectorAll(".cp-tabs button").forEach((tab) => tab.classList.toggle("active", tab === btn));
        const target = container.querySelector(`#cp-${anchor}`);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function wireHomework() {
    const { phases } = getData();
    container.querySelectorAll(".cp-homework-row input:not(:disabled)").forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        const homeworkId = checkbox.closest("[data-hw-id]").dataset.hwId;
        const phase = phases.find((item) => (item.homework || []).some((homework) => homework.id === homeworkId));
        if (!phase) return;
        const status = checkbox.checked ? "complete" : "not_started";
        if (onHomeworkPatch) {
          const nextData = await onHomeworkPatch(homeworkId, { status });
          if (nextData) activeData = nextData;
        } else {
          updatePhase(updateHomeworkStatus(phase, homeworkId, status));
        }
        confirmation = checkbox.checked ? "Homework marked complete." : "Homework moved back to not started.";
        render();
      });
    });
  }

  function wireReflection(reflection) {
    const saveBtn = container.querySelector("#cp-save-reflection");
    if (!saveBtn || !reflection) return;
    saveBtn.addEventListener("click", async () => {
      const response = container.querySelector("#cp-reflection-response").value;
      if (!response.trim()) return;
      const { phases } = getData();
      const phase = phases.find((item) => (item.homework || []).some((homework) => homework.id === reflection.id));
      if (!phase) return;
      if (onHomeworkPatch) {
        const nextData = await onHomeworkPatch(reflection.id, { response, status: "complete" });
        if (nextData) activeData = nextData;
      } else {
        updatePhase(respondToReflection(phase, reflection.id, response));
      }
      confirmation = "Reflection saved. Tenyse can review it from the coaching tracker.";
      render();
    });
  }

  function wireProgramActions() {
    container.querySelector('[data-cp-action="opportunity"]')?.addEventListener("click", async () => {
      const title = "New opportunity submitted from client portal";
      const description = "Client asked Tenyse to review a new opportunity from the Coaching Program page.";
      try {
        if (onOpportunitySubmit) {
          const nextData = await onOpportunitySubmit({ title, description });
          if (nextData) activeData = nextData;
        } else {
          addOpportunity(createOpportunity({ client: clientName, title, description }));
        }
        confirmation = "Opportunity sent to Tenyse for review.";
        render();
      } catch (err) {
        confirmation = err.message;
        render();
      }
    });

    container.querySelector('[data-cp-action="resources"]')?.addEventListener("click", () => {
      if (onNavigate) onNavigate("resources");
    });

    container.querySelector('[data-cp-action="files"]')?.addEventListener("click", () => {
      if (onNavigate) onNavigate("files");
    });
  }

  function renderPlaceholder() {
    container.innerHTML = `
      <section class="cp-page">
        <div class="cp-hero">
          <div>
            <h1>Coaching Program</h1>
            <h2>Visibility to Revenue — 90-Day Sprint</h2>
            <p>Your coaching program will appear here once Tenyse adds your phases and next steps.</p>
          </div>
        </div>
        <div class="state-panel">
          <div class="state-icon" aria-hidden="true">◎</div>
          <h3>Your phases will appear here</h3>
          <p>Once your coaching program is set up, you'll see each phase, its goal, homework, resources, and opportunities right here.</p>
        </div>
      </section>
    `;
  }
}
