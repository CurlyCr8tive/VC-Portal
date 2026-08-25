// src/coachingPhaseSchema.js
//
// The 6-phase structure of Tenyse's real "Visibility to Revenue" coaching
// program — VAAM framework (Visibility, Authority, Alignment, Monetization),
// every phase tagged to one pillar. Standing rule across every engagement:
// "If it doesn't support your credibility, audience, partnerships, or
// revenue goals, we don't chase it."
//
// PROGRAM_TEMPLATE below is the STANDARD shape sent to every coaching
// client (this is the actual structure sent to Chef Garth) — a starting
// point for a new client's phases, not a locked structure. Per direct
// instruction: "the portal should let Tenyse write a new prompt or task
// per phase per client, not hardcode the Greyz Bistro homework as
// universal" — so weeks/VAAM/deliverables match the template exactly,
// but goal and homework are real per-client content Tenyse fills in
// herself, never templated.

export const VAAM_PILLARS = {
  V: "Visibility",
  A_AUTHORITY: "Authority",
  A_ALIGNMENT: "Alignment",
  M: "Monetization",
  // Not every program this app supports is VAAM-based (see
  // RAISE_LOCAL_TEMPLATE below) — a phase needs *some* tag to satisfy the
  // schema/DB check constraint, but forcing an unrelated program's phases
  // into "Visibility"/"Authority"/etc. would misrepresent a framework they
  // were never actually built against.
  NOT_APPLICABLE: "Not VAAM-based",
};

export const PHASE_STATUSES = ["not_started", "in_progress", "complete"];
export const HOMEWORK_TYPES = ["action", "reflection", "standing"];
export const HOMEWORK_STATUSES = ["not_started", "in_progress", "complete"];

export const PROGRAM_TEMPLATE = [
  { phaseNumber: 1, name: "Research & Discovery", weeks: "1–2", vaam: "V", defaultDeliverables: ["Asset collection", "Brand research", "Discovery call", "Kickoff call"] },
  { phaseNumber: 2, name: "Founder Positioning", weeks: "3–4", vaam: "A_AUTHORITY", defaultDeliverables: ["Positioning statement", "Brand narrative", "Messaging pillars", "Bio in three lengths"] },
  { phaseNumber: 3, name: "Media & Thought Leadership", weeks: "5–6", vaam: "A_AUTHORITY", defaultDeliverables: ["4–6 media angles", "Speaking topics", "Thought leadership content plan", "LinkedIn elevation"] },
  { phaseNumber: 4, name: "Partnership Roadmap", weeks: "7–8", vaam: "A_ALIGNMENT", defaultDeliverables: ["25–40 curated partnership targets across priority categories", "Outreach criteria"] },
  { phaseNumber: 5, name: "Outreach Assets", weeks: "9–10", vaam: "M", defaultDeliverables: ["One sheet", "Media pitch", "Partnership email template", "Influencer vetting criteria"] },
  { phaseNumber: 6, name: "Growth Roadmap Presentation", weeks: "11–12", vaam: "M", defaultDeliverables: ["End of sprint review", "Refinement", "Recommended next phase"] },
];

// Raise Local's actual 6-week curriculum hasn't been built or specified
// anywhere yet — this exists only so the Coaching Program page's template
// picker has a second real option to prove program choice actually works,
// per the request that added it, not because real week-by-week content
// exists to seed. Every deliverable list is deliberately empty and every
// goal says so explicitly, rather than inventing a plausible-sounding
// nonprofit-partnership curriculum with no source behind it. Replace this
// the moment Raise Local's real structure exists.
export const RAISE_LOCAL_TEMPLATE = [
  { phaseNumber: 1, name: "Week 1", weeks: "1", vaam: "NOT_APPLICABLE", defaultDeliverables: [] },
  { phaseNumber: 2, name: "Week 2", weeks: "2", vaam: "NOT_APPLICABLE", defaultDeliverables: [] },
  { phaseNumber: 3, name: "Week 3", weeks: "3", vaam: "NOT_APPLICABLE", defaultDeliverables: [] },
  { phaseNumber: 4, name: "Week 4", weeks: "4", vaam: "NOT_APPLICABLE", defaultDeliverables: [] },
  { phaseNumber: 5, name: "Week 5", weeks: "5", vaam: "NOT_APPLICABLE", defaultDeliverables: [] },
  { phaseNumber: 6, name: "Week 6", weeks: "6", vaam: "NOT_APPLICABLE", defaultDeliverables: [] },
];

const PLACEHOLDER_GOAL = "Content not yet defined — Raise Local's real curriculum hasn't been built. Replace this goal once it exists.";

/**
 * Every selectable structure a client's program can start from, shown as
 * the dropdown on the Coaching Program page's "load a template" step
 * (PhaseTrackerView.js). Keyed so the UI never has to hardcode template
 * shape assumptions — add a new program structure here and it appears in
 * the dropdown automatically.
 */
export const PROGRAM_TEMPLATES = {
  vaam_90day: {
    label: "Visibility to Revenue — 90 Day (VAAM)",
    phases: PROGRAM_TEMPLATE,
  },
  raise_local_6wk: {
    label: "Raise Local — 6 Week (structure only, content not yet built)",
    phases: RAISE_LOCAL_TEMPLATE,
    placeholderGoal: PLACEHOLDER_GOAL,
  },
};

const REQUIRED_PHASE_FIELDS = ["client", "phaseNumber", "name"];

function normalizePhaseFields(raw) {
  const missing = REQUIRED_PHASE_FIELDS.filter((f) => raw[f] === undefined || raw[f] === null || String(raw[f]).trim() === "");
  if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  return {
    client: raw.client.trim(),
    phaseNumber: Number(raw.phaseNumber),
    name: raw.name.trim(),
    weeks: raw.weeks?.trim() || "",
    vaam: VAAM_PILLARS[raw.vaam] ? raw.vaam : "V",
    status: PHASE_STATUSES.includes(raw.status) ? raw.status : "not_started",
    goal: raw.goal?.trim() || "",
    deliverables: Array.isArray(raw.deliverables)
      ? raw.deliverables.filter(Boolean)
      : String(raw.deliverables || "").split("\n").map((s) => s.trim()).filter(Boolean),
    notes: raw.notes?.trim() || "",
  };
}

export function createPhase(raw) {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), homework: [], ...normalizePhaseFields(raw) };
}

/** Keeps id/createdAt/homework — everything else is editable via the phase form. */
export function applyPhaseEdit(existing, raw) {
  return { id: existing.id, createdAt: existing.createdAt, homework: existing.homework || [], ...normalizePhaseFields(raw) };
}

/**
 * Homework belongs to a phase, not a standalone entity — action items and
 * reflection prompts share this shape, distinguished by `type`. A
 * "standing" item (e.g. "bring every opportunity to Tenyse before
 * responding") has no due date on purpose — it's always active, not tied
 * to a phase's own timeline the way action/reflection items are.
 */
export function addHomeworkItem(phase, { type, text, dueDate }) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("A homework item needs some text.");
  if (!HOMEWORK_TYPES.includes(type)) throw new Error(`type must be one of: ${HOMEWORK_TYPES.join(", ")}`);
  const item = {
    id: crypto.randomUUID(),
    type,
    text: trimmed,
    dueDate: type === "standing" ? "" : dueDate || "",
    status: "not_started",
    response: "", // reflection prompts' open-text answer; unused for action/standing items
    createdAt: new Date().toISOString(),
  };
  return { ...phase, homework: [...(phase.homework || []), item] };
}

export function updateHomeworkStatus(phase, homeworkId, status) {
  if (!HOMEWORK_STATUSES.includes(status)) throw new Error(`status must be one of: ${HOMEWORK_STATUSES.join(", ")}`);
  return { ...phase, homework: (phase.homework || []).map((h) => (h.id === homeworkId ? { ...h, status } : h)) };
}

/** A reflection prompt is answered, not just checked off — recording the response is what marks it complete. */
export function respondToReflection(phase, homeworkId, response) {
  return {
    ...phase,
    homework: (phase.homework || []).map((h) =>
      h.id === homeworkId ? { ...h, response: String(response || "").trim(), status: "complete" } : h
    ),
  };
}

export function removeHomeworkItem(phase, homeworkId) {
  return { ...phase, homework: (phase.homework || []).filter((h) => h.id !== homeworkId) };
}
