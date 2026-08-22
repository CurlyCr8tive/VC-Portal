// src/coachingResourceSchema.js
//
// Two related tools from the coaching program spec, one schema: the
// resource library ("know-how" hub — reusable guidance the client can
// revisit, tagged by priority) and the missing-assets checklist (item,
// priority, completion status). Both are a titled, prioritized item tied
// to a client; the only real difference is a checklist item tracks
// completion and a resource item doesn't. One schema with a `kind` field
// avoids two near-identical files for what's really one list-item shape.

export const RESOURCE_KINDS = ["resource", "checklist"];
export const PRIORITY_LEVELS = ["high", "medium", "low"];

const REQUIRED_FIELDS = ["client", "title"];

function normalizeFields(raw) {
  const missing = REQUIRED_FIELDS.filter((f) => !raw[f] || !String(raw[f]).trim());
  if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);
  const kind = RESOURCE_KINDS.includes(raw.kind) ? raw.kind : "resource";
  return {
    client: raw.client.trim(),
    kind,
    title: raw.title.trim(),
    content: raw.content?.trim() || "",
    priority: PRIORITY_LEVELS.includes(raw.priority) ? raw.priority : "medium",
    // Resource items don't track completion at all (null, not false) —
    // "not done" would misrepresent something that was never a task.
    completed: kind === "checklist" ? Boolean(raw.completed) : null,
  };
}

export function createResource(raw) {
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...normalizeFields(raw) };
}

export function applyResourceEdit(existing, raw) {
  return { id: existing.id, createdAt: existing.createdAt, ...normalizeFields(raw) };
}

export function toggleResourceComplete(resource) {
  if (resource.kind !== "checklist") throw new Error("Only checklist items can be marked complete.");
  return { ...resource, completed: !resource.completed };
}
