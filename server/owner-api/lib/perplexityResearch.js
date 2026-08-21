// server/owner-api/lib/perplexityResearch.js
//
// Separate from aiClient.js on purpose — this is a genuinely different job
// (real-time web research for one specific fact) from the five AI writing
// functions (grounded generation from data already on hand). Only ever
// used for the AVE Calculation Agent's manual-fallback path, per
// docs/ave-agent-details.md section 5: Tenyse's real methodology is asking
// an AI model directly for an estimate, no manual research first — this
// matches that exact workflow instead of inventing a different one.
//
// Deliberately NOT used by the Discovery Agent (server/owner-api/lib/
// newsSearch.js) — Discovery needs structured, enumerable article results
// (headline/url/date per mention) to populate individual review-queue
// rows; Perplexity would synthesize one answer about coverage instead of
// listing each mention, risking silently missing some. Right tool per job,
// not "use the same AI everywhere."
//
// Output is always a SUGGESTION, never auto-saved or auto-filled into
// outlet_rates/outletRatesStorage — matches the AVE agent's locked
// "never guess, never auto-default" rule (docs/ave-agent-details.md
// section 2) exactly. The owner reads it and decides whether to use it.

const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || "sonar";

/**
 * Asks Perplexity what a single press mention/feature in `outletName`
 * would typically cost as an equivalent ad placement. Returns
 * { available: false, suggestion: null } if PERPLEXITY_API_KEY isn't set
 * or the request fails — never throws, since this is an optional research
 * aid sitting next to a manual entry field, not a blocking step.
 */
export async function researchOutletRate(outletName) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { available: false, suggestion: null };
  }

  const trimmedName = String(outletName || "").trim();
  if (!trimmedName) {
    return { available: false, suggestion: null };
  }

  const prompt = `What would a single press mention or feature in "${trimmedName}" typically cost as an equivalent paid ad placement? Give a realistic dollar range if you can, with brief reasoning. If you don't have enough information about this specific outlet, say so plainly rather than guessing.`;

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      return { available: false, suggestion: null, error: body.error?.message || `Perplexity API error (${res.status})` };
    }
    const suggestion = body.choices?.[0]?.message?.content || "";
    if (!suggestion) {
      return { available: false, suggestion: null };
    }
    return { available: true, suggestion, source: "Perplexity research, not a confirmed rate" };
  } catch (err) {
    return { available: false, suggestion: null, error: err.message };
  }
}
