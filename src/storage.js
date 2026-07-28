// Local persistence — localStorage for tonight's v1.
// Swap this module out for a real backend/API later without touching
// schema.js, calculations.js, or table.js — they only deal with plain objects.

const STORAGE_KEY = "vc_placements_v1";

export function loadPlacements() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("Corrupt placement data in localStorage — starting fresh.");
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
