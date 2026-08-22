// Local persistence for real coaching-program Phase records — same
// pattern as campaignStorage.js/clientStorage.js.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_coaching_phases_v1";

export function loadPhases() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const message = "Corrupt coaching phase data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Coaching phase storage", message });
    return [];
  }
}

function saveAll(phases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(phases));
}

export function addPhase(phase) {
  const all = loadPhases();
  all.push(phase);
  saveAll(all);
  return all;
}

export function updatePhase(updatedPhase) {
  const all = loadPhases().map((p) => (p.id === updatedPhase.id ? updatedPhase : p));
  saveAll(all);
  return all;
}

export function deletePhase(id) {
  const all = loadPhases().filter((p) => p.id !== id);
  saveAll(all);
  return all;
}

export function loadPhasesForClient(clientName) {
  return loadPhases()
    .filter((p) => p.client === clientName)
    .sort((a, b) => a.phaseNumber - b.phaseNumber);
}
