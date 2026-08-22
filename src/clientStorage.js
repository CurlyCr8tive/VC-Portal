// Local persistence for real Client records — same pattern as
// campaignStorage.js/storage.js, a separate localStorage key since a
// client's profile info (status, engagement type, contact) is distinct
// from both its placements and its campaigns.

import { logError } from "./errorLog.js";

const STORAGE_KEY = "vc_clients_v1";

export function loadClients() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const message = "Corrupt client data in localStorage — starting fresh.";
    console.warn(message);
    logError({ source: "Clients storage", message });
    return [];
  }
}

function saveAll(clients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function addClient(client) {
  const all = loadClients();
  all.push(client);
  saveAll(all);
  return all;
}

export function updateClient(updatedClient) {
  const all = loadClients().map((c) => (c.id === updatedClient.id ? updatedClient : c));
  saveAll(all);
  return all;
}

export function deleteClient(id) {
  const all = loadClients().filter((c) => c.id !== id);
  saveAll(all);
  return all;
}

/** Case-insensitive exact-name lookup — same matching convention placements/campaigns already use for a client name. */
export function findClientByName(name) {
  const key = String(name || "").trim().toLowerCase();
  return loadClients().find((c) => c.name.trim().toLowerCase() === key) || null;
}
