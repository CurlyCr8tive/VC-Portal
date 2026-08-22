// Local persistence for real partnership Opportunity records — same
// pattern as campaignStorage.js/clientStorage.js.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_opportunities_v1";

export function loadOpportunities() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const message = "Corrupt opportunity data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Opportunity storage", message });
    return [];
  }
}

function saveAll(opportunities) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
}

export function addOpportunity(opportunity) {
  const all = loadOpportunities();
  all.push(opportunity);
  saveAll(all);
  return all;
}

export function updateOpportunity(updatedOpportunity) {
  const all = loadOpportunities().map((o) => (o.id === updatedOpportunity.id ? updatedOpportunity : o));
  saveAll(all);
  return all;
}

export function deleteOpportunity(id) {
  const all = loadOpportunities().filter((o) => o.id !== id);
  saveAll(all);
  return all;
}

export function loadOpportunitiesForClient(clientName) {
  return loadOpportunities()
    .filter((o) => o.client === clientName)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
