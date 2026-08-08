// Dev/testing convenience only — NOT part of the product. Adds a handful of
// realistic, COMPLETE placements (every field the Canva export requires is
// filled in) through the exact same createPlacement()/addPlacement() path
// the real form uses, so there's something real to click "Generate CSV" on
// without hand-typing five rows first. Triggered from the owner Settings
// view, behind a confirm() since it writes to real localStorage data.

import { createPlacement } from "../schema.js";
import { addPlacement } from "../storage.js";

const SAMPLE_PLACEMENTS = [
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

export function seedSamplePlacements() {
  SAMPLE_PLACEMENTS.forEach((raw) => addPlacement(createPlacement(raw)));
  return SAMPLE_PLACEMENTS.length;
}
