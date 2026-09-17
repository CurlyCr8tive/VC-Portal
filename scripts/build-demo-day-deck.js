// Demo Day deck generator — Verified Consulting x Pursuit, Sept 23 2026.
//
// Structure follows the Sept 11 alignment meeting: intro to Tenyse and
// Verified Consulting, the manual-PR-tracking problem, the platform demo,
// then a bridge through the coaching modules into a Raise Local overview.
//
// Palette is Verified Consulting's own (portal-styles.css), not a generic
// deck theme — navy dominant, coral accent, teal support.
//
// Rebuild:  node scripts/build-demo-day-deck.js

import pptxgen from "pptxgenjs";

const NAVY = "1F2A52";
const NAVY_LIGHT = "2E3B6E";
const CORAL = "E2735A";
const CORAL_DARK = "C85A42";
const CORAL_TINT = "FBE2DA";
const TEAL = "3F9E97";
const TEAL_TINT = "E1F2F0";
const CREAM = "F2EEE8";
const INK = "2B2320";
const MUTED = "7A6D64";
const WHITE = "FFFFFF";

const HEAD = "Cambria";
const BODY = "Calibri";

const W = 13.3;
const H = 7.5;
const M = 0.75; // page margin

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Cherice Heron";
pres.title = "Verified Consulting — Demo Day";

/** Section label + big title, the repeated header treatment on light slides. */
function lightHeader(slide, kicker, title) {
  slide.addText(kicker.toUpperCase(), {
    x: M, y: 0.52, w: 8, h: 0.3,
    fontFace: BODY, fontSize: 12, bold: true, color: CORAL, charSpacing: 2,
    isTextBox: true, margin: 0,
  });
  slide.addText(title, {
    x: M, y: 0.88, w: W - M * 2, h: 0.85,
    fontFace: HEAD, fontSize: 38, bold: true, color: NAVY,
    isTextBox: true, margin: 0,
  });
}

/** Numbered circle used as the visual motif across content slides. */
function numberedBadge(slide, n, x, y, fill = CORAL) {
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: 0.52, h: 0.52,
    fill: { color: fill },
  });
  slide.addText(String(n), {
    x, y, w: 0.52, h: 0.52,
    fontFace: BODY, fontSize: 16, bold: true, color: WHITE,
    align: "center", valign: "middle", isTextBox: true, margin: 0,
  });
}

// ---------------------------------------------------------------- slide 1
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addShape(pres.ShapeType.ellipse, { x: 10.4, y: -1.5, w: 5.2, h: 5.2, fill: { color: NAVY_LIGHT } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.9, y: 4.6, w: 2.6, h: 2.6, fill: { color: CORAL }, transparency: 35 });

  s.addText("VERIFIED CONSULTING", {
    x: M, y: 2.0, w: 9, h: 0.35,
    fontFace: BODY, fontSize: 14, bold: true, color: CORAL, charSpacing: 3,
    isTextBox: true, margin: 0,
  });
  s.addText("Proof of the work,\nwithout the $50,000 software.", {
    x: M, y: 2.5, w: 9.2, h: 2.0,
    fontFace: HEAD, fontSize: 44, bold: true, color: WHITE, lineSpacing: 50,
    isTextBox: true, margin: 0,
  });
  s.addText("A PR measurement platform built for how Tenyse actually works — and a first look at what comes next.", {
    x: M, y: 4.6, w: 8.6, h: 0.7,
    fontFace: BODY, fontSize: 16, color: CREAM,
    isTextBox: true, margin: 0,
  });
  s.addText("Tenyse Williams  ·  Cherice Heron        Pursuit Demo Day  ·  September 23, 2026", {
    x: M, y: 6.4, w: 11, h: 0.4,
    fontFace: BODY, fontSize: 12, color: MUTED,
    isTextBox: true, margin: 0,
  });
  s.addNotes(
    "Tenyse opens. Introduce yourself and Verified Consulting in your own words — who you work with and what you do for them. Then hand to Cherice for the problem."
  );
}

// ---------------------------------------------------------------- slide 2
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  lightHeader(s, "Who this is for", "Verified Consulting");

  s.addText(
    "Tenyse Williams runs a PR practice that places founders and mission-driven organizations in national press. The results are real and documented — the problem was never the work. It was proving it.",
    {
      x: M, y: 1.95, w: 6.5, h: 1.4,
      fontFace: BODY, fontSize: 16, color: INK, lineSpacing: 24,
      isTextBox: true, margin: 0,
    }
  );

  const stats = [
    { v: "50+", l: "outlets placed for a single client" },
    { v: "217M", l: "audience reach, cumulative" },
    { v: "$18M", l: "lifetime publicity value, one client" },
  ];
  stats.forEach((st, i) => {
    const x = M + i * 2.25;
    s.addText(st.v, {
      x, y: 3.7, w: 2.1, h: 0.75,
      fontFace: HEAD, fontSize: 40, bold: true, color: CORAL,
      isTextBox: true, margin: 0,
    });
    s.addText(st.l, {
      x, y: 4.45, w: 2.0, h: 0.8,
      fontFace: BODY, fontSize: 12, color: MUTED,
      isTextBox: true, margin: 0,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 7.9, y: 1.9, w: 4.65, h: 4.4,
    fill: { color: TEAL_TINT }, rectRadius: 0.14,
  });
  s.addText("Clients in the platform today", {
    x: 8.25, y: 2.2, w: 4, h: 0.35,
    fontFace: BODY, fontSize: 13, bold: true, color: NAVY,
    isTextBox: true, margin: 0,
  });
  s.addText(
    [
      { text: "VeganHood", options: { bullet: true, breakLine: true } },
      { text: "Candlelit Care", options: { bullet: true, breakLine: true } },
      { text: "SNAP Co. (Solutions Not Punishment Collaborative)", options: { bullet: true, breakLine: true } },
      { text: "Houston Housing Authority", options: { bullet: true, breakLine: true } },
      { text: "Nude Barre", options: { bullet: true, breakLine: true } },
      { text: "VegansBaby — Vegan Dining Month", options: { bullet: true, breakLine: true } },
      { text: "Greyz Bistro", options: { bullet: true } },
    ],
    {
      x: 8.25, y: 2.65, w: 4.0, h: 3.4,
      fontFace: BODY, fontSize: 13, color: INK, paraSpaceAfter: 8,
      isTextBox: true, margin: 0,
    }
  );
  s.addNotes(
    "Keep this short — Tenyse's own framing is better than anything on the slide. The point to land: the track record is real, the measurement was the gap."
  );
}

// ---------------------------------------------------------------- slide 3
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  lightHeader(s, "The problem", "Proving the work took as long as doing it");

  const rows = [
    {
      h: "Placements lived in a dozen places",
      b: "Coverage tracked by hand across email threads, spreadsheets and screenshots — with no single record of what ran, when, or for whom.",
    },
    {
      h: "Every client report meant starting over",
      b: "Pulling the same placements together again, re-checking dates and links, rebuilding the same summary in Canva each time.",
    },
    {
      h: "The tools that solve this cost $30–50K a year",
      b: "Meltwater, Coverage Books, SimilarWeb, NewsEdge — enterprise pricing for an independent practice. Tenyse had subscribed before; it isn't sustainable.",
    },
  ];
  rows.forEach((r, i) => {
    const y = 2.1 + i * 1.5;
    numberedBadge(s, i + 1, M, y, i === 2 ? CORAL_DARK : CORAL);
    s.addText(r.h, {
      x: M + 0.8, y: y - 0.04, w: 7.2, h: 0.4,
      fontFace: BODY, fontSize: 17, bold: true, color: NAVY,
      isTextBox: true, margin: 0,
    });
    s.addText(r.b, {
      x: M + 0.8, y: y + 0.38, w: 7.2, h: 0.9,
      fontFace: BODY, fontSize: 13, color: MUTED, lineSpacing: 19,
      isTextBox: true, margin: 0,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 9.15, y: 2.3, w: 3.4, h: 3.5,
    fill: { color: NAVY }, rectRadius: 0.14,
  });
  // Not in quotation marks on purpose — this describes the workflow rather
  // than putting words in Tenyse's mouth in front of an audience she's in.
  s.addText("Valuing a placement meant asking ChatGPT for an estimate and pasting the answer into the report.", {
    x: 9.45, y: 2.75, w: 2.8, h: 2.0,
    fontFace: HEAD, fontSize: 15, italic: true, color: WHITE, lineSpacing: 22,
    isTextBox: true, margin: 0,
  });
  s.addText("— the workflow we replaced", {
    x: 9.45, y: 5.05, w: 2.8, h: 0.35,
    fontFace: BODY, fontSize: 11, color: CORAL,
    isTextBox: true, margin: 0,
  });
  s.addNotes(
    "This is the emotional centre of the pitch. Tenyse should say the third point out loud — that she has paid enterprise prices for this before — because it makes the build's value concrete."
  );
}

// ---------------------------------------------------------------- slide 4
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  lightHeader(s, "What we built", "One place for the whole cycle");

  const mods = [
    { t: "Owner dashboard", d: "Every client, placement and campaign in one view." },
    { t: "Press placements", d: "A real record — outlet, headline, link, dates, campaign." },
    { t: "AVE calculation", d: "Publicity value per placement, derived and sourced." },
    { t: "Mentions discovery", d: "Searches the web for new coverage, queues it for review." },
    { t: "Client portal", d: "Clients log in and see their own results. No PDF chasing." },
    { t: "Reports & export", d: "Period reports that drop into her existing Canva templates." },
  ];
  mods.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = M + col * 4.0;
    const y = 2.1 + row * 2.15;
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: 3.65, h: 1.85,
      fill: { color: WHITE }, rectRadius: 0.12,
      shadow: { type: "outer", color: NAVY, blur: 10, offset: 2, angle: 90, opacity: 0.1 },
    });
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.3, y: y + 0.32, w: 0.34, h: 0.34,
      fill: { color: i % 2 === 0 ? TEAL : CORAL },
    });
    s.addText(m.t, {
      x: x + 0.78, y: y + 0.28, w: 2.7, h: 0.4,
      fontFace: BODY, fontSize: 15, bold: true, color: NAVY,
      isTextBox: true, margin: 0,
    });
    s.addText(m.d, {
      x: x + 0.3, y: y + 0.82, w: 3.05, h: 0.85,
      fontFace: BODY, fontSize: 12, color: MUTED, lineSpacing: 17,
      isTextBox: true, margin: 0,
    });
  });
  s.addNotes("Don't read the grid. Name the six, then go straight to the live demo.");
}

// ---------------------------------------------------------------- slide 5
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addText("LIVE DEMO", {
    x: M, y: 2.5, w: 8, h: 0.4,
    fontFace: BODY, fontSize: 14, bold: true, color: CORAL, charSpacing: 3,
    isTextBox: true, margin: 0,
  });
  s.addText("The platform, running on\nTenyse's real client data.", {
    x: M, y: 2.95, w: 9, h: 1.6,
    fontFace: HEAD, fontSize: 36, bold: true, color: WHITE, lineSpacing: 44,
    isTextBox: true, margin: 0,
  });
  s.addText("Owner dashboard  →  a client's placements  →  AVE on a new placement  →  the client's own portal", {
    x: M, y: 4.75, w: 10.5, h: 0.5,
    fontFace: BODY, fontSize: 15, color: CREAM,
    isTextBox: true, margin: 0,
  });
  s.addNotes(
    "DEMO ORDER — rehearse this exact path:\n1. Owner dashboard, real data source selected. SIGN IN WITH THE REAL SUPABASE OWNER ACCOUNT, not the demo link — the AVE research and discovery features are hidden on the mock login.\n2. Open SNAP Co. Use SNAP Co. specifically: all four of its outlets have sourced audience figures, so Calculate returns a real range. Houston Housing Authority has more placements but none of its outlets have figures yet, so the calculator falls through there.\n3. Press Placements — add one for Blavity News, click Calculate: it returns $3,416 – $37,913 with the source named. Then try QSR Magazine, which has no figure, and use Research this rate — it comes back with a sourced estimate from the outlet's own published ad rates.\n4. Tick 'save this rate for next time' — the next placement at that outlet returns the saved rate instantly. That arc is the whole feature.\n5. Log in as a client and show the same coverage from their side.\n\nIf the network is unreliable, fall back to screenshots — have them open in a tab before you start."
  );
}

// ---------------------------------------------------------------- slide 6
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  lightHeader(s, "The hard part", "What a placement was actually worth");

  s.addText(
    "AVE — advertising value equivalent — is how Tenyse's clients understand what she delivered. It's also the number the expensive tools exist to produce. So the agent had to get it right without inventing anything.",
    {
      x: M, y: 1.95, w: 7.2, h: 1.1,
      fontFace: BODY, fontSize: 15, color: INK, lineSpacing: 23,
      isTextBox: true, margin: 0,
    }
  );

  const points = [
    { t: "It never guesses.", d: "No saved rate for an outlet means it says so — it will not fall back to a placeholder or a zero." },
    { t: "It shows its working.", d: "Every estimate names the audience figure behind it, where that figure came from, and when." },
    { t: "It flags what's uncertain.", d: "A figure with a known data problem is marked, and the dashboard says how much of the total rests on it." },
  ];
  points.forEach((p, i) => {
    const y = 3.25 + i * 1.15;
    s.addShape(pres.ShapeType.ellipse, { x: M, y: y + 0.04, w: 0.3, h: 0.3, fill: { color: TEAL } });
    s.addText(p.t, {
      x: M + 0.5, y, w: 3.0, h: 0.38,
      fontFace: BODY, fontSize: 15, bold: true, color: NAVY,
      isTextBox: true, margin: 0,
    });
    s.addText(p.d, {
      x: M + 3.5, y, w: 4.0, h: 0.85,
      fontFace: BODY, fontSize: 12.5, color: MUTED, lineSpacing: 18,
      isTextBox: true, margin: 0,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.55, y: 1.9, w: 4.0, h: 4.5,
    fill: { color: NAVY }, rectRadius: 0.14,
  });
  s.addText("Built from the same formulas the paid platforms publish", {
    x: 8.85, y: 2.25, w: 3.4, h: 0.85,
    fontFace: BODY, fontSize: 13, bold: true, color: CORAL, lineSpacing: 19,
    isTextBox: true, margin: 0,
  });
  s.addText(
    "Muck Rack and Agility PR both document how they calculate AVE. The platform applies both and shows the range, rather than pretending to a precision the industry doesn't have.",
    {
      x: 8.85, y: 3.2, w: 3.4, h: 1.8,
      fontFace: BODY, fontSize: 12.5, color: CREAM, lineSpacing: 19,
      isTextBox: true, margin: 0,
    }
  );
  s.addText("Checked against Tenyse's own campaign results — the model lands within 1%.", {
    x: 8.85, y: 5.25, w: 3.4, h: 0.95,
    fontFace: BODY, fontSize: 12.5, italic: true, color: TEAL_TINT, lineSpacing: 19,
    isTextBox: true, margin: 0,
  });
  s.addNotes(
    "The 1% line is worth pausing on: we reproduced her own reported campaign figures from published formulas, which is how we know the model matches her methodology rather than approximating it."
  );
}

// ---------------------------------------------------------------- slide 7
{
  const s = pres.addSlide();
  s.background = { color: TEAL_TINT };
  lightHeader(s, "The bridge", "Coverage is the start, not the finish");

  s.addText(
    "The coaching modules came out of a pattern Tenyse kept seeing: a client lands national press, and then isn't sure what to do with it. Visibility doesn't convert itself.",
    {
      x: M, y: 1.95, w: 6.4, h: 1.1,
      fontFace: BODY, fontSize: 16, color: INK, lineSpacing: 24,
      isTextBox: true, margin: 0,
    }
  );

  const steps = ["Coverage lands", "Client is coached through it", "It turns into revenue", "Community becomes the next channel"];
  steps.forEach((st, i) => {
    const x = M + i * 3.0;
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 3.5, w: 2.6, h: 1.5,
      fill: { color: i === 3 ? CORAL : WHITE }, rectRadius: 0.12,
    });
    s.addText(st, {
      x: x + 0.22, y: 3.72, w: 2.16, h: 1.06,
      fontFace: BODY, fontSize: 14, bold: true, color: i === 3 ? WHITE : NAVY, lineSpacing: 20,
      isTextBox: true, margin: 0,
    });
    if (i < 3) {
      s.addText("›", {
        x: x + 2.6, y: 3.95, w: 0.4, h: 0.6,
        fontFace: BODY, fontSize: 26, bold: true, color: MUTED,
        align: "center", isTextBox: true, margin: 0,
      });
    }
  });

  s.addText("That last step is where Raise Local begins.", {
    x: M, y: 5.5, w: 9, h: 0.5,
    fontFace: HEAD, fontSize: 20, bold: true, italic: true, color: NAVY,
    isTextBox: true, margin: 0,
  });
  s.addNotes(
    "This is the transition slide — the one we agreed the whole bridge hangs on. Tenyse should deliver the last line, since Raise Local is her direction for the business."
  );
}

// ---------------------------------------------------------------- slide 8
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  s.addText("RAISE LOCAL", {
    x: M, y: 1.5, w: 8, h: 0.4,
    fontFace: BODY, fontSize: 14, bold: true, color: CORAL, charSpacing: 3,
    isTextBox: true, margin: 0,
  });
  s.addText("The gap we're filling", {
    x: M, y: 1.95, w: 9, h: 0.8,
    fontFace: HEAD, fontSize: 38, bold: true, color: WHITE,
    isTextBox: true, margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 3.1, w: 5.6, h: 1.65, fill: { color: NAVY_LIGHT }, rectRadius: 0.12 });
  s.addText("Schools and nonprofits need support", {
    x: M + 0.35, y: 3.35, w: 4.9, h: 0.4,
    fontFace: BODY, fontSize: 15, bold: true, color: WHITE, isTextBox: true, margin: 0,
  });
  s.addText("Local campaigns and events, and rarely a budget to run them.", {
    x: M + 0.35, y: 3.78, w: 4.9, h: 0.75,
    fontFace: BODY, fontSize: 13, color: CREAM, lineSpacing: 19, isTextBox: true, margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, { x: 7.0, y: 3.1, w: 5.55, h: 1.65, fill: { color: NAVY_LIGHT }, rectRadius: 0.12 });
  s.addText("Businesses want to give back", {
    x: 7.35, y: 3.35, w: 4.85, h: 0.4,
    fontFace: BODY, fontSize: 15, bold: true, color: WHITE, isTextBox: true, margin: 0,
  });
  s.addText("Meaningfully, and in a way that reaches their own neighbourhood.", {
    x: 7.35, y: 3.78, w: 4.85, h: 0.75,
    fontFace: BODY, fontSize: 13, color: CREAM, lineSpacing: 19, isTextBox: true, margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.05, w: 11.8, h: 1.5, fill: { color: CORAL }, rectRadius: 0.12 });
  s.addText("There is no simple, structured way to match them.", {
    x: M + 0.4, y: 5.25, w: 11.0, h: 0.42,
    fontFace: BODY, fontSize: 16, bold: true, color: WHITE, isTextBox: true, margin: 0,
  });
  s.addText(
    "Corporate gifting closes it — businesses give products or gift packages straight to a campaign, an event, or a community need. Not only cash sponsorship.",
    {
      x: M + 0.4, y: 5.7, w: 11.0, h: 0.65,
      fontFace: BODY, fontSize: 14, color: WHITE, lineSpacing: 20, isTextBox: true, margin: 0,
    }
  );
  s.addNotes(
    "Tenyse's framing, in her words. The distinction that matters: corporate gifting is not sponsorship — a business with product but no budget can still give, and that's most small businesses."
  );
}

// ---------------------------------------------------------------- slide 9
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  lightHeader(s, "How it works", "A short intake, then a real match");

  s.addText(
    "Both sides answer the same ten-question Match Finder. A decision tree reads the answers and surfaces partners that actually fit — cause, category, location, timing and the kind of support being offered.",
    {
      x: M, y: 1.95, w: 6.6, h: 1.2,
      fontFace: BODY, fontSize: 15, color: INK, lineSpacing: 23,
      isTextBox: true, margin: 0,
    }
  );

  s.addText("What kind of partner would best support your campaign?", {
    x: M, y: 3.3, w: 6.6, h: 0.4,
    fontFace: BODY, fontSize: 14, bold: true, color: NAVY,
    isTextBox: true, margin: 0,
  });

  const chips = [
    "Food & beverage", "Products or corporate gifting", "Professional services",
    "Local media", "Venue space", "Event activation", "Corporate sponsorship",
  ];
  let cx = M;
  let cy = 3.85;
  chips.forEach((c) => {
    const w = 0.085 * c.length + 0.4;
    if (cx + w > M + 6.8) { cx = M; cy += 0.62; }
    s.addShape(pres.ShapeType.roundRect, {
      x: cx, y: cy, w, h: 0.48,
      fill: { color: c === "Products or corporate gifting" ? CORAL_TINT : CREAM },
      line: { color: c === "Products or corporate gifting" ? CORAL : "DDD6CE", width: 1 },
      rectRadius: 0.24,
    });
    s.addText(c, {
      x: cx, y: cy, w, h: 0.48,
      fontFace: BODY, fontSize: 11.5,
      color: c === "Products or corporate gifting" ? CORAL_DARK : INK,
      align: "center", valign: "middle", isTextBox: true, margin: 0,
    });
    cx += w + 0.18;
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.1, y: 1.9, w: 4.45, h: 4.55,
    fill: { color: NAVY }, rectRadius: 0.14,
  });
  s.addText("Why a decision tree", {
    x: 8.45, y: 2.25, w: 3.8, h: 0.4,
    fontFace: BODY, fontSize: 15, bold: true, color: CORAL, isTextBox: true, margin: 0,
  });
  s.addText(
    "Every match can be explained. You can point at the answers that produced it and say why these two were put together — which matters when you're asking a business to give something away, and a school to stake an event on it.",
    {
      x: 8.45, y: 2.8, w: 3.8, h: 2.3,
      fontFace: BODY, fontSize: 13, color: CREAM, lineSpacing: 20, isTextBox: true, margin: 0,
    }
  );
  s.addText("Not a black box. That's deliberate.", {
    x: 8.45, y: 5.5, w: 3.8, h: 0.6,
    fontFace: HEAD, fontSize: 15, italic: true, bold: true, color: TEAL_TINT, isTextBox: true, margin: 0,
  });
  s.addNotes(
    "Tenyse asked for 'corporate sponsorship' and then corrected toward 'corporate gifting' — both are on the list now, because they're different asks. Highlighted chip is the new one."
  );
}

// --------------------------------------------------------------- slide 10
{
  const s = pres.addSlide();
  s.background = { color: CREAM };
  lightHeader(s, "A match in practice", "PS 120 PTA, meet Sophia & Grace");

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 2.0, w: 5.5, h: 2.15, fill: { color: WHITE }, rectRadius: 0.12 });
  s.addText("THE ASK", {
    x: M + 0.35, y: 2.25, w: 4.8, h: 0.3,
    fontFace: BODY, fontSize: 11, bold: true, color: TEAL, charSpacing: 2, isTextBox: true, margin: 0,
  });
  s.addText("A school PTA in Brooklyn raising $8,000 for after-school programs, one to three months out.", {
    x: M + 0.35, y: 2.6, w: 4.8, h: 1.3,
    fontFace: BODY, fontSize: 14, color: INK, lineSpacing: 21, isTextBox: true, margin: 0,
  });

  s.addShape(pres.ShapeType.roundRect, { x: 6.9, y: 2.0, w: 5.65, h: 2.15, fill: { color: WHITE }, rectRadius: 0.12 });
  s.addText("THE PARTNER", {
    x: 7.25, y: 2.25, w: 4.9, h: 0.3,
    fontFace: BODY, fontSize: 11, bold: true, color: CORAL, charSpacing: 2, isTextBox: true, margin: 0,
  });
  s.addText("Sophia & Grace — a local bakery that can take volume orders and wants to show up for its own neighbourhood.", {
    x: 7.25, y: 2.6, w: 4.9, h: 1.3,
    fontFace: BODY, fontSize: 14, color: INK, lineSpacing: 21, isTextBox: true, margin: 0,
  });

  const facts = [
    { v: "$2.75", l: "per cookie" },
    { v: "$32", l: "per dozen box" },
    { v: "20 doz.", l: "minimum order" },
    { v: "2–3 days", l: "turnaround at volume" },
  ];
  facts.forEach((f, i) => {
    const x = M + i * 3.0;
    s.addShape(pres.ShapeType.roundRect, { x, y: 4.5, w: 2.75, h: 1.35, fill: { color: NAVY }, rectRadius: 0.12 });
    s.addText(f.v, {
      x: x + 0.25, y: 4.68, w: 2.3, h: 0.6,
      fontFace: HEAD, fontSize: 26, bold: true, color: WHITE, isTextBox: true, margin: 0,
    });
    s.addText(f.l, {
      x: x + 0.25, y: 5.28, w: 2.3, h: 0.4,
      fontFace: BODY, fontSize: 11.5, color: TEAL_TINT, isTextBox: true, margin: 0,
    });
  });

  s.addText("Real pricing from a real business — the match copy fills in from it, so a PTA sees what the partnership actually yields.", {
    x: M, y: 6.1, w: 11.8, h: 0.5,
    fontFace: BODY, fontSize: 13, italic: true, color: MUTED, isTextBox: true, margin: 0,
  });
  s.addNotes(
    "Pricing is Sophia & Grace's own, confirmed with Tenyse. The fundraising arithmetic — how many boxes at what markup reaches $8,000 — is still being set with Tenyse, so speak to the mechanism here, not a specific projection."
  );
}

// --------------------------------------------------------------- slide 11
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  lightHeader(s, "Where this goes", "Built to keep going after today");

  const next = [
    { t: "Live to Tenyse's own database", d: "Moving the platform onto her Supabase account so it's hers outright — data, keys and all." },
    { t: "Discovery agent on a schedule", d: "Coverage found and queued automatically, instead of a search she has to remember to run." },
    { t: "Raise Local, built out", d: "The matchmaking shown today becomes the working product, with real signups already waiting." },
  ];
  next.forEach((n, i) => {
    const y = 2.15 + i * 1.45;
    numberedBadge(s, i + 1, M, y, i === 2 ? CORAL : TEAL);
    s.addText(n.t, {
      x: M + 0.8, y: y - 0.02, w: 6.6, h: 0.4,
      fontFace: BODY, fontSize: 17, bold: true, color: NAVY, isTextBox: true, margin: 0,
    });
    s.addText(n.d, {
      x: M + 0.8, y: y + 0.4, w: 6.5, h: 0.8,
      fontFace: BODY, fontSize: 13, color: MUTED, lineSpacing: 19, isTextBox: true, margin: 0,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.3, y: 2.1, w: 4.25, h: 4.0,
    fill: { color: CORAL_TINT }, rectRadius: 0.14,
  });
  s.addText("The point of all of it", {
    x: 8.65, y: 2.45, w: 3.6, h: 0.4,
    fontFace: BODY, fontSize: 14, bold: true, color: CORAL_DARK, isTextBox: true, margin: 0,
  });
  s.addText(
    "An independent practice gets the measurement infrastructure that used to require an enterprise contract — and keeps the relationships that made the work good in the first place.",
    {
      x: 8.65, y: 3.0, w: 3.6, h: 2.7,
      fontFace: BODY, fontSize: 13.5, color: INK, lineSpacing: 21, isTextBox: true, margin: 0,
    }
  );
  s.addNotes("Hand back to Tenyse to close in her own words.");
}

// --------------------------------------------------------------- slide 12
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addShape(pres.ShapeType.ellipse, { x: -1.6, y: 4.3, w: 4.6, h: 4.6, fill: { color: NAVY_LIGHT } });
  s.addShape(pres.ShapeType.ellipse, { x: 11.2, y: -1.2, w: 3.6, h: 3.6, fill: { color: CORAL }, transparency: 40 });

  s.addText("Thank you", {
    x: M, y: 2.7, w: 9, h: 1.0,
    fontFace: HEAD, fontSize: 46, bold: true, color: WHITE, isTextBox: true, margin: 0,
  });
  s.addText("Tenyse Williams — Verified Consulting\nCherice Heron — Pursuit", {
    x: M, y: 3.9, w: 8, h: 1.0,
    fontFace: BODY, fontSize: 16, color: CREAM, lineSpacing: 26, isTextBox: true, margin: 0,
  });
  s.addText("verifiedconsulting.com", {
    x: M, y: 5.6, w: 6, h: 0.4,
    fontFace: BODY, fontSize: 13, color: CORAL, isTextBox: true, margin: 0,
  });
  s.addNotes("Leave this up for Q&A.");
}

pres.writeFile({ fileName: "Verified Consulting — Demo Day.pptx" }).then((f) => console.log("Wrote", f));
