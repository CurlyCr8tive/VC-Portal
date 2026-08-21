// Mock portal data — clearly not real data, not wired to auth or a database.
// Shaped to match the owner-side Placement schema (src/schema.js) so this can later
// be swapped for storage.getPlacements().filter(p => p.client === currentClient.name)
// without changing any component below.
//
// This module is shared by both portals (src/client/app.js reads it scoped to
// one client; src/owner/app.js reads it aggregated across all clients) — it
// lives under src/client/ for historical reasons (it was built for the client
// portal first), not because it's client-only.
//
// ---------------------------------------------------------------------------
// veganhood / vegan-dining-month / snap-co: REAL case-study numbers
// ---------------------------------------------------------------------------
// These three clients were re-seeded with real figures sourced from Tenyse's
// own past case-study materials (see docs/agent-notes.md and
// src/outletReference.js's CAMPAIGN_BENCHMARKS/OUTLET_REFERENCE, which are
// the actual source of truth this file's numbers are drawn from — nothing
// here is invented). They still render through the exact same "mock" data
// path as sunny-sparkling below — nothing about the real/mock TOGGLE
// changes; the UI's "Demo Data" badge (src/client/components/DashboardHeader.js)
// makes that visible on every page whenever dataSource === "mock", real
// numbers or not. When Tenyse's actual roster and Supabase come online, the
// real-data path (src/realDataSource.js) never reads this file at all — the
// two are structurally incapable of mixing.
//
// What "real" means here, precisely: the AVE/reach/outlet-count TOTALS are
// sourced. Individual per-article headlines/dates/URLs are NOT — her case
// studies report bundled campaign totals, not an outlet-by-outlet
// breakdown (with the partial exception of SNAP Co., see below), so this
// file does not invent fake individual placements to fill a table. Where a
// bundled total exists, one placement-like row represents it explicitly
// labeled as a campaign rollup, not a real individual article. Where no
// real figure exists for a given time bucket, the value is `null`
// ("Sample data pending" in spirit) rather than an interpolated or
// invented number — see MetricCard.js/getAggregateMetrics() in
// src/owner/app.js for how null is rendered/aggregated honestly (never as
// a false zero).
//
// Candlelit Care is deliberately NOT included: its case study reports the
// exact same $492,198 AVE / 14.2M reach figures as VeganHood's CPG launch
// despite a completely different outlet list — a near-certain template
// artifact (see docs/agent-notes.md), not two independently real numbers.
// Rather than seed a duplicate or a placeholder for a client that isn't in
// scope here, it's simply excluded.

export const CLIENTS = [
  { id: "veganhood", name: "VeganHood", avatarInitials: "VH" },
  { id: "vegan-dining-month", name: "VegansBaby — Vegan Dining Month", avatarInitials: "VB" },
  { id: "snap-co", name: "SNAP Co.", avatarInitials: "SC" },
  { id: "sunny-sparkling", name: "Sunny Sparkling Co.", avatarInitials: "SS" },
];

export const METRICS = {
  veganhood: {
    // Real: "CPG product line launch (30 days)" — $492,198 AVE, 8 outlets.
    "30d": { totalAVE: 492198, totalPlacements: 8, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    // No real 90-day-specific figure exists in the source material.
    "90d": { totalAVE: null, totalPlacements: null, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    // Real, but NOT a strict 1-year figure: this is VeganHood's full
    // lifetime/cumulative total ($18,000,000 AVE, 50 outlets) as of the
    // case study's publish date, placed in the "1y" bucket because it's
    // the closest available real number for the longest lookback range —
    // see the insight text below for that caveat, stated plainly rather
    // than left implicit.
    "1y": { totalAVE: 18000000, totalPlacements: 50, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
  },
  "vegan-dining-month": {
    // Real: multi-city campaign total — $400,000 AVE, 8 news clips (the
    // Samsung Times Square billboard is bundled into this same total, not
    // separately reported — see the second placement row below).
    "30d": { totalAVE: 400000, totalPlacements: 8, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    "90d": { totalAVE: null, totalPlacements: null, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    // No separate lifetime figure exists for this one-off campaign — same
    // real total repeated here rather than left blank, since it's the only
    // number that exists for this client at all.
    "1y": { totalAVE: 400000, totalPlacements: 8, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
  },
  "snap-co": {
    // SNAP Co.'s "Deeper Than Visibility" case study reports PER-OUTLET
    // REACH, not a bundled AVE dollar figure — a real methodology
    // difference in her own past reporting (see docs/agent-notes.md), not
    // a gap to paper over. totalAVE stays null in every bucket on purpose:
    // reach and AVE are different units, and summing reach into a fake
    // dollar total would be exactly the "average across two kinds by
    // mistake" src/outletReference.js's header warns against.
    "30d": { totalAVE: null, totalPlacements: 4, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    "90d": { totalAVE: null, totalPlacements: 4, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
    "1y": { totalAVE: null, totalPlacements: 4, avgLeadTime: null, activeCampaigns: 1, aveDelta: null, placementsDelta: null, leadTimeDelta: null },
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
      publication: "8 outlets incl. VegOut, QSR, VegWorld Magazine, Patch, PIX11, NBC (2 not individually named in source)",
      headline: "CPG product line launch — bundled campaign total across 8 outlets (Tenyse's case study reports one combined figure, not a per-outlet breakdown)",
      articleUrl: "",
      publicationDate: "",
      aveValue: 492198,
      pitchSentDate: "",
      landedDate: "",
      campaign: "CPG Product Line Launch",
      status: "Published",
    },
  ],
  "vegan-dining-month": [
    {
      publication: "8 news outlets across NYC, Las Vegas, Portland, Seattle, Eugene (not individually named in source)",
      headline: "Vegan Dining Month — multi-city bundled campaign total, 8 news clips",
      articleUrl: "",
      publicationDate: "",
      aveValue: 400000,
      pitchSentDate: "",
      landedDate: "",
      campaign: "Vegan Dining Month",
      status: "Published",
    },
    {
      publication: "Samsung — Times Square Billboard",
      headline: "Vegan Dining Month billboard placement — included in the $400,000 / 18M-reach total above, not separately reported",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "",
      landedDate: "",
      campaign: "Vegan Dining Month",
      status: "Published",
    },
  ],
  "snap-co": [
    {
      publication: "Blavity News",
      headline: "SNAP Co. coverage — 4,098,693 monthly reach (real figure, source: SNAP Co. 'Deeper Than Visibility' case study)",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "",
      landedDate: "",
      campaign: "Deeper Than Visibility",
      status: "Published",
    },
    {
      publication: "NewsOne",
      headline: "SNAP Co. coverage — 1,168,000 monthly reach (real figure, source: SNAP Co. 'Deeper Than Visibility' case study)",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "",
      landedDate: "",
      campaign: "Deeper Than Visibility",
      status: "Published",
    },
    {
      publication: "LGBTQ Nation",
      headline: "SNAP Co. coverage — 995,689 monthly reach (real figure, source: SNAP Co. 'Deeper Than Visibility' case study)",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "",
      landedDate: "",
      campaign: "Deeper Than Visibility",
      status: "Published",
    },
    {
      publication: "102.7 KIIS FM (iHeart)",
      headline: "SNAP Co. coverage — 108,477,000 monthly reach ⚠ unusually high vs. this campaign's other outlets (995,689–4,098,693) — source deck lists \"108,477 K,\" unit not confirmed, treat as unverified",
      articleUrl: "",
      publicationDate: "",
      aveValue: null,
      pitchSentDate: "",
      landedDate: "",
      campaign: "Deeper Than Visibility",
      status: "Published",
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
      id: "cpg-launch",
      name: "CPG Product Line Launch",
      progressPercent: 100,
      startDate: "",
      completedPlacements: 8,
      totalPlacements: 8,
      avgLeadTime: null,
      status: "Completed",
    },
  ],
  "vegan-dining-month": [
    {
      id: "vegan-dining-month",
      name: "Vegan Dining Month",
      progressPercent: 100,
      startDate: "",
      completedPlacements: 8,
      totalPlacements: 8,
      avgLeadTime: null,
      status: "Completed",
    },
  ],
  "snap-co": [
    {
      id: "deeper-than-visibility",
      name: "Deeper Than Visibility",
      progressPercent: 100,
      startDate: "",
      completedPlacements: 4,
      totalPlacements: 4,
      avgLeadTime: null,
      status: "Completed",
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
    "30d": [{ label: "Campaign Total", ave: 492198, placements: 8 }],
    "90d": [{ label: "Sample data pending", ave: 0, placements: 0 }],
    "1y": [{ label: "Lifetime (cumulative)", ave: 18000000, placements: 50 }],
  },
  "vegan-dining-month": {
    "30d": [{ label: "Campaign Total", ave: 400000, placements: 8 }],
    "90d": [{ label: "Sample data pending", ave: 0, placements: 0 }],
    "1y": [{ label: "Campaign Total", ave: 400000, placements: 8 }],
  },
  "snap-co": {
    // No AVE dollar figure exists for this client (see METRICS note above)
    // — bars sit at 0 rather than a guessed number; placements (4 real
    // outlets) still drive the line.
    "30d": [{ label: "Per-outlet reach model — no AVE reported", ave: 0, placements: 4 }],
    "90d": [{ label: "Per-outlet reach model — no AVE reported", ave: 0, placements: 4 }],
    "1y": [{ label: "Per-outlet reach model — no AVE reported", ave: 0, placements: 4 }],
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
    text: "Real case-study figures from Tenyse's own past reporting: the CPG product line launch generated $492,198 in publicity value across 8 outlets in 30 days. The $18,000,000 figure shown in the 1-Year view is VeganHood's full lifetime/cumulative total as of the case study's publish date — not a strict 12-month number — shown there because it's the closest real figure available for that range.",
    note: "Demo data — real case-study numbers from Tenyse's past reporting, not live client data.",
  },
  "vegan-dining-month": {
    text: "Real case-study figure from Tenyse's own past reporting: this multi-city campaign (NYC, Las Vegas, Portland, Seattle, Eugene) generated $400,000 in publicity value and 18,000,000 in audience reach across 8 news clips plus a Samsung Times Square billboard placement, bundled into one reported total.",
    note: "Demo data — real case-study numbers from Tenyse's past reporting, not live client data.",
  },
  "snap-co": {
    text: "Real case-study figures from Tenyse's \"Deeper Than Visibility\" case study — this client's coverage is reported as per-outlet monthly reach, not a single bundled AVE dollar total (a real methodology difference from her other case studies, not a gap). ⚠ The 102.7 KIIS FM figure (108,477,000) is unusually high next to this campaign's other outlets (995,689–4,098,693) — the source deck's units were ambiguous (\"108,477 K\"), so treat this one specifically as unverified until confirmed.",
    note: "Demo data — real case-study numbers from Tenyse's past reporting, not live client data.",
  },
  "sunny-sparkling": {
    text: "Coverage has been steady but concentrated in local outlets. Broadening to lifestyle and food-industry press could increase reach.",
    note: "Generated from the campaign data in this portal and reviewed by Verified Consulting.",
  },
};

// Owner-dashboard-only: an insight summarizing across every client, rather
// than one client's own coverage.
export const AGGREGATE_INSIGHT = {
  text: "Three of the four clients below (VeganHood, VegansBaby/Vegan Dining Month, SNAP Co.) are seeded with real case-study figures from Tenyse's own past reporting, not invented demo numbers — Sunny Sparkling Co. remains a fully fictional example client. All four are still Demo Data, not live clients; switch \"Data source\" to Real to see actual placements.",
  note: "Generated from the campaign data in this portal and reviewed by Verified Consulting.",
};

export const REPORTS = {
  veganhood: {
    title: "VeganHood — CPG Product Line Launch (Case Study)",
    period: "Per case study — exact dates not specified in source material",
    datePublished: "",
    viewUrl: "",
    pdfUrl: "",
  },
  "vegan-dining-month": {
    title: "Vegan Dining Month — Case Study",
    period: "Per case study — exact dates not specified in source material",
    datePublished: "",
    viewUrl: "",
    pdfUrl: "",
  },
  "snap-co": {
    title: "SNAP Co. — Deeper Than Visibility (Case Study)",
    period: "Per case study — exact dates not specified in source material",
    datePublished: "",
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
