// server/owner-api/lib/aiClient.js
//
// Single entry point for the AI writing functions (executive summary,
// report narrative, campaign activity summary, sentiment analysis — see
// server/owner-api/lib/prompts/). Tries Claude first, falls back to GPT.
// Adding a third provider later means one more PROVIDERS entry, not a
// rewrite.
//
// Model ids are read from env (ANTHROPIC_MODEL / OPENAI_MODEL) with a
// documented default rather than hardcoded as fact — provider model ids
// change on their own release schedule, and getting this wrong should be a
// one-line env fix, not a code change. CONFIRM THE DEFAULT against each
// provider's current docs before the first real call.
//
// Never fabricates a response if every provider fails — throws a clear
// error listing what was tried, matching the "never fake success" rule
// used everywhere else in this build (empty error panel, 503s, etc.). The
// caller decides how to surface that to the owner.

const PROVIDERS = [
  { name: "claude", envKey: "ANTHROPIC_API_KEY", call: callClaude },
  { name: "gpt", envKey: "OPENAI_API_KEY", call: callGPT },
  // Add a third provider here later, e.g.:
  // { name: "gemini", envKey: "GOOGLE_AI_API_KEY", call: callGemini },
];

export const isAiClientConfigured = PROVIDERS.some((p) => Boolean(process.env[p.envKey]));

/**
 * Generates text from the first configured provider that succeeds, in
 * PROVIDERS order (Claude, then GPT). Returns { text, providerUsed } so
 * callers/logs can tell which provider actually answered.
 */
export async function generateText({ prompt, maxTokens = 2048 }) {
  const attempted = [];
  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      attempted.push(`${provider.name}: no ${provider.envKey} set`);
      continue;
    }
    try {
      const text = await provider.call({ prompt, maxTokens, apiKey });
      return { text, providerUsed: provider.name };
    } catch (err) {
      attempted.push(`${provider.name}: ${err.message}`);
    }
  }
  throw new Error(`All AI providers failed or unconfigured — ${attempted.join("; ")}`);
}

async function callClaude({ prompt, maxTokens, apiKey }) {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `Claude API error (${res.status})`);
  }
  // Extended thinking (on by default for some models) puts a `thinking`
  // block BEFORE the `text` block — content[0] is not reliably the answer.
  // Concatenating every text-type block (rather than taking just the
  // first) also covers the rare case of more than one.
  const text = (body.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  if (body.stop_reason === "max_tokens") {
    throw new Error(`Claude response was cut off at the ${maxTokens}-token limit before finishing — raise maxTokens and retry.`);
  }
  return text;
}

async function callGPT({ prompt, maxTokens, apiKey }) {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error?.message || `OpenAI API error (${res.status})`);
  }
  return body.choices?.[0]?.message?.content || "";
}
