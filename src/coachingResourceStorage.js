// Local persistence for coaching resource/checklist items — same pattern
// as campaignStorage.js/clientStorage.js.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_coaching_resources_v1";

export function loadResources() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const message = "Corrupt coaching resource data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Coaching resource storage", message });
    return [];
  }
}

function saveAll(resources) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resources));
}

export function addResource(resource) {
  const all = loadResources();
  all.push(resource);
  saveAll(all);
  return all;
}

export function updateResource(updatedResource) {
  const all = loadResources().map((r) => (r.id === updatedResource.id ? updatedResource : r));
  saveAll(all);
  return all;
}

export function deleteResource(id) {
  const all = loadResources().filter((r) => r.id !== id);
  saveAll(all);
  return all;
}

export function loadResourcesForClient(clientName) {
  return loadResources().filter((r) => r.client === clientName);
}
