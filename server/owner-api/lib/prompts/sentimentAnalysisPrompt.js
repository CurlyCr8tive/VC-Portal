// server/owner-api/lib/prompts/sentimentAnalysisPrompt.js
//
// Fourth of five AI writing function prompts sharing the PRD's one-call-
// per-function pattern. The most concretely specified of the five — the
// output vocabulary already exists in the product (schema.js's
// SENTIMENT_OPTIONS: positive/neutral/negative), and "Tone & Sentiment" is
// confirmed as Tenyse's own real terminology (her Terminology Guide,
// referenced in the PRD), not an inferred label the way the report
// narrative distinction is.
//
// PRD requirement this backs: "Owner can view an AI-generated sentiment
// tag per placement, editable... Override capability still a reasonable
// default." So this is explicitly a SUGGESTION the owner can overrule, the
// same "never final without review" rule as the other four prompts here —
// schema.js's current manual sentiment field is exactly where this
// suggestion would land, still owner-editable after.
//
// NOT wired to an API call — same status as the other four prompts here.

export function buildSentimentAnalysisPrompt({ publication, headline, articleExcerpt }) {
  return `You are tagging the tone of a single press placement for ${publication}, to help (not replace) Verified Consulting's own read on the coverage.

Headline: "${headline}"
${articleExcerpt ? `Article excerpt: "${articleExcerpt}"` : "No article excerpt was provided — only the headline above."}

Classify the tone as exactly one of: positive, neutral, negative. Match Tenyse's own terminology — this is called "Tone & Sentiment," based on how the client is represented in the story, not just whether the coverage happened at all.

If the headline alone doesn't give you enough to judge confidently — no article excerpt was provided, or the headline is genuinely ambiguous about how the client is portrayed — say so directly and suggest "neutral" only as a placeholder, explicitly flagged as low-confidence, not as a confident read. Never force a confident-sounding positive or negative tag from insufficient text just to avoid saying "not enough information."

Respond with the classification and one sentence of reasoning tied to specific words or framing in the text above — not a generic justification.`;
}
