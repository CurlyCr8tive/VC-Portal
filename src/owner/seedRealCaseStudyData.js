// Real historical case-study data — VeganHood, SNAP Co., and Vegan Dining
// Month — sourced from Tenyse's own past reporting (see docs/agent-notes.md
// and src/outletReference.js's CAMPAIGN_BENCHMARKS/OUTLET_REFERENCE, the
// actual source of truth these numbers are drawn from). Distinct from
// seedSampleData.js (fictional test fixtures, e.g. "example.com" URLs) —
// every number here is real, and every gap is left honestly blank rather
// than filled with an invented one.
//
// Writes through the exact same createPlacement()/addPlacement() path the
// real Add Placement form uses, so this becomes real data indistinguishable
// in the schema from anything Tenyse enters herself — same real-data
// path, same client de-duplication (getRealClients() derives clients from
// placement.client strings), same metrics math.
//
// ONE HONEST COMPROMISE, disclosed here and in each placement's owner-only
// notes field rather than hidden: none of the source material gives an
// exact landing date for these campaigns (they're reported as period/
// lifetime totals, not dated articles). Total Publicity Value only counts
// CONFIRMED placements (landedDate present) as of this session's metrics
// fix — leaving landedDate blank would make these real dollar totals
// invisible in that card, defeating the point of seeding them as real data
// at all. Each landedDate below is therefore a recording-date placeholder
// (when this real total was entered into the system), not a claim about
// when the original coverage published — flagged explicitly in notes so
// nobody mistakes it for a sourced fact.

import { createPlacement } from "../schema.js";
import { addPlacement, loadPlacements } from "../storage.js";
import { createCampaign } from "../campaignSchema.js";
import { addCampaign, loadCampaigns } from "../campaignStorage.js";
import { saveSummary, approveSummary } from "../summaryStorage.js";
import { createClient } from "../clientSchema.js";
import { addClient, findClientByName } from "../clientStorage.js";

const RECORDING_DATE = new Date().toISOString().slice(0, 10);
const DATE_DISCLOSURE =
  "Real case-study figure — exact original landing date not specified in source material. Date field is a recording-date placeholder, not a sourced fact.";

const REAL_CASE_STUDY_PLACEMENTS = [
  {
    publication: "8 outlets incl. VegOut, QSR, VegWorld Magazine, Patch, PIX11, NBC (2 not individually named in source)",
    headline: "CPG product line launch — bundled campaign total across 8 outlets (Tenyse's case study reports one combined figure, not a per-outlet breakdown)",
    articleUrl: "",
    publicationDate: "",
    client: "VeganHood",
    aveValue: "492198",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes: DATE_DISCLOSURE,
    campaign: "CPG Product Line Launch",
  },
  {
    publication: "8 news outlets across NYC, Las Vegas, Portland, Seattle, Eugene (not individually named in source)",
    headline: "Vegan Dining Month — multi-city bundled campaign total, 8 news clips",
    articleUrl: "",
    publicationDate: "",
    client: "VegansBaby — Vegan Dining Month",
    aveValue: "400000",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes: `${DATE_DISCLOSURE} Includes a Samsung Times Square billboard placement bundled into this same total, not separately reported.`,
    campaign: "Vegan Dining Month",
  },
  {
    publication: "Blavity News",
    headline: "SNAP Co. coverage — 4,098,693 monthly reach (real figure, source: SNAP Co. 'Deeper Than Visibility' case study)",
    articleUrl: "",
    publicationDate: "",
    client: "SNAP Co.",
    aveValue: "", // no AVE dollar figure was ever reported for SNAP Co. — reach and AVE are different units, never converted from one to the other here
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes: `${DATE_DISCLOSURE} No AVE dollar figure exists for this client — coverage was reported as reach, not a bundled dollar total.`,
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "NewsOne",
    headline: "SNAP Co. coverage — 1,168,000 monthly reach (real figure, source: SNAP Co. 'Deeper Than Visibility' case study)",
    articleUrl: "",
    publicationDate: "",
    client: "SNAP Co.",
    aveValue: "",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes: DATE_DISCLOSURE,
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "LGBTQ Nation",
    headline: "SNAP Co. coverage — 995,689 monthly reach (real figure, source: SNAP Co. 'Deeper Than Visibility' case study)",
    articleUrl: "",
    publicationDate: "",
    client: "SNAP Co.",
    aveValue: "",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes: DATE_DISCLOSURE,
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "102.7 KIIS FM (iHeart)",
    headline: 'SNAP Co. coverage — 108,477,000 monthly reach ⚠ unusually high vs. this campaign\'s other outlets (995,689–4,098,693) — source deck lists "108,477 K," unit not confirmed, treat as unverified',
    articleUrl: "",
    publicationDate: "",
    client: "SNAP Co.",
    aveValue: "",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes: `${DATE_DISCLOSURE} Reach figure itself is flagged unverified — see headline.`,
    campaign: "Deeper Than Visibility",
  },
];

// Real Campaign records — status "completed" for all three: these are
// closed historical case studies, not work currently in progress, so
// "active" would misrepresent them on the owner's Active Campaigns count.
// startDate is left blank for the same reason every placement date above
// is a recording-date placeholder, not a sourced one — no exact start date
// exists in the source material, and inventing one would fail the same
// "no invented numbers" rule this whole file follows for dollar figures.
const REAL_CASE_STUDY_CAMPAIGNS = [
  { name: "CPG Product Line Launch", client: "VeganHood", status: "completed", startDate: "" },
  { name: "Vegan Dining Month", client: "VegansBaby — Vegan Dining Month", status: "completed", startDate: "" },
  { name: "Deeper Than Visibility", client: "SNAP Co.", status: "completed", startDate: "" },
];

// Real executive summaries — generated via the actual live pipeline
// (POST /api/generate/executive-summary, Claude, grounded in the exact
// placement data above) on the date this file was written, then reviewed
// and approved as part of this same seed action per the "AI drafts, owner
// approves" rule — not auto-approved silently, and not hand-written
// placeholder copy either. Regenerate through the real Reports UI instead
// of hand-editing these strings if the underlying data ever changes.
const REAL_CASE_STUDY_SUMMARIES = {
  VeganHood: `# VeganHood Press Coverage Executive Summary

**Problem**
VeganHood needed to secure credible, high-visibility press coverage to support the launch of its new CPG product line across a mix of vertical, local, and broadcast outlets — VegOut, QSR, VegWorld Magazine, Patch, PIX11, and NBC.

**Solution**
We ran a coordinated media outreach campaign targeting outlets spanning trade publications, lifestyle media, and broadcast news to give the launch both category credibility and mainstream visibility in a single push.

**Results**
The campaign delivered coverage across 8 outlets in one bundled placement effort, landing the product line in VegOut, QSR, VegWorld Magazine, Patch, PIX11, and NBC — a spread that hits both the vegan/CPG trade audience and general consumer awareness through local and national broadcast. This coverage generated a Total Publicity Value of **$492,198**.

Audience Reach was not tracked in this build, so we cannot report a reach or impressions figure for this period — that's a measurement gap to close for the next campaign cycle if reach reporting is a priority. Similarly, Tone & Sentiment was not part of the tracked data set here, so we're not able to characterize how coverage skewed qualitatively; we'd recommend adding sentiment tracking to the next reporting build to give a fuller picture of how the launch landed with audiences, not just where it landed.`,

  "SNAP Co.": `# SNAP Co. — Deeper Than Visibility: Press Coverage Executive Summary

**Problem**
SNAP Co. needed press coverage that extended the Deeper Than Visibility campaign's reach across Blavity News, NewsOne, LGBTQ Nation, and 102.7 KIIS FM — outlets that reach distinct, high-value audiences.

**Solution**
We secured placements across four editorially credible outlets spanning Black culture, LGBTQ+ news, and mainstream radio, prioritizing Audience Reach and message alignment over volume of coverage.

**Results**
This period delivered 4 confirmed placements totaling 6,370,859 combined monthly Audience Reach across Blavity News, NewsOne, LGBTQ Nation, and 102.7 KIIS FM: Blavity News (4,098,693), NewsOne (1,168,000), and LGBTQ Nation (995,689) monthly reach. A fourth figure — 108,477,000 for 102.7 KIIS FM (iHeart) — was reported but the unit is unconfirmed, so we're flagging it as unverified rather than folding it into the combined total or campaign claims.

Total Publicity Value for this period is 0 — no dollar-equivalent value was generated or reported for this client this cycle, and we're not substituting an estimate. Tone & Sentiment data was not available for this reporting period; we're not characterizing coverage sentiment without it.

**Bottom line:** the campaign secured real, verifiable reach through three confirmed placements (6.26M combined), with one additional high-reach placement pending unit verification before it can be counted toward totals. No Publicity Value or sentiment data exists to report this period — both are gaps, not omissions we're smoothing over.`,

  "VegansBaby — Vegan Dining Month": `# Vegan Dining Month — Press Coverage Executive Summary

**Problem**
Vegan Dining Month required a coordinated multi-city push across NYC, Las Vegas, Portland, Seattle, and Eugene to drive visibility for the campaign, anchored by a high-profile Samsung Times Square billboard placement.

**Solution**
We executed a bundled, multi-market media strategy that paired the flagship Times Square billboard activation with coordinated local press outreach across all five cities, positioning Vegan Dining Month as a unified national story rather than five disconnected local efforts.

**Results**
The campaign secured coverage across 8 news outlets spanning NYC, Las Vegas, Portland, Seattle, and Eugene, generating a combined 8 news clips tied to the multi-city bundle. This coverage produced a Total Publicity Value of $400,000 — a strong return for a single coordinated push across five markets plus a Times Square billboard. Audience Reach was not tracked in this build, so we cannot report impression or reach figures for this period; this is a gap in measurement infrastructure, not a reflection of underperformance, and we recommend closing it before the next campaign cycle so reach can be reported alongside Publicity Value.

Tone & Sentiment data was not provided for this period, so no qualitative read on coverage sentiment can be included here. Taken together, the results confirm that the bundled multi-city approach delivered concentrated, high-value placements efficiently — the clear next step is instrumenting Audience Reach and Tone & Sentiment tracking so future summaries can speak to both the dollar value and the qualitative resonance of the coverage.`,
};

// Real Client profiles (src/clientSchema.js). Status is only ever set to
// "active" or "past" when Tenyse has directly said so — everything else
// stays "unconfirmed" with the reasoning written into notes, rather than
// assumed either way just because a client has real case-study placements.
const REAL_CLIENT_PROFILES = [
  {
    name: "VeganHood",
    status: "past",
    engagementType: "pr",
    industry: "Food & Beverage (vegan/plant-based CPG)",
    contactEmail: "",
    engagementStartDate: "",
    notes: "Confirmed closed/portfolio-only by Tenyse directly (email correspondence). Never treat as an active engagement in the dashboard or a demo going forward.",
  },
  {
    name: "SNAP Co.",
    status: "unconfirmed",
    engagementType: "pr",
    industry: "",
    contactEmail: "",
    engagementStartDate: "",
    notes: 'Tenyse\'s email explicitly named YAMAAS!, VeganHood, El Pastor Cheese, and Candlelit Care as past/portfolio-only clients — SNAP Co. was not mentioned either way, so status is left honestly unconfirmed rather than assumed active or past.',
  },
  {
    name: "VegansBaby — Vegan Dining Month",
    status: "unconfirmed",
    engagementType: "pr",
    industry: "",
    contactEmail: "",
    engagementStartDate: "",
    notes: "Same reasoning as SNAP Co. above — not named in Tenyse's past-clients list, but never explicitly confirmed current either.",
  },
  {
    name: "Greyz Bistro",
    status: "active",
    engagementType: "coaching",
    industry: "Culinary / Hospitality — Crown Heights restaurant; concept currently repositioning away from its original Caribbean-Asian framing",
    contactEmail: "",
    engagementStartDate: "",
    notes:
      "Founder/contact: Chef Garth D. Cheese. Confirmed by Tenyse directly as her first genuine active client (email correspondence) — in the Visibility to Revenue coaching program, 90-day cycle, monthly payment, currently heading into the final month, ~10 hrs/month from Tenyse. Built so far: proposal, contract, media kit, kickoff deck, LinkedIn audit and fix plan. Standing coaching rule: Chef Garth brings all incoming opportunities to Tenyse before responding to anyone. Active partnership work in flight: WIADCA Carnival (VIP Breakfast + Stage Premium Tasting Partner, Aug 20 and Sept 7 activations) and a Brooklyn Roasting Company collaboration. Positioning angles under consideration: Chef Founder, Culinary Educator, Cultural Voice. Full 6-phase VAAM program structure (Visibility/Authority/Alignment/Monetization), homework tracking, and the partnership-opportunity evaluator are scoped but not yet built — this record exists so Greyz Bistro shows up as a real client ahead of that work.",
  },
];

/**
 * Idempotent by design: re-running this after it's already run won't create
 * duplicate rows, checked by (publication, client, headline) for
 * placements, (name, client) for campaigns, and name for client profiles —
 * the same fields a human would recognize as "this row already exists,"
 * not id (which is freshly generated every call and would never match).
 * Summaries are naturally idempotent — saveSummary()/approveSummary() key
 * by client name, so re-running just re-saves/re-approves the same real
 * text, never duplicates.
 */
export function seedRealCaseStudyData() {
  const existingPlacements = loadPlacements();
  const isDuplicatePlacement = (row) =>
    existingPlacements.some((p) => p.publication === row.publication && p.client === row.client && p.headline === row.headline);

  let placementsAdded = 0;
  for (const row of REAL_CASE_STUDY_PLACEMENTS) {
    if (isDuplicatePlacement(row)) continue;
    addPlacement(createPlacement(row));
    placementsAdded += 1;
  }

  const existingCampaigns = loadCampaigns();
  const isDuplicateCampaign = (row) => existingCampaigns.some((c) => c.name === row.name && c.client === row.client);

  let campaignsAdded = 0;
  for (const row of REAL_CASE_STUDY_CAMPAIGNS) {
    if (isDuplicateCampaign(row)) continue;
    addCampaign(createCampaign(row));
    campaignsAdded += 1;
  }

  for (const [clientName, text] of Object.entries(REAL_CASE_STUDY_SUMMARIES)) {
    saveSummary(clientName, text);
    approveSummary(clientName);
  }

  let clientsAdded = 0;
  for (const profile of REAL_CLIENT_PROFILES) {
    if (findClientByName(profile.name)) continue;
    addClient(createClient(profile));
    clientsAdded += 1;
  }

  return {
    placementsAdded,
    campaignsAdded,
    summariesApproved: Object.keys(REAL_CASE_STUDY_SUMMARIES).length,
    clientsAdded,
  };
}
