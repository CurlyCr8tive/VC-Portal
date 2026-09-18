// src/outletTrafficReference.js
//
// Audience figures per outlet, each carrying where it came from — the
// input side of aveEstimation.js. Separate from outletReference.js (which
// holds campaign-level benchmarks from Tenyse's decks) because these serve
// a different job: they feed a calculation, so each one has to be
// defensible on its own.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: every figure records what it
// actually measures and where it came from. The $492,198 duplicate got as
// far as it did because a number arrived without provenance and nothing
// downstream could tell it apart from a confirmed one. Rates derived from
// these figures will be shown to Tenyse's clients, so the same mistake
// here would be worse, not better.
//
// `metric` is the important field:
//   monthly_unique_visitors — what both AVE formulas actually call for
//   monthly_visits          — a LARGER number (one person visiting four
//                             times counts four times). Usable, but it
//                             overstates, and aveEstimation.js marks any
//                             estimate built on it.
//
// `confidence`:
//   owner_source  — from Tenyse's own case-study decks. Highest standing
//                   for this app's purpose: these are the numbers already
//                   underpinning figures she has shown clients.
//   third_party   — a traffic-analytics estimate (SimilarWeb, Semrush).
//                   Real and citable, but modelled, not measured.
//   self_reported — the outlet's own media kit. Advertiser-facing, which
//                   is arguably the right basis for an ad-equivalence
//                   figure, but it's marketing material.
//   estimated     — NO sourced figure exists; this is a reasoned placeholder
//                   so the dashboard shows something rather than a row of
//                   dashes. Added at the owner's explicit direction. Every
//                   AVE derived from one of these is written with
//                   ave_auto_calculated = true AND an ave_data_quality flag
//                   saying it is an estimate, so it can never be mistaken
//                   for one of Tenyse's confirmed figures — and so a single
//                   query finds them all again when real numbers arrive.
//
// Nothing here is auto-loaded into outletRatesStorage. These are
// candidates for a rate, not rates. A figure becomes a rate only when
// somebody chooses to save it.

export const OUTLET_TRAFFIC_REFERENCE = [
  // --- From Tenyse's own SNAP Co. "Deeper Than Visibility" deck ---------
  {
    outlet: "Blavity News",
    value: 4098693,
    metric: "monthly_unique_visitors",
    confidence: "owner_source",
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
    sourceDate: "2026-08-25",
    notes:
      "Deck labels it 'Monthly readers & Viewers'. NOTE the scope conflict before substituting anything else: Blavity Media Group's own media kit claims 32M total network reach, but that covers the whole network (Blavity, Travel Noire, 21Ninety, AfroTech, Shadow & Act), not blavity.com. Don't swap the 32M in — it would inflate this ~8x for a placement that ran on one site.",
  },
  {
    outlet: "NewsOne",
    value: 1168000,
    metric: "monthly_unique_visitors",
    confidence: "owner_source",
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
    sourceDate: "2026-08-25",
  },
  {
    outlet: "LGBTQ Nation",
    value: 995689,
    metric: "monthly_unique_visitors",
    confidence: "owner_source",
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
    sourceDate: "2026-08-25",
    notes:
      "Deck reads '995,689 K Monthly readers & viewers'. The 'K' is read as a column-header artifact, not a x1,000 multiplier — 995,689 is already plausible next to Blavity (4.1M) and NewsOne (1.17M), while x1,000 would put it above Blavity. Same reading applied to KIIS FM below. Still unconfirmed with Tenyse — see docs/tenyse-open-data-questions.md question 3.",
  },
  {
    outlet: "102.7 KIIS FM (iHeart)",
    value: 108477,
    metric: "monthly_unique_visitors",
    confidence: "owner_source",
    source: "SNAP Co. 'Deeper Than Visibility' case study (Canva deck)",
    sourceDate: "2026-08-25",
    notes:
      "Same 'K' ambiguity as LGBTQ Nation. Reading it as x1,000 would give a single-market radio station 108M monthly — far above Blavity's national digital reach, which isn't credible. Also worth noting this is a radio brand's website figure, not its broadcast audience; the AVE formulas here are digital-only and don't price airtime.",
  },

  // --- Researched third-party figures -----------------------------------
  // Recorded as monthly_visits where that's what the source actually
  // publishes. SimilarWeb's free pages do not expose unique visitors —
  // Muck Rack and Agility read uniques through a paid API — so these
  // overstate, and any estimate built on them is marked accordingly.
  {
    outlet: "Forbes",
    value: 71970000,
    metric: "monthly_visits",
    confidence: "third_party",
    source: "SimilarWeb, forbes.com — https://www.similarweb.com/website/forbes.com/",
    sourceDate: "2026-07",
    notes:
      "71.97M VISITS for July 2026, not uniques. Third-party ad-sales pages cite ~36M monthly unique visitors for Forbes.com — roughly half, which is a plausible visits-to-uniques ratio for a news site, but that figure is secondhand and wasn't confirmed against Forbes' own media kit. Prefer the uniques figure once sourced directly. Separately, Forbes BrandVoice sponsored articles are widely reported around $12,500 each — a real paid-placement price and a useful sanity check on any derived estimate for Forbes.",
  },
  {
    outlet: "Essence",
    value: 1980000,
    metric: "monthly_visits",
    confidence: "third_party",
    source: "Semrush, essence.com",
    sourceDate: "2026-01",
    notes:
      "Visits, not uniques. Essence's own 2025 media kit would be the better source but is behind a 403 — worth retrieving directly. A frequently-quoted $80,500 full-page print rate circulates for the magazine, but the source that carries it explicitly disclaims its own accuracy, so it is NOT recorded here as a figure.",
  },
  {
    outlet: "Black Enterprise",
    value: 641610,
    metric: "monthly_visits",
    confidence: "third_party",
    source: "Semrush, blackenterprise.com",
    sourceDate: "2026-01",
    notes: "Visits, not uniques. Black Enterprise publishes a media kit at bemediakit.com — not yet retrieved.",
  },
  // --- Houston Housing Authority's outlets ------------------------------
  // Added so that client's seven real placements stop showing "—". Only
  // Bisnow has a sourced figure; the rest are ESTIMATES, at the owner's
  // direction, and are flagged as such everywhere they surface.
  {
    outlet: "Bisnow",
    value: 163000,
    metric: "monthly_visits",
    confidence: "third_party",
    source: "SimilarWeb, bisnow.com — 490.9K visits over 3 months",
    sourceDate: "2026-08",
    notes: "Visits, not uniques, so any estimate from it is marked as overstating.",
  },
  {
    outlet: "Houston Business Journal",
    value: 145000,
    metric: "monthly_visits",
    confidence: "estimated",
    source: "ESTIMATE — SimilarWeb publishes bizjournals.com network-wide only (8.7M visits/3mo across 40+ city titles). Houston is one of the larger markets; this assumes roughly 5% of network traffic.",
    sourceDate: "2026-09-18",
    notes: "Not a sourced figure. The network total cannot be split per city without inventing the split, and this is that invention, stated plainly. Replace as soon as a Houston-specific number exists.",
  },
  {
    outlet: "The Birmingham Times",
    value: 50000,
    metric: "monthly_visits",
    confidence: "estimated",
    source: "ESTIMATE — no published traffic figure found. Scaled as a long-running Black-owned metro weekly, well below the national digital outlets in this file.",
    sourceDate: "2026-09-18",
    notes: "Not a sourced figure.",
  },
  {
    outlet: "Daily Advent Nigeria",
    value: 40000,
    metric: "monthly_visits",
    confidence: "estimated",
    source: "ESTIMATE — no published traffic figure found.",
    sourceDate: "2026-09-18",
    notes:
      "Not a sourced figure, and worth questioning at all: Daily Advent republishes other outlets' articles. An aggregator pickup is arguably not earned coverage with its own audience, so this value may be conceptually wrong rather than merely imprecise.",
  },
  {
    outlet: "Yahoo Finance",
    value: 25000,
    metric: "monthly_visits",
    confidence: "estimated",
    source: "ESTIMATE — deliberately NOT derived from Yahoo Finance's own traffic. That site draws hundreds of millions of visits, and the Muck Rack formula over it returns a six-figure value for a single item, the same breakdown documented for Forbes (~53x the outlet's real ad price).",
    sourceDate: "2026-09-18",
    notes:
      "This placement is a syndicated press release, not an editorial feature — Yahoo Finance republished the PRWeb wire. Priced as a wire pickup rather than as earned coverage on a major finance site, because that is what it is. Deliberately conservative; correct it with a real figure rather than trusting this one.",
  },
  {
    outlet: "PRWeb",
    value: 15000,
    metric: "monthly_visits",
    confidence: "estimated",
    source: "ESTIMATE — PRWeb is a press-release distribution wire, not a publication with its own readership.",
    sourceDate: "2026-09-18",
    notes:
      "Worth questioning whether this should carry an AVE at all. AVE prices what equivalent advertising would have cost; a wire is something the client PAYS to distribute, so valuing it as earned coverage arguably double-counts. Included at the owner's direction with a nominal figure, flagged. Raise with Tenyse before this appears in a client report.",
  },
];

/** Case-insensitive lookup, matching outletRatesStorage's behavior. */
export function findOutletTraffic(outletName) {
  const key = String(outletName || "").trim().toLowerCase();
  if (!key) return null;
  return OUTLET_TRAFFIC_REFERENCE.find((o) => o.outlet.toLowerCase() === key) || null;
}
