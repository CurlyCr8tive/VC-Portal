// server/owner-api/lib/prompts/campaignActivitySummaryPrompt.js
//
// Second of five AI writing function prompts sharing the PRD's one-call-
// per-function pattern (see executiveSummaryPrompt.js for the first).
//
// Distinct purpose from the executive summary: this is the "weekly,
// near-real-time visibility" the PRD requires ("distinct from the monthly
// report cycle"), not a period-end report. It answers the client JTBD
// named directly in the PRD — "When progress feels slow, I want to see
// the effort happening behind the scenes, so a quiet week doesn't feel
// like nothing is happening" — which is why the prompt below explicitly
// forbids padding a quiet period into false-sounding momentum.
//
import { PLAIN_PROSE_RULES } from "./outputFormat.js";

export function buildCampaignActivitySummaryPrompt({
  client,
  campaignName,
  sinceDate,
  newPlacements,
  placements,
  campaignValue,
  publishedPlacements,
  averageLeadTimeDays,
  proofPoints,
  milestonesUpdated,
  recentNotes,
}) {
  const safeNewPlacements = Array.isArray(newPlacements) ? newPlacements : [];
  const safePlacements = Array.isArray(placements) ? placements : [];
  const safeProofPoints = Array.isArray(proofPoints) ? proofPoints : [];
  const safeMilestonesUpdated = Array.isArray(milestonesUpdated) ? milestonesUpdated : [];
  const safeRecentNotes = Array.isArray(recentNotes) ? recentNotes : [];
  const valueLine = Number.isFinite(Number(campaignValue)) && Number(campaignValue) > 0 ? `$${Number(campaignValue).toLocaleString()}` : "not calculated";
  const leadTimeLine = Number.isFinite(Number(averageLeadTimeDays)) && Number(averageLeadTimeDays) > 0 ? `${Number(averageLeadTimeDays)} days` : "not available";
  const placementRows = safePlacements.length
    ? safePlacements
        .map((p) => {
          const value = Number(p.ave ?? p.aveValue ?? p.value);
          return `- ${p.publication || "Outlet not named"} — "${p.headline || "headline not on file"}"${p.publicationDate || p.landedDate ? ` (${p.publicationDate || p.landedDate})` : ""}${Number.isFinite(value) && value > 0 ? `, value $${value.toLocaleString()}` : ""}${p.audienceReach ? `, reach ${Number(p.audienceReach).toLocaleString()}` : ""}${p.sentiment ? `, ${p.sentiment} tone` : ""}${p.articleUrl ? "" : " (no source link on file)"}`;
        })
        .join("\n")
    : "- none on file";

  return `You are drafting a client-ready campaign progress update for ${client}'s "${campaignName}" campaign.

This is the Campaign Value Workspace writing agent. It should turn tracked campaign data into a useful client update Tenyse can review, edit, and send. The update should feel polished and specific, not like a generic status note.

Write 4 short sections with labels:
1. Quick read
2. What this shows
3. Proof points
4. Recommended next move

Use confident, client-facing language, but do not invent activity, outlets, dates, values, outreach, or results not shown in the data. If a detail is missing, frame it honestly.

Campaign metrics:
- Reporting window starts: ${sinceDate || "not specified"}
- Total publicity value / AVE: ${valueLine}
- Visible press wins: ${Number.isFinite(Number(publishedPlacements)) ? Number(publishedPlacements) : safePlacements.length}
- Average lead time: ${leadTimeLine}

All tracked placements for this campaign:
${placementRows}

Strongest proof points already surfaced in the UI:
${safeProofPoints.length ? safeProofPoints.map((point) => `- ${point}`).join("\n") : "- none listed"}

Recent period activity since ${sinceDate || "the selected start date"}:
- New placements landed (${safeNewPlacements.length}): ${safeNewPlacements.length ? safeNewPlacements.map(p => `${p.publication} — ${p.headline}`).join("; ") : "none"}
- Milestones updated (${safeMilestonesUpdated.length}): ${safeMilestonesUpdated.length ? safeMilestonesUpdated.map(m => m.text).join("; ") : "none"}
- Recent notes exchanged (${safeRecentNotes.length}): ${safeRecentNotes.length ? safeRecentNotes.map(n => `${n.authorRole}: "${n.body}"`).join(" | ") : "none"}

Do not say "nothing to report" if the campaign already has tracked placements/value/proof points. Instead, distinguish between "no new movement this week" and "the campaign already created measurable value."
${PLAIN_PROSE_RULES}`;
}
