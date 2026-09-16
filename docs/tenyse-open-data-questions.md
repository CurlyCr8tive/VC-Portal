<!-- docs/tenyse-open-data-questions.md -->

# Open data questions for Tenyse

Four questions blocking work that cannot be answered from the case-study
screenshots alone. Each one is blocking something specific — none is
housekeeping. Written to be readable as-is if it's easier to forward the
section than to reword it.

Last updated: September 15, 2026

---

## 1. The $492,198 figure appears twice (highest priority)

**What we're seeing:** the identical figure — **$492,198 AVE and 14.2M
audience reach** — appears in two different case studies:

- **VeganHood**, CPG product line launch — 8 outlets (VegOut, QSR, VegWorld
  Magazine, Patch, PIX11, NBC + 2 unnamed)
- **Candlelit Care**, national press push — 6 outlets (Essence, 21Ninety,
  Yahoo News, Parents, SELF + 1 unnamed)

Completely different outlets, completely different campaigns, the same
dollar figure and the same reach figure down to the digit.

**Why it can't be a coincidence:** AVE is a sum of per-outlet ad-rate
equivalents. Two separately-calculated campaigns with different outlet
lists arriving at the same total to the dollar isn't plausible.

**The likely mechanism** (evidence, not a guess): a "Terminology Guide"
slide sitting under **Vegan Dining Month's** section of the same deck
defines "Clips" as "the number of news clips mentioning **Candlelit
Therapy**" — a different client's name left in place. That's direct
evidence the Canva report template carries stat blocks between clients
without every field being updated.

**The question:** checking the original Meltwater or Coverage Books export
for either campaign — which of these is the real figure, and which client
does it belong to?

**What it's blocking:** this figure is **$984,396 of the $1,484,396** total
currently on the owner dashboard — about two-thirds of the headline number.
Until it's resolved, that total can't be shown to a client with confidence.
It's now marked with a warning in the app rather than removed, since the
figure is probably real for *one* of the two and guessing which would be
worse than flagging it.

---

## 2. Vegan Dining Month — 5.63M or 18M reach?

Two slides in the same deck give different totals:

- The **Executive Summary** slide, explicitly covering all 5 cities (NYC,
  Las Vegas, Portland, Seattle, Eugene): **5.63 million**
- A later slide labeled "Overall Coverage Summary of Portland, Seattle &
  Eugene" — only 3 of the 5 cities: **18,000,000**

A 3-city subset can't exceed the 5-city total. One of the two is wrong.

The 3-city slide is also the one carrying the leftover "Candlelit Therapy"
label from question 1, which is some evidence against it — but not enough
to overwrite the number without confirmation.

**Currently using:** 5.63M, as the better-supported of the two.

**The question:** which figure is correct for the full campaign?

---

## 3. 102.7 KIIS FM — what does "108,477 K" mean?

The SNAP Co. deck lists KIIS FM's reach as **"108,477 K Monthly readers &
Viewers."** If "K" means thousands, that's 108 million/month for a
single-market radio station — well above Blavity News's national digital
reach (4.1M) in the same deck.

The same "K" suffix appears on **LGBTQ Nation's** figure (995,689 K), where
995,689 on its own is already plausible next to Blavity and NewsOne.

**Currently using:** the raw numbers (108,477 and 995,689), treating "K" as
a leftover column-header artifact from the source export rather than a real
multiplier — applied consistently to both.

**The question:** is that right, or is one of them genuinely in thousands?

---

## 4. Per-outlet rates — the one that unblocks the AVE agent

This is the gap that keeps the AVE calculator from doing anything at all.

**How it works now:** the owner enters an outlet name and clicks Calculate.
The app looks the outlet up in its rate table and returns `rate × multiplier`.
If the outlet isn't there, it says so and offers manual entry — it never
guesses a number.

**The problem:** the rate table is **empty**. Not by accident — no real
per-outlet rate has ever been confirmed, and seeding invented ones to make
the feature look alive would defeat the point. So every lookup currently
returns "not found."

**Why the case-study numbers can't fill it:** they're campaign-level totals
across bundled outlets ($492,198 across 8 outlets, $400,000 for a multi-city
campaign). There's no way to split a bundled total back into per-outlet
rates without knowing how it was split originally.

**The question — any one of these would start it:**

- Is there a saved Meltwater or Coverage Books export with **per-outlet**
  values, rather than campaign totals?
- For any single placement, is the individual dollar figure recorded
  anywhere?
- Failing both: pick 5–10 outlets placed most often (Forbes, Essence,
  Blavity, PIX11, NBC…) and establish a rate for each once. From then on
  the app reuses them automatically, and the table grows on its own as new
  outlets get rates saved.

The third option needs no historical data — just one pass through the
outlets that come up most.

---

## Status of the client roster (related, lower priority)

Four clients are recorded as **status unconfirmed**, so they appear under
"All clients" but under neither Current nor Previous: **SNAP Co., Vegan
Dining Month, Houston Housing Authority, Nude Barre**.

Tenyse's email named YAMAAS!, VeganHood, El Pastor Cheese, and Candlelit
Care as past/portfolio clients and didn't mention these four either way.
They're left unconfirmed deliberately rather than bucketed on a guess.

**Sunny Sparkling Co.** is in the demo dataset only — invented numbers with
no case-study material behind it — and stays out of the real data until
confirmed to be a real client.
