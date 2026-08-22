// src/opportunitySchema.js
//
// Partnership/brand opportunity evaluator — standalone, linked to a client
// but deliberately NOT nested inside a phase. Per the coaching program
// spec's build recommendation: opportunities can show up at any point
// across the 90 days (or 6 weeks), not just during the Partnership Roadmap
// phase, so tying this to one phase would break the moment something came
// in outside that window — which the standing rule ("bring every incoming
// opportunity to Tenyse before responding") says is exactly when it needs
// to work.
//
// Every opportunity gets pressure-tested against the same five criteria
// from the kickoff deck before the client acts on it.

export const EVALUATION_CRITERIA = {
  audienceFit: "Audience Fit",
  brandValues: "Brand Values",
  credibility: "Credibility",
  revenuePotential: "Revenue Potential",
  visibilityValue: "Visibility Value",
};

export const EVALUATION_CRITERIA_HELP = {
  audienceFit: "Does their audience align with target partners/customers?",
  brandValues: "Does the company's history and values align with theirs?",
  credibility: "Does saying yes add to authority, or dilute it?",
  revenuePotential: "What's the actual opportunity — flat fee, revenue share, or gifting only?",
  visibilityValue: "Does this open a door to press, media, or other relationships?",
};

export const DECISION_STATUSES = ["pursuing", "pressure_testing", "declined"];

const REQUIRED_FIELDS = ["client", "title"];

function normalizeScores(raw) {
  const source = raw.scores || raw;
  const scores = {};
  for (const key of Object.keys(EVALUATION_CRITERIA)) {
    const n = Number(source[key]);
    // 1–5 scale, or null (not yet scored) — never a fabricated default
    // score just to fill the field.
    scores[key] = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  }
  return scores;
}

function normalizeFields(raw) {
  const missing = REQUIRED_FIELDS.filter((f) => !raw[f] || !String(raw[f]).trim());
  if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  return {
    client: raw.client.trim(),
    title: raw.title.trim(),
    description: raw.description?.trim() || "",
    scores: normalizeScores(raw),
    decisionStatus: DECISION_STATUSES.includes(raw.decisionStatus) ? raw.decisionStatus : "pressure_testing",
    writeUp: raw.writeUp?.trim() || "",
  };
}

export function createOpportunity(raw) {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...normalizeFields(raw) };
}

/** Keeps id/createdAt — every other field is editable as the evaluation develops. */
export function applyOpportunityEdit(existing, raw) {
  return { id: existing.id, createdAt: existing.createdAt, ...normalizeFields(raw) };
}

/** Average of whatever criteria have actually been scored — null if none have, never treating an unscored criterion as a 0. */
export function averageScore(opportunity) {
  const scored = Object.values(opportunity.scores || {}).filter((v) => v != null);
  if (!scored.length) return null;
  return Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10;
}
