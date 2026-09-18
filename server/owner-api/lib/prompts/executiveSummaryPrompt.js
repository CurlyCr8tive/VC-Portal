// server/owner-api/lib/prompts/executiveSummaryPrompt.js
//
// Grounded in Tenyse's own confirmed structure and terminology — not
// generic PR-bot phrasing. Every number in {{}} comes from real placement
// data for this period; the model is explicitly forbidden from inventing
// figures not present in that data.
//
// First of five AI writing function prompts (executive summary, campaign
// activity summary, report narrative, sentiment analysis, language
// suggestions) that share the PRD's one-call-per-function pattern — the
// rest will live alongside this one in lib/prompts/ as they're built.
//
// NOT wired to an API call anywhere yet — no AI provider/model has been
// chosen (still an open decision) and no API client exists in this
// codebase. This function only builds a prompt string; nothing calls it.
// The existing manual entry path (src/summaryStorage.js's saveSummary,
// surfaced in owner/app.js's renderSummaryForm) remains the only way an
// approved summary actually gets created until that decision is made.

import { PLAIN_PROSE_RULES } from "./outputFormat.js";

export function buildExecutiveSummaryPrompt({ client, periodLabel, placements, totalAVE, totalReach, campaignContext, clientIndustry, notableDetails }) {
  return `You are drafting a press coverage executive summary for ${client}, covering ${periodLabel}.

Follow this exact structure, matching how Verified Consulting's real reports are written:
1. Problem — one sentence on the challenge or goal this period addressed (use: ${campaignContext})
2. Solution — one to two sentences on the strategic approach taken
3. Results — the bulk of the summary, built ONLY from the real data below

Use this exact terminology, not generic alternatives:
- "Publicity Value" (never "AVE" or "advertising value equivalence")
- "Audience Reach" or "Potential Reach"
- "Tone & Sentiment"

Real data for this period — use ONLY these numbers, never estimate or invent a figure not listed here:
- Total Publicity Value: ${totalAVE == null ? "not calculated yet — do not state or estimate a dollar figure" : totalAVE}
- Total Audience Reach: ${totalReach}
- Placements (${placements.length} total), with everything known about each:
${placements.map(p => `  • ${p.publication} — "${p.headline}"${p.publicationDate ? ` (published ${p.publicationDate})` : ""}${p.audienceReach != null ? `, audience reach ${p.audienceReach.toLocaleString()}` : ""}${p.aveValue != null ? `, publicity value $${p.aveValue.toLocaleString()}` : ""}${p.sentiment ? `, coverage tone ${p.sentiment}` : ""}`).join("\n")}
${clientIndustry ? `- Client's sector: ${clientIndustry}` : ""}
${notableDetails && notableDetails.length ? `- Specifics worth naming (real, drawn from the campaign record — use them, don't generalise past them):\n${notableDetails.map(d => `  • ${d}`).join("\n")}` : ""}

Tone: confident and results-forward, the way a strategist reports to a client who's paying for outcomes — not generic marketing copy.

Depth: this is the summary a client reads to understand what they got for their money, so be specific and substantial rather than brief. Name outlets, quote headline framing, and say what each placement did for the client's standing — reach into a particular audience, credibility with a particular readership, timing against a launch. Draw on every field above; a placement's tone, date and reach are all worth using where they say something. Aim for four to six paragraphs. Never pad with adjectives — if there is more real detail, use it; if there genuinely isn't, stop.

If any of the real data above is missing or zero, say so plainly rather than working around it — never smooth over a gap with vague language.
${PLAIN_PROSE_RULES}`;
}
