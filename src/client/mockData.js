// Mock portal data — clearly not real data, not wired to auth or a database.
// Shaped to match the owner-side Placement schema (src/schema.js) so this can later
// be swapped for storage.getPlacements().filter(p => p.client === currentClient.name)
// without changing any component below.
//
// Two clients are included on purpose — not because the product needs two today,
// but so a client login actually changes every number on the page, and so the
// owner dashboard has more than one client to aggregate across. That's the
// cheapest way to prove client-scoping actually filters, rather than just
// asserting it does.
//
// This module is shared by both portals (src/client/app.js reads it scoped to
// one client; src/owner/app.js reads it aggregated across all clients) — it
// lives under src/client/ for historical reasons (it was built for the client
// portal first), not because it's client-only.

export const CLIENTS = [
  { id: "veganhood", name: "VeganHood", avatarInitials: "VH" },
  { id: "sunny-sparkling", name: "Sunny Sparkling Co.", avatarInitials: "SS" },
];

export const METRICS = {
  veganhood: {
    "30d": { totalAVE: 48200, totalPlacements: 6, avgLeadTime: 15, activeCampaigns: 2, aveDelta: 22, placementsDelta: 15, leadTimeDelta: -4 },
    "90d": { totalAVE: 89300, totalPlacements: 14, avgLeadTime: 18, activeCampaigns: 2, aveDelta: 30, placementsDelta: 20, leadTimeDelta: -2 },
    "1y": { totalAVE: 126500, totalPlacements: 22, avgLeadTime: 19, activeCampaigns: 2, aveDelta: 22, placementsDelta: 24, leadTimeDelta: -4 },
  },
  "sunny-sparkling": {
    "30d": { totalAVE: 9800, totalPlacements: 2, avgLeadTime: 24, activeCampaigns: 1, aveDelta: 8, placementsDelta: 0, leadTimeDelta: 3 },
    "90d": { totalAVE: 21500, totalPlacements: 5, avgLeadTime: 26, activeCampaigns: 1, aveDelta: 12, placementsDelta: 5, leadTimeDelta: 1 },
    "1y": { totalAVE: 34200, totalPlacements: 8, avgLeadTime: 27, activeCampaigns: 1, aveDelta: 12, placementsDelta: 8, leadTimeDelta: 1 },
  },
};

export const PLACEMENTS = {
  veganhood: [
    {
      publication: "Forbes",
      headline: "VeganHood Is Redefining Soul Food in NYC",
      articleUrl: "https://example.com/forbes-veganhood",
      publicationDate: "2026-04-08",
      aveValue: 18000,
      pitchSentDate: "2026-03-22",
      landedDate: "2026-04-08",
      campaign: "Spring Launch Campaign",
      status: "Published",
    },
    {
      publication: "PIX11 News",
      headline: "VeganHood Brings Flavor and Purpose to Harlem",
      articleUrl: "https://example.com/pix11-veganhood",
      publicationDate: "2026-04-05",
      aveValue: 6500,
      pitchSentDate: "2026-03-22",
      landedDate: "2026-04-05",
      campaign: "Spring Launch Campaign",
      status: "Published",
    },
    {
      publication: "American Express Essentials",
      headline: "3 NYC Vegan Restaurants to Know Right Now",
      articleUrl: "https://example.com/amex-veganhood",
      publicationDate: "2026-04-02",
      aveValue: 12000,
      pitchSentDate: "2026-03-14",
      landedDate: "2026-04-02",
      campaign: "Spring Launch Campaign",
      status: "Published",
    },
    {
      publication: "VegNews",
      headline: "VeganHood Expands Plant-Based Soul Food",
      articleUrl: "https://example.com/vegnews-veganhood",
      publicationDate: "2026-03-20",
      aveValue: 7500,
      pitchSentDate: "2026-03-04",
      landedDate: "2026-03-20",
      campaign: "Spring Launch Campaign",
      status: "Published",
    },
    {
      publication: "NBC (local affiliate)",
      headline: "Segment feature — in production",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "2026-04-10",
      landedDate: "",
      campaign: "Summer Media Push",
      status: "In Progress",
    },
  ],
  "sunny-sparkling": [
    {
      publication: "Gothamist",
      headline: "Sunny Sparkling Co. Bottles Up a Brooklyn Favorite",
      articleUrl: "https://example.com/gothamist-sunny",
      publicationDate: "2026-03-18",
      aveValue: 5200,
      pitchSentDate: "2026-02-20",
      landedDate: "2026-03-18",
      campaign: "Product Launch Buzz",
      status: "Published",
    },
    {
      publication: "New York Post",
      headline: "This Brooklyn Soda Is Going Viral",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "2026-04-01",
      landedDate: "",
      campaign: "Product Launch Buzz",
      status: "Awaiting Publication",
    },
  ],
};

export const CAMPAIGNS = {
  veganhood: [
    {
      id: "spring-launch",
      name: "Spring Launch Campaign",
      progressPercent: 75,
      startDate: "2026-03-01",
      completedPlacements: 12,
      totalPlacements: 16,
      avgLeadTime: 18,
      status: "Active",
    },
    {
      id: "summer-media-push",
      name: "Summer Media Push",
      progressPercent: 40,
      startDate: "2026-04-01",
      completedPlacements: 4,
      totalPlacements: 10,
      avgLeadTime: 21,
      status: "Active",
    },
  ],
  "sunny-sparkling": [
    {
      id: "product-launch-buzz",
      name: "Product Launch Buzz",
      progressPercent: 55,
      startDate: "2026-03-10",
      completedPlacements: 5,
      totalPlacements: 9,
      avgLeadTime: 27,
      status: "Active",
    },
  ],
};

export const CHART_SERIES = {
  veganhood: {
    "30d": [
      { label: "Wk 1", ave: 9500, placements: 1 },
      { label: "Wk 2", ave: 12000, placements: 1 },
      { label: "Wk 3", ave: 18500, placements: 2 },
      { label: "Wk 4", ave: 8200, placements: 2 },
    ],
    "90d": [
      { label: "Feb", ave: 14200, placements: 3 },
      { label: "Mar", ave: 31500, placements: 5 },
      { label: "Apr", ave: 43600, placements: 6 },
    ],
    "1y": [
      { label: "Q1", ave: 38000, placements: 7 },
      { label: "Q2", ave: 52500, placements: 9 },
      { label: "Q3", ave: 21000, placements: 4 },
      { label: "Q4", ave: 15000, placements: 2 },
    ],
  },
  "sunny-sparkling": {
    "30d": [
      { label: "Wk 1", ave: 0, placements: 0 },
      { label: "Wk 2", ave: 5200, placements: 1 },
      { label: "Wk 3", ave: 0, placements: 0 },
      { label: "Wk 4", ave: 4600, placements: 1 },
    ],
    "90d": [
      { label: "Feb", ave: 6000, placements: 1 },
      { label: "Mar", ave: 9800, placements: 2 },
      { label: "Apr", ave: 5700, placements: 2 },
    ],
    "1y": [
      { label: "Q1", ave: 14200, placements: 4 },
      { label: "Q2", ave: 12800, placements: 3 },
      { label: "Q3", ave: 4200, placements: 1 },
      { label: "Q4", ave: 3000, placements: 0 },
    ],
  },
};

export const INSIGHTS = {
  veganhood: {
    text: "Media exposure increased this month. Founder-focused stories and local television coverage generated the strongest visibility.",
    note: "Generated from the campaign data in this portal and reviewed by Verified Consulting.",
  },
  "sunny-sparkling": {
    text: "Coverage has been steady but concentrated in local outlets. Broadening to lifestyle and food-industry press could increase reach.",
    note: "Generated from the campaign data in this portal and reviewed by Verified Consulting.",
  },
};

// Owner-dashboard-only: an insight summarizing across every client, rather
// than one client's own coverage.
export const AGGREGATE_INSIGHT = {
  text: "Across all clients, media exposure is up this month. VeganHood's founder-led stories and Sunny Sparkling Co.'s local press both over-performed their outreach volume.",
  note: "Generated from the campaign data in this portal and reviewed by Verified Consulting.",
};

export const REPORTS = {
  veganhood: {
    title: "VeganHood — Spring Coverage Report",
    period: "March 1 – April 15, 2026",
    datePublished: "2026-04-16",
    viewUrl: "",
    pdfUrl: "",
  },
  "sunny-sparkling": {
    title: "Sunny Sparkling Co. — Q1 Coverage Report",
    period: "Jan 1 – Mar 31, 2026",
    datePublished: "2026-04-02",
    viewUrl: "",
    pdfUrl: "",
  },
};

export function getClientById(clientId) {
  return CLIENTS.find((c) => c.id === clientId) || CLIENTS[0];
}
