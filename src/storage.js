// Local persistence — localStorage for tonight's v1.
// Swap this module out for a real backend/API later without touching
// schema.js, calculations.js, or table.js — they only deal with plain objects.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_placements_v1";

export function loadPlacements() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const message = "Corrupt placement data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Placements storage", message });
    return [];
  }
}

function saveAll(placements) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
}

export function addPlacement(placement) {
  const all = loadPlacements();
  all.push(placement);
  saveAll(all);
  return all;
}

export function deletePlacement(id) {
  const all = loadPlacements().filter((p) => p.id !== id);
  saveAll(all);
  return all;
}

export function updatePlacement(updatedPlacement) {
  const all = loadPlacements().map((p) => (p.id === updatedPlacement.id ? updatedPlacement : p));
  saveAll(all);
  return all;
}
