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
// NOT wired to an API call — same status as executiveSummaryPrompt.js.

import { PLAIN_PROSE_RULES } from "./outputFormat.js";

export function buildCampaignActivitySummaryPrompt({ client, campaignName, sinceDate, newPlacements, milestonesUpdated, recentNotes }) {
  const safeNewPlacements = Array.isArray(newPlacements) ? newPlacements : [];
  const safeMilestonesUpdated = Array.isArray(milestonesUpdated) ? milestonesUpdated : [];
  const safeRecentNotes = Array.isArray(recentNotes) ? recentNotes : [];

  return `You are drafting a short campaign activity update for ${client}'s "${campaignName}" campaign, covering activity since ${sinceDate}.

This is NOT the period-end executive summary — it's a brief, near-real-time check-in so a quiet week never reads as silence. Keep it to 2-3 sentences, conversational, not report-formal.

Real activity since ${sinceDate} — use ONLY what's listed here, never invent outreach, pitches, or conversations not shown:
- New placements landed (${safeNewPlacements.length}): ${safeNewPlacements.length ? safeNewPlacements.map(p => `${p.publication} — ${p.headline}`).join("; ") : "none"}
- Milestones updated (${safeMilestonesUpdated.length}): ${safeMilestonesUpdated.length ? safeMilestonesUpdated.map(m => m.text).join("; ") : "none"}
- Recent notes exchanged (${safeRecentNotes.length}): ${safeRecentNotes.length ? safeRecentNotes.map(n => `${n.authorRole}: "${n.body}"`).join(" | ") : "none"}

If there is genuinely no activity to report, say that plainly and briefly — something like ongoing outreach continuing behind the scenes — rather than inventing progress or padding silence into false momentum. A quiet week described honestly is more trustworthy than a vague one dressed up as busy.
${PLAIN_PROSE_RULES}`;
}
