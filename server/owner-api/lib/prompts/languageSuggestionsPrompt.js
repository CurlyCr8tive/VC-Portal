// server/owner-api/lib/prompts/languageSuggestionsPrompt.js
//
// Fifth of five AI writing function prompts sharing the PRD's one-call-
// per-function pattern. Unlike the other four, this one was never
// specified anywhere in the PRD/docs beyond its name — built from a direct
// answer to "what should it suggest language for": both outreach pitch
// language (before a placement exists) and headline/report copy phrasing
// (for a placement that already does), depending on which one the owner
// is actually doing at the time. Two modes, one file, since they're the
// same underlying job — "suggest wording, never invent a fact" — applied
// at two different points in the workflow, not two unrelated agents.
//
// Same locked rule as every other writing function here: suggestions
// only, never auto-applied. The "pitch" mode has nothing to auto-apply TO
// (there's no pitch-tracking field in this build); the "headline" mode's
// caller is expected to show suggestions next to the existing Headline
// field, not overwrite it.

export function buildLanguageSuggestionsPrompt({ mode, client, ...rest }) {
  if (mode === "pitch") {
    const { targetOutlet, campaignAngle, existingCoverage = [] } = rest;
    return `You are suggesting outreach pitch language for ${client || "this client"}, targeting ${targetOutlet || "a journalist or outlet (not specified)"}.

Campaign angle: ${campaignAngle || "(not provided — suggest based on the coverage below if any exists, otherwise keep suggestions general)"}

Real coverage already secured for this client, usable as credibility/social proof — use ONLY what's listed here, never invent a placement not shown (${existingCoverage.length} total): ${
      existingCoverage.length ? existingCoverage.map((p) => `${p.publication} — ${p.headline}`).join("; ") : "none yet"
    }

Suggest 2-3 short pitch opening-line options a publicist could send cold or warm to ${targetOutlet || "a target outlet"} — specific to this campaign, not generic PR boilerplate ("I wanted to reach out about..."). If real coverage exists above, at most one option may reference it briefly as credibility — don't oversell it, and never invent a stat, quote, or detail not listed. If no coverage exists yet, all options should stand on the campaign angle alone.`;
  }

  if (mode === "headline") {
    const { headline, articleExcerpt } = rest;
    if (!headline) throw new Error('languageSuggestionsPrompt mode "headline" requires a headline.');
    return `You are suggesting alternate headline/copy phrasing for a press placement, to help polish how it's presented in a client report — this is a presentation option, not a claim about what the outlet actually published.

Current headline: "${headline}"
${articleExcerpt ? `Context: "${articleExcerpt}"` : "No article excerpt provided — work from the headline alone."}

Suggest 2-3 alternate phrasings for a client-facing report — punchier, clearer, or more consistent with Verified Consulting's confident tone. Stay factually equivalent to the original; never invent a detail, stat, or claim the original headline doesn't already support. Label these clearly as suggested report copy, not the actual published headline.`;
  }

  throw new Error(`buildLanguageSuggestionsPrompt requires mode: "pitch" or "headline" — got ${JSON.stringify(mode)}.`);
}
