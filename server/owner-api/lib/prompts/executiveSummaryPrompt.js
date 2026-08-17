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

export function buildExecutiveSummaryPrompt({ client, periodLabel, placements, totalAVE, totalReach, campaignContext }) {
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
- Total Publicity Value: ${totalAVE}
- Total Audience Reach: ${totalReach}
- Placements (${placements.length} total): ${placements.map(p => `${p.publication} — ${p.headline}`).join("; ")}

Tone: confident and results-forward, the way a strategist reports to a client who's paying for outcomes — not generic marketing copy. Keep it to 3-4 short paragraphs.

If any of the real data above is missing or zero, say so plainly rather than working around it — never smooth over a gap with vague language.`;
}
