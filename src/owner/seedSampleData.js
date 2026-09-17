// Dev/testing convenience only — NOT part of the product. Adds a handful of
// realistic, COMPLETE placements (every field the Canva export requires is
// filled in) through the exact same createPlacement()/addPlacement() path
// the real form uses, so there's something real to click "Generate CSV" on
// without hand-typing five rows first. Triggered from the owner Settings
// view, behind a confirm() since it writes to real localStorage data.

import { createPlacement } from "../schema.js";
import { addPlacement, loadPlacements } from "../storage.js";
import { createCampaign } from "../campaignSchema.js";
import { addCampaign, loadCampaigns } from "../campaignStorage.js";

const SAMPLE_PLACEMENTS = [
  {
    publication: "Brooklyn Daily Eagle",
    headline: "Greyz Bistro Partners With WIADCA for Carnival 2026",
    articleUrl: "https://example.com/greyz-wiadca-partnership",
    publicationDate: "2026-09-12",
    client: "Greyz Bistro",
    aveValue: "6750",
    audienceReach: "85000",
    pitchSentDate: "2026-08-26",
    landedDate: "2026-09-12",
    sentiment: "positive",
    notes: "Mock PR placement for demo/testing only. Added so AI writing helpers have campaign context while Tenyse's real Greyz Bistro press data is still missing.",
    campaign: "Visibility to Revenue PR Preview",
  },
  {
    publication: "QNS",
    headline: "Crown Heights Chef Brings Global Flavors Home",
    articleUrl: "https://example.com/greyz-crown-heights-profile",
    publicationDate: "2026-09-10",
    client: "Greyz Bistro",
    aveValue: "4900",
    audienceReach: "62000",
    pitchSentDate: "2026-08-22",
    landedDate: "2026-09-10",
    sentiment: "positive",
    notes: "Mock PR placement for demo/testing only. Represents the Chef Founder / Cultural Voice positioning Tenyse is developing with Chef Garth.",
    campaign: "Visibility to Revenue PR Preview",
  },
  {
    publication: "Forbes",
    headline: "VeganHood Is Redefining Soul Food in NYC",
    articleUrl: "https://example.com/forbes-veganhood",
    publicationDate: "2026-08-01",
    client: "VeganHood",
    aveValue: "18000",
    pitchSentDate: "2026-07-10",
    landedDate: "2026-08-01",
    notes: "",
    campaign: "Fall Press Push",
  },
  {
    publication: "PIX11 News",
    headline: "VeganHood Brings Flavor and Purpose to Harlem",
    articleUrl: "https://example.com/pix11-veganhood",
    publicationDate: "2026-07-28",
    client: "VeganHood",
    aveValue: "6500",
    pitchSentDate: "2026-07-10",
    landedDate: "2026-07-28",
    notes: "",
    campaign: "Fall Press Push",
  },
  {
    publication: "VegNews",
    headline: "VeganHood Expands Plant-Based Soul Food",
    articleUrl: "https://example.com/vegnews-veganhood",
    publicationDate: "2026-07-15",
    client: "VeganHood",
    aveValue: "7500",
    pitchSentDate: "2026-06-28",
    landedDate: "2026-07-15",
    notes: "",
    campaign: "Fall Press Push",
  },
  {
    publication: "Gothamist",
    headline: "Sunny Sparkling Co. Bottles Up a Brooklyn Favorite",
    articleUrl: "https://example.com/gothamist-sunny",
    publicationDate: "2026-07-20",
    client: "Sunny Sparkling Co.",
    aveValue: "5200",
    pitchSentDate: "2026-06-25",
    landedDate: "2026-07-20",
    notes: "",
    campaign: "Product Launch Buzz",
  },
  {
    publication: "Brooklyn Magazine",
    headline: "This Local Soda Brand Is Brooklyn's Next Big Thing",
    articleUrl: "https://example.com/brooklynmag-sunny",
    publicationDate: "2026-08-02",
    client: "Sunny Sparkling Co.",
    aveValue: "4100",
    pitchSentDate: "2026-07-05",
    landedDate: "2026-08-02",
    notes: "",
    campaign: "Product Launch Buzz",
  },
];

const SAMPLE_CAMPAIGNS = [
  {
    name: "Visibility to Revenue PR Preview",
    client: "Greyz Bistro",
    startDate: "2026-08-20",
    duration: "4 weeks",
    status: "active",
  },
];

export function seedSamplePlacements() {
  const existingCampaigns = loadCampaigns();
  for (const raw of SAMPLE_CAMPAIGNS) {
    const exists = existingCampaigns.some((c) => c.name === raw.name && c.client === raw.client);
    if (!exists) addCampaign(createCampaign(raw));
  }

  const existingPlacements = loadPlacements();
  let added = 0;
  for (const raw of SAMPLE_PLACEMENTS) {
    const exists = existingPlacements.some((p) => p.publication === raw.publication && p.client === raw.client && p.headline === raw.headline);
    if (exists) continue;
    addPlacement(createPlacement(raw));
    added += 1;
  }
  return added;
}
