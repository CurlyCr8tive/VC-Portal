// Real historical case-study data — VeganHood, SNAP Co., Vegan Dining
// Month, and Candlelit Care — sourced from Tenyse's own past reporting
// (see docs/agent-notes.md and src/outletReference.js's
// CAMPAIGN_BENCHMARKS/OUTLET_REFERENCE, the actual source of truth these
// numbers are drawn from). Distinct from seedSampleData.js (fictional test
// fixtures, e.g. "example.com" URLs) — every number here is real, and
// every gap or conflict is left honestly disclosed rather than smoothed
// over.
//
// Writes through the exact same createPlacement()/addPlacement() path the
// real Add Placement form uses, so this becomes real data indistinguishable
// in the schema from anything Tenyse enters herself — same real-data
// path, same client de-duplication (getRealClients() derives clients from
// placement.client strings), same metrics math.
//
// UPDATED Aug 25 with Tenyse's first batch of real Canva case-study
// screenshots (60+ total, more to come). This batch:
//   - Independently CONFIRMED VeganHood's CPG figures ($492,198/14.2M)
//     directly from VeganHood's own deck slide, not just inferred.
//   - Added real headline/date/URL/sentiment for all 4 SNAP Co. placements
//     — previously every date below was a recording-date placeholder;
//     these four now have real sourced dates.
//   - Found the actual root of the VeganHood/Candlelit Care duplicate-
//     figure issue flagged in outletReference.js: Candlelit Care's own
//     deck slide independently shows the SAME $492,198/14.2M figure as
//     VeganHood, AND a "Terminology Guide" slide appearing under Vegan
//     Dining Month's section of the SAME deck defines "Clips" as
//     "mentioning Candlelit Therapy" — a leftover label proving that slide
//     (its 18M reach / 40 clips / 100% positive numbers) is a reused
//     Candlelit Care template, not real Vegan Dining Month data. This is
//     evidence of a systemic template-reuse issue in her reporting decks,
//     not a one-off. See notes on the affected placements below.
//   - Added Candlelit Care as a real client (confirmed past/portfolio by
//     Tenyse in the same email that named VeganHood — see REAL_CLIENT_PROFILES).
//   - Added Houston Housing Authority and Nude Barre as real clients —
//     social-media-management engagements with percentage/engagement-rate
//     results, not press placements, so they have no Placement rows; their
//     real numbers live in their Client profile's notes field instead,
//     the only field that fits that shape.
//
// UPDATED Aug 25 (second batch, same day) with a more detailed deck for
// Houston Housing Authority — this one has real per-article press
// placements (7 added, with real headline/date/URL/sentiment), so it's no
// longer social-media-only for this client. Two things flagged, not
// resolved: this second deck is branded "Etched," not "Verified
// Consulting," throughout — attribution unconfirmed; and its Terminology
// Guide defines "Clips" as mentioning "HHFH," not "HHA" — a second
// possible instance of the same reused-template issue found in the first
// batch. See REAL_CLIENT_PROFILES' Houston Housing Authority notes.
//
// ONE HONEST COMPROMISE, still true for placements that never got a real
// date confirmed: none of the source material gives an exact landing date
// for those campaigns (they're reported as period/lifetime totals, not
// dated articles). Total Publicity Value only counts CONFIRMED placements
// (landedDate present) — leaving landedDate blank would make those real
// dollar totals invisible in that card, defeating the point of seeding
// them as real data at all. Each such landedDate is a recording-date
// placeholder (when this real total was entered into the system), not a
// claim about when the original coverage published — flagged explicitly
// in notes so nobody mistakes it for a sourced fact.

import { createPlacement } from "../schema.js";
import { addPlacement, loadPlacements, deletePlacement } from "../storage.js";
import { createCampaign } from "../campaignSchema.js";
import { addCampaign, loadCampaigns } from "../campaignStorage.js";
import { saveSummary, approveSummary } from "../summaryStorage.js";
import { createClient } from "../clientSchema.js";
import { addClient, findClientByName } from "../clientStorage.js";

const RECORDING_DATE = new Date().toISOString().slice(0, 10);
const DATE_DISCLOSURE =
  "Real case-study figure — exact original landing date not specified in source material. Date field is a recording-date placeholder, not a sourced fact.";

// Old-shape SNAP Co. placements (pre-Aug 25) used this literal headline
// prefix. Anything matching it gets replaced by the real-headline version
// below during seeding, instead of sitting alongside it as a stale
// duplicate — see the migration step in seedRealCaseStudyData().
const LEGACY_SNAP_HEADLINE_MARKER = "SNAP Co. coverage —";

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
    notes: `${DATE_DISCLOSURE} Independently re-confirmed Aug 25 directly from VeganHood's own "CPG Campaign Results" deck slide — same $492,198/14.2M figures, not just inferred from the earlier cross-client comparison.`,
    campaign: "CPG Product Line Launch",
    audienceReach: "14200000",
  },
  {
    publication: "Samsung USA (837 NYC brand activation) + Times Square billboard",
    headline: 'Samsung USA brand partnership & activation — "chix\'in" sandwich launch, Times Square billboard, and an "Imma Eat This" influencer partnership',
    articleUrl: "",
    publicationDate: "",
    client: "VeganHood",
    aveValue: "100000", // the deck states this figure specifically for the Times Square billboard component
    audienceReach: "2000000", // billboard reach, stated specifically as "over 2 million individuals" — distinct from the CPG campaign's separate 14.2M
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes:
      `${DATE_DISCLOSURE} Separate engagement from the CPG product launch above — a Samsung-sponsored brand activation, not press placements. Real numbers from Tenyse's deck: Instagram influencer "Imma Eat This" booked, follower count grew 5K to 19.7K (190% increase per the deck). Post-level engagement stats shown: 24k likes, 95k saves, 200k shares, 500K views (deck's own summary figures — a specific example Instagram post screenshotted in the same slide shows different, smaller numbers, so don't conflate the two; treating the summary figures as the campaign-level claim). No dedicated schema field exists for social engagement metrics (see canvaColumnMapping.js's LOW_CONFIDENCE_FIELDS note), so these live here in notes rather than a fabricated structured field.`,
    campaign: "Samsung USA Brand Partnership & Activation",
  },
  {
    publication: "8 news outlets across NYC, Las Vegas, Portland, Seattle, Eugene (not individually named in source)",
    headline: "Vegan Dining Month — multi-city bundled campaign total, 8 news clips",
    articleUrl: "",
    publicationDate: "",
    client: "VegansBaby — Vegan Dining Month",
    aveValue: "400000",
    audienceReach: "5630000",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes:
      `${DATE_DISCLOSURE} Includes a Samsung Times Square billboard placement (same event as VeganHood's Samsung partnership above) bundled into this total. ` +
      `REACH FIGURE CONFLICT, not resolved — flagging rather than picking one: the deck's own "Executive Summary" slide (explicitly about all 5 cities) states "5.63 million individuals," used here. A separate slide later in the same deck, labeled "Overall Coverage Summary of Portland, Seattle & Eugene" (a 3-city subset), states 18,000,000 reach instead — larger than the 5-city total, which isn't possible if both are real. Stronger evidence that 18M slide is unreliable for this client specifically: its "Terminology Guide" box defines "Clips" as "the number of news clips mentioning Candlelit Therapy" — a different client's name, left in from a reused template. Recommend asking Tenyse directly which (if either) reach figure is real before reporting either to a client.`,
    campaign: "Vegan Dining Month",
  },
  {
    publication: "Essence, 21Ninety, Yahoo News, Parents, SELF Magazine + 1 more (6 total per deck, 1 not individually named)",
    headline: "National press push — bundled campaign total across 6 outlets (Tenyse's case study reports one combined figure, not a per-outlet breakdown)",
    articleUrl: "",
    publicationDate: "",
    client: "Candlelit Care",
    aveValue: "492198",
    audienceReach: "14200000",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes:
      `${DATE_DISCLOSURE} DUPLICATE-FIGURE FLAG: this $492,198/14.2M figure is IDENTICAL to VeganHood's CPG campaign figure above, despite entirely different outlet lists (VeganHood: VegOut/QSR/VegWorld/Patch/PIX11/NBC; Candlelit Care: Essence/21Ninety/Yahoo News/Parents/SELF+1). AVE is a sum of per-outlet ad-rate equivalents — two independently-calculated campaigns landing on the exact same dollar AND reach figure isn't plausible. Confirmed directly from each client's own separate deck slide as of Aug 25 (not just the earlier cross-reference note), plus a leftover "Candlelit Therapy" terminology label found under Vegan Dining Month's section of the same overall deck (see that placement's notes) — strong evidence Tenyse's Canva template reuses this exact stat block across clients without updating it. Do not treat either number as confirmed for either client until she confirms from the original Meltwater/Coverage Books export which (if either) is real.`,
    campaign: "National Press Push",
  },
  {
    publication: "Blavity News",
    headline: "Let's Move Beyond Superficial Acts Of Black Trans Inclusion And Create Long-Lasting Improvements (op-ed by Toni-Michelle Williams)",
    articleUrl: "https://blavity.com/author/Toni-Michelle%20Williams",
    publicationDate: "2022-03-31",
    client: "SNAP Co.",
    aveValue: "",
    sentiment: "positive",
    audienceReach: "4098693",
    pitchSentDate: "",
    landedDate: "2022-03-31",
    notes: "Real headline/date/URL/sentiment confirmed Aug 25 from Tenyse's Canva case-study screenshots. Reach (4,098,693 monthly readers/viewers) matches the figure already on file — now confirmed by a second, direct source rather than a single earlier note. Op-ed published 1:51pm per the deck.",
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "NewsOne",
    headline: "Black Trans Led Organization Launches New Report 'Deeper Than Visibility' Examining Community Views On Public Safety",
    articleUrl: "",
    publicationDate: "",
    client: "SNAP Co.",
    aveValue: "",
    sentiment: "positive",
    audienceReach: "1168000",
    pitchSentDate: "",
    landedDate: RECORDING_DATE,
    notes:
      `${DATE_DISCLOSURE} Real headline/sentiment confirmed Aug 25. No direct article URL was visible in the source screenshot — only a social share link (twitter.com/newsone/status/1509938918141145096) was shown, not the underlying NewsOne article URL, so articleUrl is left blank rather than substituting the social link. The report's release "coincided with the 13th annual Trans Day of Visibility" (March 31) per the deck, but that's the report's release framing, not a stated publish date for this specific NewsOne article — not assumed to be the same date without it being said directly.`,
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "LGBTQ Nation",
    headline: "Toni-Michelle Williams is fighting for a safer future for Black trans people",
    articleUrl: "https://www.lgbtqnation.com/2022/03/toni-michelle-williams-fighting-safer-future-black-trans-people/",
    publicationDate: "2022-03-31",
    client: "SNAP Co.",
    aveValue: "",
    sentiment: "positive",
    audienceReach: "995689",
    pitchSentDate: "",
    landedDate: "2022-03-31",
    notes:
      "Real headline/date/URL/sentiment confirmed Aug 25 (byline: Molly Sprayregen, Thursday, March 31, 2022). Reach shown in the deck as \"995,689 K Monthly readers &viewers\" — kept as 995,689 (not ×1,000) since that's already in a plausible range next to Blavity (4.1M) and NewsOne (1.17M), and the same \"K\" suffix appears on 102.7 KIIS FM's figure below where treating it as a real ×1,000 multiplier would be implausible (see that placement's notes) — read as a stray label/column-header artifact carried over from her source export, not a genuine unit, applied consistently across both. Flagging the reasoning rather than asserting it as confirmed — worth a direct check with Tenyse.",
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "102.7 KIIS FM (iHeart)",
    headline: "Commemorating International Transgender Day Of Visibility",
    articleUrl: "https://kiisfm.iheart.com/content/2021-03-31-commemorating-international-transgender-day-of-visibility/",
    publicationDate: "2022-03-31",
    client: "SNAP Co.",
    aveValue: "",
    sentiment: "positive",
    audienceReach: "108477",
    pitchSentDate: "",
    landedDate: "2022-03-31",
    notes:
      `Real headline/URL/sentiment confirmed Aug 25 (byline: Cherranda Smith). DATE CONFLICT in her own source, not resolved: the article's byline reads "Mar 31, 2022," but the article URL itself is dated "2021-03-31" — used the byline date (2022) since it's the more explicit, human-written date, but this is a real inconsistency in the source material worth asking Tenyse about directly, not something guessed past. REACH FIGURE: deck shows "108,477 K Monthly readers &Viewers" — kept as 108,477 (not ×1,000 = 108,477,000), consistent with outletReference.js's existing reasoning that treating "K" as a literal ×1,000 multiplier here would put a single-market radio station's reach far above Blavity's national digital reach (4.1M), which isn't plausible. This CORRECTS the previous version of this same placement, which used 108,477,000 — that was the less-consistent reading; flagging so the change is visible rather than silent. Still unverified until Tenyse confirms directly.`,
    campaign: "Deeper Than Visibility",
  },
  {
    publication: "Houston Business Journal",
    headline: "Local ministry opens affordable homes in OST/South Union area",
    articleUrl: "https://muckrack.com/link/oAQHSr/local-ministry-opens-affordable-homes-in-ostsouth-union-area",
    publicationDate: "2022-01-31",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "neutral",
    audienceReach: "17243",
    pitchSentDate: "",
    landedDate: "2022-01-31",
    notes:
      'Real headline/date/URL/sentiment/reach confirmed Aug 25 from a second Canva deck (this one branded "Etched," not Verified Consulting — see REAL_CLIENT_PROFILES\' Houston Housing Authority notes for that flag). Reach (17,243) and tone (Neutral) from the deck\'s own "News Coverage Highlights" slide; headline/URL/date confirmed a second time from its Appendix news-clips table.',
    campaign: "Media Relations Coverage — January 2022",
  },
  {
    publication: "Houston Business Journal",
    headline: "Profile interview with David A. Northern, Sr., new President & CEO of Houston Housing Authority",
    articleUrl: "",
    publicationDate: "2022-02-07",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "positive",
    audienceReach: "6174084",
    pitchSentDate: "",
    landedDate: "2022-02-07",
    notes:
      'By reporter Florian Martin, 8:14pm EST. Real reach/date/sentiment confirmed Aug 25 from the "Etched"-branded deck\'s "News Coverage Highlights" slide. No article URL was shown for this specific piece (unlike the OST/South Union placement above) — left blank rather than guessed.',
    campaign: "Media Relations Coverage — January 2022",
  },
  {
    publication: "Bisnow",
    headline: "Houston Housing Authority Hires New CEO As City Faces Slew Of Evictions",
    articleUrl: "https://www.bisnow.com/houston/news/affordable-housing/houston-housing-authority-hires-new-ceo-111657",
    publicationDate: "2022-01-28",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "positive",
    pitchSentDate: "",
    landedDate: "2022-01-28",
    notes: "Real headline/date/URL/sentiment confirmed Aug 25 from the same deck's Appendix news-clips table (timestamp 6:02:22).",
    campaign: "Media Relations Coverage — January 2022",
  },
  {
    publication: "The Birmingham Times",
    headline: "HABD's David Northern Sr. Named Head of Houston Housing Authority",
    articleUrl: "http://www.birminghamtimes.com/2022/01/habds-david-northern-sr-named-head-of-houston-housing-authority/",
    publicationDate: "2022-01-27",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "positive",
    pitchSentDate: "",
    landedDate: "2022-01-27",
    notes: "Real headline/date/URL/sentiment confirmed Aug 25 from the Appendix news-clips table (timestamp 8:00:41). Covers Northern's prior role at the Housing Authority of the Birmingham District (HABD) before Houston.",
    campaign: "Media Relations Coverage — January 2022",
  },
  {
    publication: "Yahoo Finance",
    headline: "Houston Housing Authority Board of Directors Announces David A. Northern, Sr. as President & CEO",
    articleUrl: "https://finance.yahoo.com/news/houston-housing-authority-board-directors-161000092.html",
    publicationDate: "2022-01-26",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "positive",
    pitchSentDate: "",
    landedDate: "2022-01-26",
    notes:
      "Real headline/date/URL/sentiment confirmed Aug 25 from the Appendix news-clips table (timestamp 11:10:00) — the underlying press release, syndicated; see the Daily Advent Nigeria and PRWeb placements below for the same story on other wires, each counted as its own placement per Tenyse's own reporting deck.",
    campaign: "Media Relations Coverage — January 2022",
  },
  {
    publication: "Daily Advent Nigeria",
    headline: "Houston Housing Authority Board of Directors Announces David A. Northern, Sr. as President & CEO",
    articleUrl: "https://www.dailyadvent.com/news/67c051804b11f9352d870cef9e0c523d-Houston-Housing-Authority-Board-of-Directors-Announces-David-A-Northern-Sr-as-President--CEO",
    publicationDate: "2022-01-26",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "positive",
    pitchSentDate: "",
    landedDate: "2022-01-26",
    notes: "Same syndicated press release as the Yahoo Finance placement above, on a different wire — real headline/date/URL/sentiment confirmed Aug 25 from the Appendix news-clips table (timestamp 11:10:00).",
    campaign: "Media Relations Coverage — January 2022",
  },
  {
    publication: "PRWeb",
    headline: "Houston Housing Authority Board of Directors Announces David A. Northern, Sr. as President & CEO.",
    articleUrl: "https://muckrack.com/link/oALYJt/houston-housing-authority-board-of-directors-announces-david-a-northern-sr-as-president-ceo",
    publicationDate: "2022-01-26",
    client: "Houston Housing Authority",
    aveValue: "",
    sentiment: "positive",
    pitchSentDate: "",
    landedDate: "2022-01-26",
    notes:
      'Same syndicated press release as the two placements above, on a third wire — real headline/date/URL/sentiment confirmed Aug 25 from the Appendix news-clips table (timestamp 7:00:00). Snippet: "HHA provides affordable homes and services to more than 60,000 low-income Houstonians, including over 17,000 families housed through the Housing Choice Voucher Program... and another 5,700 living in 25 public housing and tax credit developments."',
    campaign: "Media Relations Coverage — January 2022",
  },
];

// Real Campaign records — status "completed" for all: these are closed
// historical case studies, not work currently in progress, so "active"
// would misrepresent them on the owner's Active Campaigns count.
// startDate is left blank for the same reason most placement dates above
// are recording-date placeholders — no exact start date exists in the
// source material for most of these, and inventing one would fail the
// same "no invented numbers" rule this whole file follows for dollar
// figures. duration is filled in wherever the deck states one directly.
const REAL_CASE_STUDY_CAMPAIGNS = [
  { name: "CPG Product Line Launch", client: "VeganHood", status: "completed", startDate: "", duration: "30 days" },
  { name: "Samsung USA Brand Partnership & Activation", client: "VeganHood", status: "completed", startDate: "" },
  { name: "Vegan Dining Month", client: "VegansBaby — Vegan Dining Month", status: "completed", startDate: "" },
  { name: "National Press Push", client: "Candlelit Care", status: "completed", startDate: "" },
  { name: "Deeper Than Visibility", client: "SNAP Co.", status: "completed", startDate: "" },
  { name: "Social Media Management", client: "Houston Housing Authority", status: "completed", startDate: "", duration: "120 days" },
  { name: "Media Relations Coverage — January 2022", client: "Houston Housing Authority", status: "completed", startDate: "2022-01-01", duration: "1 month" },
  { name: "Social Media Management", client: "Nude Barre", status: "completed", startDate: "", duration: "90 days" },
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
The campaign delivered coverage across 8 outlets in one bundled placement effort, landing the product line in VegOut, QSR, VegWorld Magazine, Patch, PIX11, and NBC — a spread that hits both the vegan/CPG trade audience and general consumer awareness through local and national broadcast. This coverage generated a Total Publicity Value of **$492,198** and an Audience Reach of **14.2M** — both independently confirmed directly from VeganHood's own case-study deck.

Separately, a Samsung USA brand partnership and activation generated an additional $100,000 in advertising value from a Times Square billboard reaching over 2 million individuals, plus an influencer partnership that grew VeganHood's Instagram following from 5K to 19.7K (a 190% increase). This is tracked as its own campaign, not folded into the CPG launch total above.`,

  "SNAP Co.": `# SNAP Co. — Deeper Than Visibility: Press Coverage Executive Summary

**Problem**
SNAP Co. needed press coverage that extended the Deeper Than Visibility campaign's reach across Blavity News, NewsOne, LGBTQ Nation, and 102.7 KIIS FM — outlets that reach distinct, high-value audiences.

**Solution**
We secured placements across four editorially credible outlets spanning Black culture, LGBTQ+ news, and mainstream radio, prioritizing Audience Reach and message alignment over volume of coverage.

**Results**
This period delivered 4 confirmed placements, all real headlines/dates/URLs now on file: Blavity News (op-ed, 3/31/22, 4,098,693 monthly reach), NewsOne ("Deeper Than Visibility" report launch coverage, 1,168,000 monthly reach), LGBTQ Nation (3/31/22, 995,689 monthly reach), and 102.7 KIIS FM (3/31/22 per byline — though the article URL itself is dated 2021, an unresolved conflict in the source material — 108,477 monthly reach). Combined confirmed reach: 6,370,859. All four are confirmed **positive** in tone and sentiment, sourced directly from Tenyse's case-study deck rather than left blank.

Total Publicity Value for this period is 0 — no dollar-equivalent value was generated or reported for this client this cycle, and we're not substituting an estimate.

**Bottom line:** the campaign secured real, verifiable reach and confirmed positive sentiment across all four placements. No Publicity Value exists to report this period — a gap, not an omission we're smoothing over.`,

  "VegansBaby — Vegan Dining Month": `# Vegan Dining Month — Press Coverage Executive Summary

**Problem**
Vegan Dining Month required a coordinated multi-city push across NYC, Las Vegas, Portland, Seattle, and Eugene to drive visibility for the campaign, anchored by a high-profile Samsung Times Square billboard placement.

**Solution**
We executed a bundled, multi-market media strategy — including Las Vegas' Blend Morning Show (Tacotarian), Portland's KOIN 6 Morning News (Junior's Café), and a POPSUGAR Wellness social partnership — pairing the flagship Times Square billboard activation with coordinated local press outreach across all five cities.

**Results**
The campaign secured coverage across 8 news outlets, generating a combined 8 news clips and a Total Publicity Value of $400,000. Audience Reach is reported inconsistently within the source material itself: one slide (covering all 5 cities) states 5.63 million; another slide (covering only 3 of the 5 cities) states 18 million — larger than the full 5-city figure, which can't both be right, and the larger figure's slide carries a leftover label referencing a different client's name. Using 5.63M here as the better-supported figure, flagged as needing direct confirmation rather than resolved.

Tone & Sentiment data was not provided for this campaign.`,

  "Candlelit Care": `# Candlelit Care — National Press Push Executive Summary

**Problem**
Candlelit Care (formerly Candlelit Therapy), a health-tech startup actively seeking investors, needed press coverage highlighting its culturally competent perinatal coaching product to attract investment and awareness.

**Solution**
A public relations strategy encompassing a detailed action plan, media outreach, and client feedback loop, securing coverage across Essence Magazine, 21Ninety, Yahoo News, Parents, SELF Magazine, and one additional outlet.

**Results**
The deck reports a Total Publicity Value of $492,198 and an Audience Reach of 14.2M across 6 outlet features. **This figure is flagged, not confirmed**: it is identical to VeganHood's separately-reported CPG campaign figure despite an entirely different outlet list, and other slides in the same overall deck show evidence of a reused report template (a "Clips" definition referencing "Candlelit Therapy" appearing under a different client's section). Do not report this number to Candlelit Care as confirmed without checking the original Meltwater/Coverage Books/SimilarWeb export first.`,
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
    notes: 'Tenyse\'s email explicitly named YAMAAS!, VeganHood, El Pastor Cheese, and Candlelit Care as past/portfolio-only clients — SNAP Co. was not mentioned either way, so status is left honestly unconfirmed rather than assumed active or past. Full name confirmed via case-study deck: "Solutions Not Punishment Collaborative."',
  },
  {
    name: "VegansBaby — Vegan Dining Month",
    status: "unconfirmed",
    engagementType: "pr",
    industry: "",
    contactEmail: "",
    engagementStartDate: "",
    notes: "Same reasoning as SNAP Co. above — not named in Tenyse's past-clients list, but never explicitly confirmed current either. Founder confirmed via case-study deck: Diana Edelman.",
  },
  {
    name: "Candlelit Care",
    status: "past",
    engagementType: "pr",
    industry: "Health-Tech (culturally competent perinatal coaching)",
    contactEmail: "",
    engagementStartDate: "",
    notes:
      'Named directly by Tenyse in the same email that confirmed VeganHood as past/portfolio-only ("YAMAAS!, VeganHood, El Pastor Cheese, and Candlelit Care"). Formerly named Candlelit Therapy. Founder/CEO: Lauren Elliott, MPH. See the "National Press Push" campaign\'s DUPLICATE-FIGURE FLAG — its reported $492,198/14.2M matches VeganHood\'s CPG figure exactly, unresolved.',
  },
  {
    name: "Houston Housing Authority",
    status: "unconfirmed",
    engagementType: "pr",
    industry: "Government Relations / Public Housing",
    contactEmail: "",
    engagementStartDate: "",
    notes:
      `ATTRIBUTION FLAG, not resolved: the second, more detailed Aug 25 deck for this client is branded "Etched" throughout ("Etched pitched and secured...", "Etched will continue media pitching...") — not "Verified Consulting." Every placement/number below is entered as real regardless, but worth asking Tenyse directly whether Etched is a dba/team name for her own agency, a subcontractor she worked with on this account, or something else — the numbers are trustworthy, the attribution isn't confirmed.

SOCIAL MEDIA (Facebook), 120-day period — two different summary slides in the source material give different precision for what may be the same underlying numbers, not confirmed as identical: an earlier, rounder slide states 50% engagement rate / 45% profile visits / 50% likes; a more detailed Dec 2021→Jan 2022 slide states 349.2% increase in Facebook Page Audience Reach / 48.2% increase in Facebook Page visits / 50.0% increase in Facebook Page likes (this last one matches closely). Also real: 18.3K Facebook followers (63.9% Houston TX, 71.1% women/28.9% men). Per-post highlights: a "David Northern Announcement" post reached 4.5K with 377 comments/642 likes/22 shares; other posts reached 409–699 with much lower engagement. No AVE/reach dollar figure exists for the social work itself; tracked as the "Social Media Management" Campaign record since Campaign records have no free-text notes field.

PRESS COVERAGE, January 2022 (see the "Media Relations Coverage — January 2022" campaign's real placements above — 7 real articles with headline/date/URL/sentiment): aggregate reported as 13M Total Audience Reach, 52,017,641 Viewership, 6 Clips, 83.3% Positive / 16.7% Neutral sentiment (source: Meltwater, SimilarWeb, NewsEdge per the deck). SECOND POSSIBLE TEMPLATE-REUSE FLAG: the slide carrying these aggregate numbers defines "Clips" in its own Terminology Guide as "the number of news clips mentioning HHFH" — not "HHA" (Houston Housing Authority), the actual client name used everywhere else in this same deck. Same pattern as the confirmed "Candlelit Therapy" leftover label found in the VeganHood/Vegan Dining Month batch — flagging, not confirming, since it could also just be an internal abbreviation.

WEBSITE TRAFFIC, January 2022 — three separate microsites reported, not the main HHA site: East End Microsite (22 visits, +144% MoM); "2100 Memorial Microsite" at thirdwardchoice.com (100 users, 1m21s avg engagement); "Third Ward Choice Microsite," ALSO at thirdwardchoice.com (45 users, 3m00s avg engagement) — two different user counts for what appears to be the same domain in the same month, not reconciled. The deck's own author flagged the Third Ward Choice country breakdown (US/China/Canada/Uganda) as ambiguous — could mean served population or just search-topic overlap — a good model for how this file handles its own uncertain figures.

UPCOMING (as of the Jan 2022 snapshot, not confirmed as materialized): interviews pitched/secured with Houston Chronicle and Texas Multifamily & Affordable Housing Business Magazine; a requested Blavity byline on affordable housing policy.`,
  },
  {
    name: "Nude Barre",
    status: "unconfirmed",
    engagementType: "pr",
    industry: "Fashion / Apparel (hosiery)",
    contactEmail: "",
    engagementStartDate: "",
    notes:
      "Social media management engagement, not press placements — real results reported over a 90-day period (Instagram Analytics per the deck): 20% engagement rate, 34% profile visits, 35% follower increase. No AVE/reach dollar figures exist for this engagement; it's tracked as a Campaign record (\"Social Media Management\") with these numbers here since Campaign records have no free-text notes field to hold them.",
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
 *
 * MIGRATION STEP: the 4 SNAP Co. placements changed headline text on Aug
 * 25 (placeholder headlines replaced with real ones) — since the dedup
 * check below is headline-based, a browser that already ran the old
 * version of this seed would otherwise end up with both the old
 * placeholder row AND the new real-headline row for the same coverage.
 * This removes any row still carrying the old placeholder headline marker
 * before the normal add-if-not-duplicate loop runs, so re-seeding
 * replaces stale rows instead of duplicating alongside them.
 */
export function seedRealCaseStudyData() {
  const existingPlacements = loadPlacements();
  for (const p of existingPlacements) {
    if (p.client === "SNAP Co." && p.headline?.startsWith(LEGACY_SNAP_HEADLINE_MARKER)) {
      deletePlacement(p.id);
    }
  }

  const placementsAfterMigration = loadPlacements();
  const isDuplicatePlacement = (row) =>
    placementsAfterMigration.some((p) => p.publication === row.publication && p.client === row.client && p.headline === row.headline);

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
