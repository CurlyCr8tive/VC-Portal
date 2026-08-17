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

export function buildReportNarrativePrompt({ client, periodLabel, placements, campaignContext, notableDetails }) {
  return `You are writing the fuller campaign narrative for ${client}'s report covering ${periodLabel} — this accompanies the report document itself, not the short dashboard summary card.

Write in the register of Verified Consulting's real case studies: scene-setting and specific, naming real partners/outlets/moments rather than generic PR language. Longer than an executive summary — aim for 2 full paragraphs. Still grounded strictly in real data below; never invent an event, partner, or detail not listed.

Campaign context: ${campaignContext}

Real placements this period (${placements.length} total) — reference these specifically, don't generalize past them:
${placements.map(p => `- ${p.publication}: "${p.headline}"${p.publicationDate ? ` (${p.publicationDate})` : ""}`).join("\n")}

Notable details to weave in, if any (partnerships, events, named collaborators) — leave out entirely if none provided, do not invent a placeholder:
${notableDetails && notableDetails.length ? notableDetails.map(d => `- ${d}`).join("\n") : "(none provided)"}

Tone: confident storytelling, not a sales pitch — let the real placements and details carry the narrative rather than adjectives doing the work.`;
}
