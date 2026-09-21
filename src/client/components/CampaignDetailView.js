import { escapeHtml } from "../utils.js";
import { leadTimeDaysForPlacement } from "../../calculations.js?v=20260919-report-builder";
import { demoAVEForPlacement } from "../../demoFallbacks.js";
import { renderPlacementsTable } from "./PressPlacementTable.js";

/**
 * Shared campaign detail screen — "click into a client's campaign: same
 * placements/AVE/progress/notes view, scoped to that client" per the PRD's
 * Navigation Hierarchy. Used by both dashboards; `showClient` controls
 * whether the client tag/column appears (owner: yes, client: no, since a
 * client is always looking at their own campaign already).
 */
export function renderCampaignDetail(
  container,
  { campaign, placements, notes, currentUser, onAddNote, onBack, showClient = false, onGenerateActivitySummary, onGeneratePitchSuggestions }
) {
  const milestones = campaign.milestones || [];
  const placementValues = placements.map((placement, index) => {
    const explicitValue = placement.ave ?? placement.aveValue;
    return {
      placement,
      value: explicitValue != null ? Number(explicitValue) || 0 : demoAVEForPlacement(placement, index),
      estimated: explicitValue == null,
    };
  });
  const totalValue = placementValues.reduce((sum, row) => sum + row.value, 0);
  const hasEstimatedValue = placementValues.some((row) => row.estimated && row.value > 0);
  const publishedPlacements = placements.filter((placement) => placement.status === "published" || placement.landedDate || placement.url).length;
  const leadTimes = placements.map(leadTimeDaysForPlacement).filter((days) => Number.isFinite(days) && days > 0);
  const avgLeadTime = leadTimes.length ? Math.round(leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length) : null;
  const topOutlets = [...new Set(placements.map((placement) => placement.publication).filter(Boolean))].slice(0, 3);
  const strongestPlacements = [...placementValues]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .filter(({ placement }) => placement.publication || placement.headline);
  const allProofPoints = placementValues
    .filter(({ placement }) => placement.publication || placement.headline)
    .sort((a, b) => b.value - a.value);
  const formatMoney = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value || 0);
  // Owner-only tools: onGenerateActivitySummary/onGeneratePitchSuggestions
  // are only ever passed from the owner dashboard (src/owner/app.js) —
  // client.html's call site doesn't pass them, so a client viewing their
  // own campaign never sees this section at all, same optional-callback
  // pattern the rest of this build uses (DashboardHeader's extraAction,
  // ClientsListCard's onInvite, etc.).
  const showAiTools = currentUser.role === "owner" && (onGenerateActivitySummary || onGeneratePitchSuggestions);

  container.innerHTML = `
    <button class="link-btn" id="campaign-detail-back" style="margin-bottom:10px;">&larr; Back to Campaigns</button>
    <div class="card" style="margin-bottom:20px;">
      ${showClient ? `<span class="campaign-client-tag">${escapeHtml(campaign.clientName || campaign.client || "")}</span>` : ""}
      <h2 style="color:var(--color-navy); margin:4px 0 8px;">${escapeHtml(campaign.name)}</h2>
      <div class="campaign-meta">
        <span>Started ${campaign.startDate ? escapeHtml(campaign.startDate) : "—"}</span>
        <span>Status: ${escapeHtml(campaign.status || "Not yet tracked")}</span>
        <span>${campaign.completedPlacements ?? 0} of ${campaign.totalPlacements ?? 0} placements completed</span>
      </div>
      ${
        milestones.length
          ? `<div style="margin-top:14px;">
               <p style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--text-secondary); margin:0 0 8px;">Milestones</p>
               ${milestones
                 .map(
                   (m) => `<div class="milestone-row"><span style="${m.done ? "text-decoration:line-through; opacity:0.65;" : ""}">${m.done ? "✅" : "⬜"} ${escapeHtml(m.text)}</span></div>`
                 )
                 .join("")}
             </div>`
          : ""
      }
    </div>

    <div class="section-heading"><h2>Placements</h2></div>
    <div class="card" id="campaign-detail-placements" style="margin-bottom:24px;"></div>

    ${
      showAiTools
        ? `<div class="section-heading"><h2>Campaign Value Workspace</h2></div>
    <div class="campaign-value-workspace">
      <div class="campaign-value-story-card">
        <p class="section-kicker">What Tenyse can show</p>
        <h3>${escapeHtml(campaign.name)} created ${formatMoney(totalValue)} in estimated publicity value.</h3>
        <p>
          This campaign has ${publishedPlacements} visible press ${publishedPlacements === 1 ? "win" : "wins"}
          ${avgLeadTime ? ` with an average ${avgLeadTime}-day path from pitch to placement.` : "."}
          ${topOutlets.length ? ` Key outlets include ${escapeHtml(topOutlets.join(", "))}.` : ""}
          ${hasEstimatedValue ? " Estimated value is shown where the source data gives reach but not a stored dollar amount." : ""}
        </p>
        <div class="campaign-value-metrics">
          <button type="button" class="mini-live-stat campaign-metric-button active" data-campaign-metric="value">
            <span>Estimated value</span>
            <strong>${formatMoney(totalValue)}</strong>
          </button>
          <button type="button" class="mini-live-stat campaign-metric-button" data-campaign-metric="placements">
            <span>Press wins</span>
            <strong>${publishedPlacements}</strong>
          </button>
          <button type="button" class="mini-live-stat campaign-metric-button" data-campaign-metric="lead-time">
            <span>Avg. lead time</span>
            <strong>${avgLeadTime ? `${avgLeadTime} days` : "Needs dates"}</strong>
          </button>
        </div>
        <div id="campaign-metric-detail" class="campaign-metric-detail" aria-live="polite"></div>
        ${
          strongestPlacements.length
            ? `<div class="campaign-proof-points">
          <span>Strongest proof points</span>
          <ul>
            ${strongestPlacements
              .map(
                ({ placement, value, estimated }) => `<li>
              <strong>${escapeHtml(placement.publication || "Placement")}</strong>
              ${placement.headline ? ` — ${escapeHtml(placement.headline)}` : ""}
              ${value ? ` (${formatMoney(value)}${estimated ? " est." : ""})` : ""}
            </li>`
              )
              .join("")}
          </ul>
        </div>`
            : ""
        }
      </div>
      ${
        onGenerateActivitySummary
          ? `<div class="campaign-work-card live-card" tabindex="0" data-live-tip="Draft a client-ready campaign update from the placements already tracked.">
        <p class="section-kicker">Client update draft</p>
        <h3>Turn the work into a client-ready progress update.</h3>
        <p class="hint">Summarize what happened, why it matters, and what Tenyse is moving next.</p>
        <button type="button" class="btn-secondary" id="campaign-activity-generate">Draft Client Update</button>
        <div id="campaign-activity-result" class="campaign-generated-output" aria-live="polite"></div>
        <div class="live-tip-panel" role="tooltip"><strong>Client update draft</strong><p>AI turns tracked campaign activity into editable client language. Tenyse still reviews before it becomes client-facing.</p><span>Click to generate the draft.</span></div>
      </div>`
          : ""
      }
      ${
        onGeneratePitchSuggestions
          ? `<div class="campaign-work-card live-card" tabindex="0" data-live-tip="Draft next outreach angles grounded in existing campaign proof points.">
        <p class="section-kicker">Next outreach angle</p>
        <h3>Use the strongest wins to shape the next media pitch.</h3>
        <p class="hint">Draft outlet-ready angles grounded in the campaign's existing proof points.</p>
        <div class="field-row" style="margin-bottom:8px;">
          <label for="campaign-pitch-outlet">Target outlet</label>
          <input type="text" id="campaign-pitch-outlet" placeholder="Optional, e.g. Eater NY" />
        </div>
        <button type="button" class="btn-secondary" id="campaign-pitch-generate">Draft Outreach Angles</button>
        <div id="campaign-pitch-result" class="campaign-generated-output" aria-live="polite"></div>
        <div class="live-tip-panel" role="tooltip"><strong>Next outreach angle</strong><p>AI uses the strongest existing wins to suggest next pitch angles without inventing placements.</p><span>Generate outlet-ready language.</span></div>
      </div>`
          : ""
      }
    </div>`
        : ""
    }

    <div class="section-heading"><h2>Notes</h2></div>
    <div class="card">
      <div id="campaign-detail-notes" style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
        ${
          notes.length === 0
            ? `<p class="hint" style="margin:0;">No notes yet on this campaign.</p>`
            : notes
                .map(
                  (n) => `
              <div style="border-left:2px solid var(--color-teal); padding-left:10px;">
                <p style="margin:0; font-size:0.85rem; font-weight:600;">${escapeHtml(n.authorName)} <span style="font-weight:400; color:var(--text-secondary);">(${escapeHtml(n.authorRole)}) · ${escapeHtml(n.createdAt.slice(0, 10))}</span></p>
                <p style="margin:2px 0 0; font-size:0.9rem;">${escapeHtml(n.body)}</p>
              </div>`
                )
                .join("")
        }
      </div>
      <form class="entry-form" id="campaign-note-form">
        <div class="field-row">
          <label for="campaign-note-body">Add a note</label>
          <textarea id="campaign-note-body" rows="2" placeholder="Ask a question or leave an update on this campaign…" required></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Post Note</button>
        </div>
      </form>
    </div>
  `;

  renderPlacementsTable(document.getElementById("campaign-detail-placements"), placements, { showClient });

  container.querySelector("#campaign-detail-back").addEventListener("click", onBack);
  wireCampaignMetricDetails();

  if (onGenerateActivitySummary) {
    const btn = container.querySelector("#campaign-activity-generate");
    const resultEl = container.querySelector("#campaign-activity-result");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      resultEl.textContent = "Drafting a client-ready update...";
      const result = await onGenerateActivitySummary({ campaign, placements, notes });
      btn.disabled = false;
      resultEl.innerHTML = result.ok
        ? `<strong>Suggested client update</strong><p>${escapeHtml(result.text).replace(/\n/g, "<br>")}</p>`
        : `<p>${escapeHtml(result.message)}</p>`;
    });
  }

  if (onGeneratePitchSuggestions) {
    const btn = container.querySelector("#campaign-pitch-generate");
    const resultEl = container.querySelector("#campaign-pitch-result");
    btn.addEventListener("click", async () => {
      const targetOutlet = container.querySelector("#campaign-pitch-outlet").value.trim();
      btn.disabled = true;
      resultEl.textContent = "Drafting outreach angles...";
      const result = await onGeneratePitchSuggestions({ campaign, placements, targetOutlet });
      btn.disabled = false;
      resultEl.innerHTML = result.ok
        ? `<strong>Suggested outreach angles</strong><p>${escapeHtml(result.text).replace(/\n/g, "<br>")}</p>`
        : `<p>${escapeHtml(result.message)}</p>`;
    });
  }

  const form = container.querySelector("#campaign-note-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = document.getElementById("campaign-note-body");
    await onAddNote(textarea.value, currentUser);
  });

  function wireCampaignMetricDetails() {
    const detailEl = container.querySelector("#campaign-metric-detail");
    const metricButtons = container.querySelectorAll("[data-campaign-metric]");
    if (!detailEl || !metricButtons.length) return;
    const details = {
      value: {
        title: "What feeds this value",
        body:
          totalValue > 0
            ? `${formatMoney(totalValue)} is calculated from the tracked placement value rows in this campaign. ${hasEstimatedValue ? "Some rows use estimated/demo-ready value because the source data does not include a confirmed per-outlet AVE." : "The value shown comes from saved placement AVE values."}`
            : "No placement value is saved for this campaign yet.",
        rows: allProofPoints.map(({ placement, value, estimated }) => `${placement.publication || "Placement"}${placement.headline ? ` — ${placement.headline}` : ""}: ${formatMoney(value)}${estimated ? " estimated" : ""}`),
      },
      placements: {
        title: "Which press wins count",
        body: `${publishedPlacements} placement${publishedPlacements === 1 ? "" : "s"} count because they have a published status, landed date, or source URL. This is what feeds the report and client update story.`,
        rows: placements
          .filter((placement) => placement.status === "published" || placement.landedDate || placement.url || placement.articleUrl)
          .map((placement) => `${placement.publication || "Outlet not named"}${placement.headline ? ` — ${placement.headline}` : ""}${placement.landedDate ? ` (${placement.landedDate})` : ""}`),
      },
      "lead-time": {
        title: "How lead time is calculated",
        body: avgLeadTime
          ? `${avgLeadTime} days is the average path from pitch date to landed date across placements where both dates are available.`
          : "Lead time needs both pitch and landed dates before it can be calculated.",
        rows: placements
          .map((placement) => {
            const days = leadTimeDaysForPlacement(placement);
            return Number.isFinite(days) && days > 0 ? `${placement.publication || "Placement"}: ${days} days` : null;
          })
          .filter(Boolean),
      },
    };
    const renderDetail = (key) => {
      const detail = details[key] || details.value;
      detailEl.innerHTML = `
        <strong>${escapeHtml(detail.title)}</strong>
        <p>${escapeHtml(detail.body)}</p>
        ${
          detail.rows.length
            ? `<ul>${detail.rows.slice(0, 6).map((row) => `<li>${escapeHtml(row)}</li>`).join("")}</ul>`
            : `<p class="hint">No source rows available yet.</p>`
        }
      `;
      metricButtons.forEach((button) => button.classList.toggle("active", button.dataset.campaignMetric === key));
    };
    metricButtons.forEach((button) => {
      button.addEventListener("click", () => renderDetail(button.dataset.campaignMetric));
    });
    renderDetail("value");
  }
}
