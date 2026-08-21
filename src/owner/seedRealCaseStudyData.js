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

/**
 * Idempotent by design: re-running this after it's already run won't create
 * duplicate rows, checked by (publication, client, headline) — the same
 * fields a human would recognize as "this row already exists," not id
 * (which is freshly generated every call and would never match).
 */
export function seedRealCaseStudyData() {
  const existing = loadPlacements();
  const isDuplicate = (row) =>
    existing.some((p) => p.publication === row.publication && p.client === row.client && p.headline === row.headline);

  let added = 0;
  for (const row of REAL_CASE_STUDY_PLACEMENTS) {
    if (isDuplicate(row)) continue;
    addPlacement(createPlacement(row));
    added += 1;
  }
  return added;
}
