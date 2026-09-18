// server/owner-api/lib/prompts/reportNarrativePrompt.js
//
// Third of five AI writing function prompts sharing the PRD's one-call-
// per-function pattern.
//
// Distinct from the executive summary: the PRD names them as two separate
// prompt types without spelling out exactly how they differ beyond that —
// this is an inferred distinction, not a confirmed one, flagged here
// rather than presented as settled. Executive summary (see
// executiveSummaryPrompt.js) is the short, numbers-first card shown on the
// dashboard. This is the fuller campaign STORY meant for the actual report
// document/Canva hand-off — closer in register to how her real case
// studies narrate a campaign (e.g. "Verified Consulting effectively
// organized, created, and cultivated a strategic brand activation and
// partnership with Samsung USA...") than the terse Problem/Solution/
// Results card copy. Worth confirming this distinction directly with
// Tenyse once real report structure is seen, rather than trusting this
// inference indefinitely.
//
// NOT wired to an API call — same status as the other four prompts here.

import { PLAIN_PROSE_RULES } from "./outputFormat.js";

export function buildReportNarrativePrompt({ client, periodLabel, placements, campaignContext, notableDetails, totalAVE, totalReach, clientIndustry }) {
  const safePlacements = Array.isArray(placements) ? placements : [];
  const safeNotableDetails = Array.isArray(notableDetails) ? notableDetails : notableDetails ? [String(notableDetails)] : [];

  return `You are writing the fuller campaign narrative for ${client}'s report covering ${periodLabel} — this accompanies the report document itself, not the short dashboard summary card.

Write in the register of Verified Consulting's real case studies: scene-setting and specific, naming real partners, outlets and moments rather than generic PR language. Still grounded strictly in the real data below; never invent an event, partner, or detail not listed.

Depth: this is the narrative that carries the report document, so it should be genuinely substantial — five to seven paragraphs. Open by setting the scene: who the client is, what they were trying to move, and why this period mattered. Then walk the coverage in a considered order rather than listing it, giving the significant placements a few sentences each — what the outlet is, who reads it, what the piece actually said, and what landing it changed for the client. Use the dates to show how the story built. Where coverage tone is recorded, say what the reception was. Close on what the period adds up to.

If a figure is missing, say so plainly in the prose rather than working around it — a gap stated honestly reads better than a sentence bent to avoid it.

Campaign context: ${campaignContext}

Real placements this period (${safePlacements.length} total) — reference these specifically, don't generalize past them:
${safePlacements.map(p => `- ${p.publication}: "${p.headline}"${p.publicationDate ? ` (${p.publicationDate})` : ""}${p.audienceReach != null ? ` — reached ${p.audienceReach.toLocaleString()}` : ""}${p.sentiment ? `, ${p.sentiment} coverage` : ""}${p.articleUrl ? "" : " (no article link on file)"}`).join("\n")}

Campaign totals for this period:
- Publicity value: ${totalAVE == null ? "not calculated yet — do not state or estimate a dollar figure" : `$${Number(totalAVE).toLocaleString()}`}
- Audience reach: ${totalReach == null ? "not recorded for these placements — do not invent one" : `${Number(totalReach).toLocaleString()}`}
${clientIndustry ? `- Client's sector: ${clientIndustry}` : ""}

Notable details to weave in, if any (partnerships, events, named collaborators) — leave out entirely if none provided, do not invent a placeholder:
${safeNotableDetails.length ? safeNotableDetails.map(d => `- ${d}`).join("\n") : "(none provided)"}

Tone: confident storytelling, not a sales pitch — let the real placements and details carry the narrative rather than adjectives doing the work.
${PLAIN_PROSE_RULES}`;
}
