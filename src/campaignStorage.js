// Local persistence for real Campaign records — same pattern as storage.js,
// a separate localStorage key since campaigns and placements are distinct
// entities now, not one derived from the other.

const STORAGE_KEY = "vc_campaigns_v1";

export function loadCampaigns() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn("Corrupt campaign data in localStorage — starting fresh.");
    return [];
  }
}

function saveAll(campaigns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
}

export function addCampaign(campaign) {
  const all = loadCampaigns();
  all.push(campaign);
  saveAll(all);
  return all;
}

export function updateCampaign(updatedCampaign) {
  const all = loadCampaigns().map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c));
  saveAll(all);
  return all;
}

export function deleteCampaign(id) {
  const all = loadCampaigns().filter((c) => c.id !== id);
  saveAll(all);
  return all;
}
