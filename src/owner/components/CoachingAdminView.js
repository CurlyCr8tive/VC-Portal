// Coaching Program — owner-side admin. Enrollment (a real Client record
// with engagementType "coaching"/"pr_and_coaching") plus the full program
// management tools: the 6-phase VAAM tracker, the partnership opportunity
// evaluator, and the resource/missing-assets library — one client's
// program at a time, selected via the tabs below.
//
// Manages its own local state (selected client, active tab) via a closure
// re-render, same pattern as OutletRatesView.js — this view's selection
// has no reason to survive a navigation away and back.

import { escapeHtml } from "../../client/utils.js";
import { renderPhaseTrackerView } from "./PhaseTrackerView.js?v=20260917-client-name-fix-1";
import { renderOpportunityEvaluator } from "./OpportunityEvaluator.js?v=20260918-info-popover";
import { renderCoachingResourceLibrary } from "./CoachingResourceLibrary.js?v=20260918-then-fix";
import { sectionInfoButton } from "./InfoPopover.js";
import { calculateCoachingProgress } from "../../coachingProgress.js";

const TABS = [
  { id: "phases", label: "Phase Tracker" },
  { id: "opportunities", label: "Opportunity Evaluator" },
  { id: "resources", label: "Resources & Checklist" },
];
const STATUS_LABEL = { not_started: "Not Started", in_progress: "In Progress", complete: "Complete" };
const HOMEWORK_TYPE_LABEL = { action: "Homework", reflection: "Reflection", standing: "Standing Rule" };

export function renderCoachingAdminView(
  container,
  {
    coachingClients = [],
    initialClient = null,
    coachingDataForClient = null,
    syncStatus = "local",
    syncMessage = "",
    onLoadTemplate = null,
    onSavePhase = null,
    onAddHomework = null,
    onSaveHomework = null,
    onRemoveHomework = null,
    onSaveOpportunity = null,
    onRemoveOpportunity = null,
    onSaveResource = null,
    onRemoveResource = null,
  } = {}
) {
  // Prefer initialClient (set when arriving here via a "View Coaching
  // Program" link from a specific client, e.g. ClientsListCard.js or the
  // Dashboard's master button) over just defaulting to the first enrolled
  // client — but only if it's actually a real enrolled client, not
  // whatever string happened to be passed in.
  let selectedClient = (initialClient && coachingClients.some((c) => c.name === initialClient) ? initialClient : coachingClients[0]?.name) || null;
  let activeTab = "phases";

  render();

  function render() {
    container.innerHTML = `
      <div class="section-heading">
        <h2>Coaching Program ${sectionInfoButton({ title: "Coaching Program", body: "Tenyse's paid coaching track for clients, separate from PR placement work. Each client moves through numbered phases (Research & Discovery, Founder Positioning, etc.) with homework, a call schedule, and an Opportunity Evaluator for scoring incoming brand/media asks against the standing rule: if it doesn't support credibility, audience, partnerships, or revenue, it doesn't get chased." })}</h2>
        <p class="hint" style="margin-top:4px;">Visibility to Revenue — VAAM framework (Visibility, Authority, Alignment, Monetization). Standing rule across every engagement: if it doesn't support credibility, audience, partnerships, or revenue goals, we don't chase it.</p>
      </div>
      ${
        syncStatus === "error"
          ? `<p class="hint" style="margin-bottom:12px;">Using demo-ready coaching data for this walkthrough.</p>`
          : syncStatus === "loading"
            ? `<p class="hint" style="margin-bottom:12px;">Loading coaching data...</p>`
            : ""
      }

      ${
        coachingClients.length === 0
          ? `<div class="state-panel" style="margin-bottom:20px;">
        <div class="state-icon" aria-hidden="true">👥</div>
        <h3>No coaching clients enrolled yet</h3>
        <p>Add a client via Clients → Edit Info and set Engagement Type to Coaching to enroll them here.</p>
      </div>`
          : ownerClientSwitcherHtml()
      }

      ${selectedClient ? programToolsHtml() : ""}
    `;

    container.querySelector("#coaching-client-select")?.addEventListener("change", (event) => {
      selectedClient = event.target.value;
      activeTab = "phases";
      render();
    });

    container.querySelectorAll("[data-select-client]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedClient = btn.dataset.selectClient;
        activeTab = "phases";
        render();
      });
    });

    if (selectedClient) wireTabs();
  }

  function ownerClientSwitcherHtml() {
    const selected = coachingClients.find((client) => client.name === selectedClient) || coachingClients[0];
    return `
      <section class="card owner-coaching-switcher">
        <div>
          <p class="eyebrow">Owner coaching workspace</p>
          <h3>Manage one client program at a time</h3>
          <p class="hint">Tenyse can switch clients here, review progress, update homework, track opportunities, and manage the resources/checklist the client sees.</p>
        </div>
        <div class="owner-coaching-select-block">
          <label for="coaching-client-select">Coaching client</label>
          <select id="coaching-client-select">
            ${coachingClients
              .map((client) => `<option value="${escapeHtml(client.name)}" ${client.name === selectedClient ? "selected" : ""}>${escapeHtml(client.name)}</option>`)
              .join("")}
          </select>
          ${selected?.industry ? `<p>${escapeHtml(selected.industry)}</p>` : ""}
        </div>
      </section>
    `;
  }

  function programToolsHtml() {
    const selected = coachingClients.find((client) => client.name === selectedClient);
    const clientData = coachingDataForClient ? coachingDataForClient(selectedClient) : null;
    const phases = clientData?.phases || [];
    const resources = clientData?.resources || [];
    const opportunities = clientData?.opportunities || [];
    const homework = phases.flatMap((phase) => (phase.homework || []).map((item) => ({ ...item, phaseName: phase.name, phaseNumber: phase.phaseNumber })));
    const openHomework = homework.filter((item) => item.type !== "standing" && item.status !== "complete");
    const completedHomework = homework.filter((item) => item.type !== "standing" && item.status === "complete");
    const currentPhase = currentPhaseFor(phases);
    const progress = calculateCoachingProgress({ phases, resources, opportunities });
    const progressPercent = overallProgressPercent(phases, progress);
    const reachedPhases = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    const nextHomework = openHomework[0];
    const phaseHomework = (currentPhase?.homework || []).filter((item) => item.type !== "standing");
    const phaseActions = phaseHomework.filter((item) => item.type !== "reflection").slice(0, 4);
    const reflection = phaseHomework.find((item) => item.type === "reflection") || homework.find((item) => item.type === "reflection");
    const featuredResource =
      resources.find((item) => item.title === "How to Craft a Strong Partnership Pitch") ||
      resources.find((item) => item.kind === "resource" && item.priority === "high") ||
      resources.find((item) => item.kind === "resource");
    const checklist = resources.filter((item) => item.kind === "checklist");
    const activeOpportunities = opportunities.filter((item) => item.decisionStatus !== "declined").length;

    return `
      <section class="owner-coaching-hero">
        <div>
          <p class="eyebrow">${escapeHtml(selectedClient)}'s program</p>
          <h3>Visibility to Revenue — 90-Day Sprint</h3>
          <p>${escapeHtml(selected?.notes || "Track the client’s phases, assignments, resources, incoming opportunities, and communication flow from one owner workspace.")}</p>
        </div>
        <div class="owner-coaching-hero-grid">
          <div><span>${phases.length ? `${reachedPhases}/${phases.length}` : "0/0"}</span><small>Phases reached</small></div>
          <div><span>${progress.homework.percent}%</span><small>Homework complete</small></div>
          <div><span>${resources.length}</span><small>Resources/checklist</small></div>
          <div><span>${opportunities.length}</span><small>Opportunities logged</small></div>
        </div>
      </section>

      <section class="owner-coaching-prototype" aria-label="Coaching program overview">
        <div class="owner-coaching-main">
          <article class="owner-coaching-progress-card live-card" tabindex="0" data-live-tip="${escapeHtml(`Overall roadmap progress is ${progressPercent}%, with ${reachedPhases} of ${phases.length} phases reached.`)}">
            <div class="owner-coaching-card-head">
              <div>
                <h3>Overall Progress</h3>
                <p><strong>${progressPercent}%</strong> complete</p>
              </div>
              <span>${reachedPhases} of ${phases.length} phases</span>
            </div>
            <div class="owner-coaching-progress-track"><span style="width:${progressPercent}%;"></span></div>
            <div class="owner-coaching-roadmap">
              ${phases.map((phase) => roadmapStepHtml(phase, currentPhase)).join("")}
            </div>
            <div class="live-tip-panel" role="tooltip"><strong>Overall Progress</strong><p>${escapeHtml(`This is the client-facing roadmap from the presentation: Visibility, Authority, Alignment, and Monetization across a 90-day sprint.`)}</p><span>Current phase: ${escapeHtml(currentPhase?.name || "Not started")}</span></div>
          </article>

          ${currentPhase ? phaseFocusHtml(currentPhase, featuredResource) : ""}

          <div class="owner-coaching-action-grid">
            ${ownerActionCard("Opportunity Evaluator", "New brand or event opportunity? Run it through the scoring card before the client responds.", "Evaluate an Opportunity", "opportunities")}
            ${ownerActionCard("Resource Library", "Access guides, templates, LinkedIn audit notes, and past call materials anytime.", "Browse Resources", "resources")}
            ${ownerActionCard("Missing Assets Checklist", "Track what's still needed for brand, media, and outreach work.", "View Checklist", "resources")}
          </div>
        </div>

        <aside class="owner-coaching-side">
          <article class="owner-coaching-side-card live-card" tabindex="0" data-live-tip="This keeps coach communication in the same place as homework, resources, and opportunities.">
            <h3>Your Coach</h3>
            <div class="owner-coach-row">
              <div class="owner-coach-avatar">TW</div>
              <div>
                <strong>Tenyse Williams</strong>
                <span>Founder, Verified Consulting</span>
              </div>
            </div>
            <p>Next call context: review outreach assets, partnership email feedback, and influencer partner list.</p>
            <div class="live-tip-panel" role="tooltip"><strong>Coach context</strong><p>Tenyse can prepare for the next coaching call from the client’s latest homework, resources, and opportunities.</p><span>Owner workspace</span></div>
          </article>

          <article class="owner-coaching-side-card live-card" tabindex="0" data-live-tip="${escapeHtml(`${phaseActions.length || openHomework.length} visible homework items keep the client moving between calls.`)}">
            <h3>This Phase's Homework</h3>
            <div class="owner-homework-list">
              ${(phaseActions.length ? phaseActions : openHomework.slice(0, 4)).map(homeworkRowHtml).join("") || `<p class="hint">No open homework for this phase.</p>`}
            </div>
            <button type="button" class="new-client-btn" data-tab-jump="phases">View All Homework</button>
            <div class="live-tip-panel" role="tooltip"><strong>Homework tracking</strong><p>Assignments and reflection prompts are phase-specific, visible to the client, and reviewable by Tenyse.</p><span>Open Phase Tracker</span></div>
          </article>

          <article class="owner-coaching-side-card live-card" tabindex="0" data-live-tip="Reflection responses give Tenyse qualitative context between sessions.">
            <h3>Reflection Prompt</h3>
            <p class="owner-reflection-prompt">“${escapeHtml(reflection?.text || "What's one partnership opportunity that excites you right now, and what would make it a good fit for your brand?")}”</p>
            <div class="owner-reflection-box">${escapeHtml(reflection?.response || "Awaiting client response...")}</div>
            <small>${reflection?.status === "complete" ? "Saved by client" : "Last saved: Sep 10, 2026"}</small>
            <div class="live-tip-panel" role="tooltip"><strong>Reflection Prompt</strong><p>The client can answer from their portal; Tenyse sees the response here with the rest of the program context.</p><span>Client portal + owner review</span></div>
          </article>

          <article class="owner-coaching-side-card owner-coaching-stats-card">
            <p>Progress is not just about what the client does; it is about who they become in the process.</p>
            <strong>Keep going.</strong>
            <dl>
              <div><dt>Checklist</dt><dd>${progress.checklist.complete}/${progress.checklist.total}</dd></div>
              <div><dt>Active opportunities</dt><dd>${activeOpportunities}</dd></div>
            </dl>
          </article>
        </aside>
      </section>

      <section class="owner-coaching-detail-grid">
        <article class="card live-card" tabindex="0" data-live-tip="${escapeHtml(currentPhase ? `Current phase: ${currentPhase.name}` : "Load a program template to begin tracking phases.")}">
          <p class="eyebrow">Current focus</p>
          <h3>${currentPhase ? `Phase ${escapeHtml(String(currentPhase.phaseNumber))}: ${escapeHtml(currentPhase.name)}` : "No phases loaded yet"}</h3>
          <p>${escapeHtml(currentPhase?.goal || "Load the VAAM program template, then customize the phase goals and deliverables for this client.")}</p>
          <div class="live-tip-panel" role="tooltip"><strong>Current focus</strong><p>${escapeHtml(currentPhase?.notes || "This gives Tenyse the coaching context before the next call.")}</p><span>Use Phase Tracker below to edit details.</span></div>
        </article>
        <article class="card live-card" tabindex="0" data-live-tip="${escapeHtml(nextHomework ? `Next assignment: ${nextHomework.text}` : "No open homework right now.")}">
          <p class="eyebrow">Homework & assignments</p>
          <h3>${openHomework.length} open · ${completedHomework.length} complete</h3>
          <p>${nextHomework ? `${nextHomework.text}${nextHomework.dueDate ? ` · due ${nextHomework.dueDate}` : ""}` : "Add homework in the Phase Tracker to make the between-call workflow visible."}</p>
          <div class="live-tip-panel" role="tooltip"><strong>Assignment tracking</strong><p>Homework belongs to phases, can be marked not started/in progress/complete, and reflection responses show up for Tenyse to review.</p><span>Open Phase Tracker → Homework.</span></div>
        </article>
        <article class="card live-card" tabindex="0" data-live-tip="Communication stays tied to coaching context: homework, reflections, opportunity review, and files/resources.">
          <p class="eyebrow">Communication flow</p>
          <h3>Coach follows up from the work</h3>
          <p>Client reflections, opportunity submissions, shared resources, and missing assets all live beside the roadmap so Tenyse can prepare for the next call without searching across tools.</p>
          <div class="live-tip-panel" role="tooltip"><strong>Communication flow</strong><p>This is the operating layer: what the client owes, what Tenyse reviews, and what needs follow-up.</p><span>Use Resources & Checklist plus Opportunity Evaluator.</span></div>
        </article>
      </section>

      <div class="coaching-admin-tabs">
        ${TABS.map(
          (t) => `<button type="button" class="${activeTab === t.id ? "btn-primary" : "btn-secondary"}" data-tab="${t.id}">${t.label}</button>`
        ).join("")}
      </div>
      <div id="coaching-tab-content"></div>
    `;
  }

  function currentPhaseFor(phases) {
    return [...phases].reverse().find((phase) => phase.status === "in_progress") || phases.find((phase) => phase.status === "not_started") || phases[phases.length - 1];
  }

  function overallProgressPercent(phases, progress) {
    const reached = phases.filter((phase) => phase.status === "complete" || phase.status === "in_progress").length;
    return phases.length ? Math.round((reached / phases.length) * 100) : progress.phases.percent;
  }

  function roadmapStepHtml(phase, currentPhase) {
    const displayStatus = phase.status === "complete" ? "complete" : phase.id === currentPhase?.id ? "in_progress" : "not_started";
    return `
      <div class="owner-roadmap-step ${displayStatus}">
        <span>${displayStatus === "complete" ? "✓" : escapeHtml(String(phase.phaseNumber))}</span>
        <strong>${escapeHtml(String(phase.phaseNumber))}</strong>
        <p>${escapeHtml(phase.name)}</p>
      </div>
    `;
  }

  function phaseFocusHtml(phase, resource) {
    const deliverables = phase.deliverables?.length
      ? phase.deliverables
      : ["One sheet (PDF)", "Media pitch (customized)", "Partnership email template", "Influencer vetting criteria"];
    const goals = phaseGoalBullets(phase);
    return `
      <article class="owner-phase-focus-card live-card" tabindex="0" data-live-tip="${escapeHtml(`Current focus: Phase ${phase.phaseNumber}, ${phase.name}.`)}">
        <div class="owner-phase-header">
          <div>
            <span class="owner-phase-pill">Phase ${escapeHtml(String(phase.phaseNumber))}</span>
            <span class="owner-phase-weeks">Weeks ${escapeHtml(phase.weeks || String(phase.phaseNumber))}</span>
          </div>
          <span class="owner-phase-status">${escapeHtml(STATUS_LABEL[phase.status] || phase.status)}</span>
        </div>
        <div class="owner-phase-content">
          <div>
            <h3>${escapeHtml(phase.name)}</h3>
            <p>${escapeHtml(phase.goal)}</p>
            <div class="owner-phase-list">
              <h4>Goals</h4>
              <ul>${goals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
            <div class="owner-phase-list">
              <h4>Deliverables</h4>
              <ul class="owner-deliverable-list">${deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </div>
          </div>
          <div class="owner-featured-resource">
            <h4>Featured Resource</h4>
            <div class="owner-video-card"><span aria-hidden="true">▶</span><div><b></b><em>0:00 / 12:34</em></div></div>
            <h5>${escapeHtml(resource?.title || "How to Craft a Strong Partnership Pitch")}</h5>
            <p>${escapeHtml(resource?.content || "A step-by-step walkthrough on what to include, how to position your value, and common mistakes to avoid.")}</p>
          </div>
        </div>
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(phase.name)}</strong><p>${escapeHtml(phase.notes || phase.goal)}</p><span>Review goals, deliverables, and featured resources.</span></div>
      </article>
    `;
  }

  function phaseGoalBullets(phase) {
    if (phase.phaseNumber === 5) return ["Finalize outreach-ready assets", "Prepare for partner and media conversations", "Get clear on influencer and brand fit criteria"];
    if (phase.phaseNumber === 4) return ["Use the standing rule before responding", "Score opportunities against credibility and revenue", "Prioritize warm partnership paths"];
    if (phase.phaseNumber === 3) return ["Translate authority into public language", "Shape media angles from real proof", "Make LinkedIn support the positioning"];
    return ["Clarify the client's position", "Capture decisions in one place", "Move from visibility toward opportunity"];
  }

  function homeworkRowHtml(item) {
    return `
      <div class="owner-homework-row ${item.status === "complete" ? "complete" : ""}">
        <span aria-hidden="true">${item.status === "complete" ? "✓" : ""}</span>
        <div>
          <strong>${escapeHtml(item.text)}</strong>
          <small>${escapeHtml(HOMEWORK_TYPE_LABEL[item.type] || "Homework")}</small>
        </div>
        <em>${escapeHtml(shortDate(item.dueDate))}</em>
      </div>
    `;
  }

  function shortDate(dateStr) {
    if (!dateStr) return "Due date pending";
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return `Due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  function ownerActionCard(title, body, label, tab) {
    return `
      <article class="owner-action-card live-card" tabindex="0" data-live-tip="${escapeHtml(body)}">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <button type="button" class="btn-secondary" data-tab-jump="${escapeHtml(tab)}">${escapeHtml(label)}</button>
        <div class="live-tip-panel" role="tooltip"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p><span>${escapeHtml(label)}</span></div>
      </article>
    `;
  }

  function wireTabs() {
    container.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    container.querySelectorAll("[data-tab-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tabJump;
        render();
        document.getElementById("coaching-tab-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const tabContent = document.getElementById("coaching-tab-content");
    if (!tabContent) return;
    const clientData = coachingDataForClient ? coachingDataForClient(selectedClient) : null;
    if (activeTab === "phases") {
      renderPhaseTrackerView(tabContent, selectedClient, {
        phases: clientData?.phases || null,
        onLoadTemplate,
        onSavePhase,
        onAddHomework,
        onSaveHomework,
        onRemoveHomework,
      });
    } else if (activeTab === "opportunities") {
      renderOpportunityEvaluator(tabContent, selectedClient, {
        opportunities: clientData?.opportunities || null,
        onSaveOpportunity,
        onRemoveOpportunity,
      });
    } else if (activeTab === "resources") {
      renderCoachingResourceLibrary(tabContent, selectedClient, {
        resources: clientData?.resources || null,
        onSaveResource,
        onRemoveResource,
      });
    }
  }
}
