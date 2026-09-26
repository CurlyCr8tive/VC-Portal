// Agent learning memory — owner feedback that future agent runs should
// consult before drafting, estimating, or surfacing another recommendation.
//
// This is not model training. It is structured product memory: corrections,
// approvals, rejections, overrides, and accepted outputs. The production
// mirror is db/migrations/2026-09-22-agent-learning-events.sql.

const STORAGE_KEY = "vc_agent_learning_events_v1";
const MAX_EVENTS = 500;

export const LEARNING_AGENT_TYPES = [
  "discovery",
  "ave",
  "writing",
  "campaign_outreach",
  "coaching",
  "canva_export",
  "security",
];

export const LEARNING_ACTIONS = [
  "approved",
  "rejected",
  "edited",
  "overridden",
  "saved",
  "copied",
  "exported",
  "failed",
  "confirmed",
];

function hasStorage() {
  return typeof localStorage !== "undefined";
}

function loadAll() {
  if (!hasStorage()) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("Corrupt agent learning memory in localStorage — starting fresh.");
    return [];
  }
}

function saveAll(events) {
  if (!hasStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function createAgentLearningEvent(raw = {}) {
  const agentType = String(raw.agentType || raw.agent_type || "").trim();
  const ownerAction = String(raw.ownerAction || raw.owner_action || "").trim();
  if (!agentType) throw new Error("Agent learning event requires agentType.");
  if (!ownerAction) throw new Error("Agent learning event requires ownerAction.");

  return {
    id: raw.id || `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    agentType,
    lessonType: String(raw.lessonType || raw.lesson_type || "feedback").trim(),
    ownerAction,
    clientName: String(raw.clientName || raw.client_name || "").trim(),
    entityType: String(raw.entityType || raw.entity_type || "").trim(),
    entityId: String(raw.entityId || raw.entity_id || "").trim(),
    inputSummary: String(raw.inputSummary || raw.input_summary || "").trim(),
    outputSummary: String(raw.outputSummary || raw.output_summary || "").trim(),
    lesson: String(raw.lesson || "").trim(),
    confidence: String(raw.confidence || "owner_feedback").trim(),
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export function recordAgentLearningEvent(raw) {
  const event = createAgentLearningEvent(raw);
  const all = loadAll();
  all.unshift(event);
  saveAll(all);
  return event;
}

export function listAgentLearningEvents({ agentType = "", clientName = "", ownerAction = "" } = {}) {
  return loadAll().filter((event) => {
    if (agentType && event.agentType !== agentType) return false;
    if (clientName && event.clientName !== clientName) return false;
    if (ownerAction && event.ownerAction !== ownerAction) return false;
    return true;
  });
}

export function clearAgentLearningEvents() {
  saveAll([]);
}

export function summarizeAgentLearning(events = []) {
  const summary = {
    discovery: { rejectedPatterns: [], confirmedPatterns: [] },
    ave: { savedRates: [], overrides: [] },
    writing: { approvedDrafts: [], editedDrafts: [] },
    campaign_outreach: { acceptedAngles: [], rejectedAngles: [] },
    coaching: { pursuedCriteria: [], declinedCriteria: [] },
    canva_export: { mappings: [] },
  };

  for (const event of events) {
    if (event.agentType === "discovery" && event.ownerAction === "rejected") {
      summary.discovery.rejectedPatterns.push(event.lesson || event.inputSummary);
    }
    if (event.agentType === "discovery" && ["confirmed", "approved"].includes(event.ownerAction)) {
      summary.discovery.confirmedPatterns.push(event.lesson || event.inputSummary);
    }
    if (event.agentType === "ave" && event.ownerAction === "saved") {
      summary.ave.savedRates.push(event.lesson || event.outputSummary);
    }
    if (event.agentType === "ave" && event.ownerAction === "overridden") {
      summary.ave.overrides.push(event.lesson || event.outputSummary);
    }
    if (event.agentType === "writing" && event.ownerAction === "approved") {
      summary.writing.approvedDrafts.push(event.lesson || event.outputSummary);
    }
    if (event.agentType === "writing" && event.ownerAction === "edited") {
      summary.writing.editedDrafts.push(event.lesson || event.outputSummary);
    }
    if (event.agentType === "campaign_outreach" && event.ownerAction === "approved") {
      summary.campaign_outreach.acceptedAngles.push(event.lesson || event.outputSummary);
    }
    if (event.agentType === "campaign_outreach" && event.ownerAction === "rejected") {
      summary.campaign_outreach.rejectedAngles.push(event.lesson || event.inputSummary);
    }
    if (event.agentType === "coaching" && event.ownerAction === "approved") {
      summary.coaching.pursuedCriteria.push(event.lesson || event.outputSummary);
    }
    if (event.agentType === "coaching" && event.ownerAction === "rejected") {
      summary.coaching.declinedCriteria.push(event.lesson || event.inputSummary);
    }
    if (event.agentType === "canva_export" && event.ownerAction === "exported") {
      summary.canva_export.mappings.push(event.lesson || event.outputSummary);
    }
  }

  return summary;
}
