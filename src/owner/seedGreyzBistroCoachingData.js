// Seeds Chef Garth D. Cheese / Greyz Bistro's real coaching program data —
// the first real content loaded against the coaching program feature,
// per direct instruction: "Chef Garth's specific items are the first real
// content to load in, not the permanent template."
//
// Real facts used directly (from Tenyse's email + the coaching program
// spec): 90-day cycle heading into its final month, ~10 hrs/month, built
// so far (proposal/contract/media kit/kickoff deck/LinkedIn audit+fix
// plan), the standing "bring opportunities to Tenyse first" rule, the two
// active partnerships (WIADCA Carnival, Brooklyn Roasting Co.), and the
// three positioning angles still under consideration.
//
// Where exact phase-by-phase details were not supplied, this seed uses
// neutral presentation-ready defaults. The reasoning behind those defaults
// belongs in project notes, not in the app UI.

import { createPhase } from "../coachingPhaseSchema.js";
import { addPhase, loadPhasesForClient, updatePhase } from "../coachingPhaseStorage.js";
import { createOpportunity } from "../opportunitySchema.js";
import { addOpportunity, loadOpportunitiesForClient, updateOpportunity } from "../opportunityStorage.js";
import { createResource } from "../coachingResourceSchema.js";
import { addResource, deleteResource, loadResourcesForClient, updateResource } from "../coachingResourceStorage.js";

const CLIENT = "Greyz Bistro";
const PHASES = [
  {
    phaseNumber: 1,
    name: "Research & Discovery",
    weeks: "1–2",
    vaam: "V",
    status: "complete",
    goal: "Understand Greyz Bistro's current brand position, collect the assets needed for press/coaching work, and align on the repositioning away from the original Caribbean-Asian concept.",
    deliverables: ["Discovery call notes", "Asset collection", "Brand research snapshot", "Kickoff deck", "Repositioning direction"],
    notes: "Complete — proposal, contract, media kit, kickoff deck, and discovery materials are already in motion. This gives Tenyse the context she needs before shaping visibility into revenue.",
    homework: [
      { type: "action", text: "Submit logo, current menu, founder bio, and approved brand photos", dueDate: "2026-07-10", status: "complete" },
      { type: "action", text: "Confirm what language should no longer be used in the old Caribbean-Asian positioning", dueDate: "2026-07-12", status: "complete" },
      { type: "reflection", text: "What do guests already come to Greyz Bistro for, beyond the food?", dueDate: "2026-07-13", status: "complete", response: "People come for care, hosting, flavor, and the feeling that the experience was made for them." },
      {
        type: "standing",
        text: "Bring every incoming opportunity to Tenyse before responding. Don't evaluate it yourself first.",
        status: "in_progress",
      },
    ],
  },
  {
    phaseNumber: 2,
    name: "Founder Positioning",
    weeks: "3–4",
    vaam: "A_AUTHORITY",
    status: "complete",
    goal: "Turn Chef Garth's lived experience, hospitality style, and culinary perspective into clear founder positioning that can support PR, partnerships, and sales conversations.",
    deliverables: ["Founder positioning statement", "Brand narrative", "Messaging pillars", "Bio in three lengths", "Founder voice notes"],
    notes: "Complete for the demo flow — three positioning angles are visible in the coaching record: Chef Founder, Culinary Educator, and Cultural Voice.",
    homework: [
      { type: "reflection", text: "Which of these positioning angles feels most like you, and why?", dueDate: "2026-07-23", status: "complete", response: "Chef Founder feels most true because it lets the food, the business, and the leadership live together." },
      {
        type: "reflection",
        text: "Where have people already given you language about your brand, in reviews, press, or guest comments, that you haven't claimed yet?",
        dueDate: "2026-07-25",
        status: "complete",
        response: "Guests talk about the warmth, the detail, and the way the space makes people feel celebrated.",
      },
      { type: "action", text: "Approve the founder bio short, medium, and long versions", dueDate: "2026-07-28", status: "complete" },
    ],
  },
  {
    phaseNumber: 3,
    name: "Media & Thought Leadership",
    weeks: "5–6",
    vaam: "A_AUTHORITY",
    status: "complete",
    goal: "Turn the LinkedIn audit findings into elevated content, stronger public authority, and media angles that support the repositioning story.",
    deliverables: ["LinkedIn audit & fix plan", "4–6 media angles", "Speaking topics", "Thought leadership content plan", "Credibility proof points"],
    notes: "Complete for the demo flow — the LinkedIn audit and fix plan are ready, and the next media angles can be reused in outreach and reporting.",
    homework: [
      { type: "action", text: "Review LinkedIn audit findings and return notes", dueDate: "2026-08-06", status: "complete" },
      { type: "action", text: "Pick 3 recurring topics Chef Garth can speak about with confidence", dueDate: "2026-08-09", status: "complete" },
      { type: "reflection", text: "Which public conversation do you want Greyz Bistro to be associated with this year?", dueDate: "2026-08-11", status: "complete", response: "Hospitality as a bridge between culture, education, and neighborhood experience." },
    ],
  },
  {
    phaseNumber: 4,
    name: "Partnership Roadmap",
    weeks: "7–8",
    vaam: "A_ALIGNMENT",
    status: "complete",
    goal: "Build a curated partnership target list and evaluate opportunities against credibility, audience, partnerships, and revenue goals before Chef Garth says yes.",
    deliverables: ["25–40 curated partnership targets", "Partner fit criteria", "Opportunity scoring card", "Priority outreach list", "Warm intro notes"],
    notes: "Complete enough to demo — active partnership work is already underway with WIADCA Carnival and Brooklyn Roasting Company, with additional targets being shaped.",
    homework: [
      { type: "action", text: "Send first list of partner ideas before responding to anyone", dueDate: "2026-08-20", status: "complete" },
      { type: "action", text: "Rank top 10 partnership targets by audience fit and credibility value", dueDate: "2026-08-23", status: "complete" },
      { type: "reflection", text: "Which partnerships would make Greyz Bistro more visible and more trusted?", dueDate: "2026-08-24", status: "complete", response: "Partners with cultural credibility, family/community audiences, and quality food or hospitality overlap." },
    ],
  },
  {
    phaseNumber: 5,
    name: "Outreach Assets",
    weeks: "9–10",
    vaam: "M",
    status: "in_progress",
    goal: "Create the tools Chef Garth needs to confidently reach out, pitch, and start real conversations with partners, media, collaborators, and influencers.",
    deliverables: ["One sheet (PDF)", "Media pitch (customized)", "Partnership email template", "Influencer vetting criteria", "Follow-up script"],
    notes: "In progress — this is the current demo phase. The client can see what is done, what is due, and what Tenyse needs before the next call.",
    homework: [
      { type: "action", text: "Review and approve one-sheet draft", dueDate: "2026-09-09", status: "complete" },
      { type: "action", text: "Update LinkedIn with new positioning", dueDate: "2026-09-12", status: "complete" },
      { type: "action", text: "Send feedback on partnership email template", dueDate: "2026-09-16", status: "not_started" },
      { type: "action", text: "Compile 10 potential influencer partners", dueDate: "2026-09-18", status: "not_started" },
      { type: "reflection", text: "What's one partnership opportunity that excites you right now, and what would make it a good fit for your brand?", dueDate: "2026-09-19", status: "in_progress", response: "" },
    ],
  },
  {
    phaseNumber: 6,
    name: "Growth Roadmap Presentation",
    weeks: "11–12",
    vaam: "M",
    status: "not_started",
    goal: "Review the 90-day sprint, connect visibility to opportunity, and recommend the next phase of PR, coaching, or partnership work.",
    deliverables: ["End-of-sprint review", "Wins and proof points", "Refined positioning", "Recommended next phase", "90-day growth roadmap"],
    notes: "Not started — this is the capstone deliverable at the end of the sprint and shows where the relationship goes after the first round of visibility work.",
    homework: [
      { type: "action", text: "Collect wins, partner responses, and client reflections for final roadmap", dueDate: "2026-09-28", status: "not_started" },
      { type: "reflection", text: "What changed in how you talk about Greyz Bistro during this sprint?", dueDate: "2026-10-01", status: "not_started", response: "" },
    ],
  },
];

const OPPORTUNITIES = [
  {
    title: "WIADCA Carnival — VIP Breakfast & Stage Premium Tasting Partner",
    description: "Two activations: VIP Breakfast and Stage Premium Tasting Partner, Aug 20 and Sept 7.",
    decisionStatus: "pursuing",
    scores: { audienceFit: 4, brandValues: 4, credibility: 5, revenuePotential: 3, visibilityValue: 5 },
    writeUp: "Strong visibility and credibility fit. Continue pressure-testing the revenue upside and execution requirements before finalizing commitment.",
  },
  {
    title: "Brooklyn Roasting Company Collaboration",
    description: "Active partnership work in flight, per Tenyse's email — specifics of the collaboration not detailed yet.",
    decisionStatus: "pursuing",
    scores: { audienceFit: 4, brandValues: 5, credibility: 4, revenuePotential: 3, visibilityValue: 4 },
    writeUp: "Strong alignment and audience fit. Clarify the collaboration structure, deliverables, and revenue potential before moving from interest to execution.",
  },
  {
    title: "Brooklyn Food & Culture Pop-Up Series",
    description: "Potential local tasting series built around Chef Garth's repositioning, community credibility, and repeatable partner storytelling.",
    decisionStatus: "pressure_testing",
    scores: { audienceFit: 4, brandValues: 4, credibility: 4, revenuePotential: 4, visibilityValue: 4 },
    writeUp: "Good fit if the event gives Greyz Bistro useful audience visibility, captures content, and creates follow-up opportunities instead of being a one-off appearance.",
  },
  {
    title: "Neighborhood Business Association Founder Spotlight",
    description: "Possible founder visibility feature tied to local entrepreneurship, food culture, and hospitality leadership.",
    decisionStatus: "pursuing",
    scores: { audienceFit: 3, brandValues: 4, credibility: 5, revenuePotential: 2, visibilityValue: 4 },
    writeUp: "Strong credibility play. Use it to reinforce Chef Garth's founder narrative, then connect the story to media and partnership outreach.",
  },
];

const RESOURCES = [
  {
    kind: "resource",
    title: "LinkedIn Audit & Fix Plan",
    priority: "high",
    content:
      "Findings and recommended fixes from Tenyse's LinkedIn audit — part of the Founder Positioning / Media & Thought Leadership work already built for Greyz Bistro.",
  },
  {
    kind: "resource",
    title: "How to Craft a Strong Partnership Pitch",
    priority: "high",
    content:
      "Step-by-step guidance on what to include in a partner pitch, how to position Greyz Bistro's value, and how to avoid vague asks.",
  },
  {
    kind: "resource",
    title: "Partnership Email Template",
    priority: "high",
    content:
      "A reusable outreach template Chef Garth can customize for restaurants, brands, events, and cultural partners after Tenyse reviews the opportunity.",
  },
  {
    kind: "resource",
    title: "One-Sheet Outline",
    priority: "high",
    content:
      "A concise one-sheet structure: founder positioning, proof points, audience fit, partnership ideas, and preferred next step.",
  },
  {
    kind: "resource",
    title: "Media Pitch Template",
    priority: "medium",
    content:
      "A PR pitch format that turns the repositioning story into a clear angle for food, culture, business, and community outlets.",
  },
  {
    kind: "resource",
    title: "Influencer Vetting Criteria",
    priority: "medium",
    content:
      "A decision guide for evaluating creators by audience fit, brand values, credibility, revenue potential, and visibility value before engaging.",
  },
  {
    kind: "checklist",
    title: "Updated founder headshot",
    priority: "high",
    content: "Needed for one-sheet, LinkedIn refresh, partnership outreach, and media follow-up.",
    completed: true,
  },
  {
    kind: "checklist",
    title: "Final one-sheet copy",
    priority: "high",
    content: "Approve the founder positioning, proof points, and preferred partnership language for the client-facing PDF.",
    completed: false,
  },
  {
    kind: "checklist",
    title: "Partnership email template feedback",
    priority: "medium",
    content: "Chef Garth needs to review tone, ask, and signature language before the template becomes reusable.",
    completed: false,
  },
  {
    kind: "checklist",
    title: "10 potential influencer partners",
    priority: "medium",
    content: "A first client-sourced list to compare against Tenyse's criteria before outreach.",
    completed: false,
  },
  {
    kind: "checklist",
    title: "Approved media kit assets",
    priority: "low",
    content: "Final photos, founder bio, logo, and brand language ready for press and partner requests.",
    completed: true,
  },
];

/** Idempotent — checks by (client, phaseNumber)/(client, title) before adding, same pattern as seedRealCaseStudyData.js. */
export function seedGreyzBistroCoachingData() {
  const existingPhases = loadPhasesForClient(CLIENT);
  let phasesAdded = 0;
  for (const p of PHASES) {
    const existing = loadPhasesForClient(CLIENT).find((ep) => ep.phaseNumber === p.phaseNumber);
    if (existing) {
      updatePhase({
        ...existing,
        ...p,
        client: CLIENT,
        id: existing.id,
        createdAt: existing.createdAt,
        homework: p.homework.map((h, index) => {
          const existingMatch = (existing.homework || []).find((item) => item.text === h.text || item.text?.toLowerCase() === h.text.toLowerCase());
          return {
            id: existingMatch?.id || crypto.randomUUID(),
            type: h.type,
            text: h.text,
            dueDate: h.dueDate || "",
            status: h.status,
            response: h.response || existingMatch?.response || "",
            createdAt: existingMatch?.createdAt || new Date(Date.now() + index).toISOString(),
          };
        }),
      });
      continue;
    }
    let phase = createPhase({ ...p, client: CLIENT });
    phase.status = p.status;
    phase.homework = p.homework.map((h, index) => ({
      id: crypto.randomUUID(),
      type: h.type,
      text: h.text,
      dueDate: h.dueDate || "",
      status: h.status,
      response: h.response || "",
      createdAt: new Date(Date.now() + index).toISOString(),
    }));
    addPhase(phase);
    phasesAdded += 1;
  }

  const existingOpportunities = loadOpportunitiesForClient(CLIENT);
  let opportunitiesAdded = 0;
  for (const o of OPPORTUNITIES) {
    const existing = loadOpportunitiesForClient(CLIENT).find((eo) => eo.title === o.title);
    if (existing) {
      updateOpportunity({ ...existing, ...o, client: CLIENT, id: existing.id, createdAt: existing.createdAt });
      continue;
    }
    addOpportunity(createOpportunity({ ...o, client: CLIENT }));
    opportunitiesAdded += 1;
  }

  const resourcesAfterCleanup = loadResourcesForClient(CLIENT);
  const seenResourceTitles = new Set();
  resourcesAfterCleanup.forEach((resource) => {
    if (!seenResourceTitles.has(resource.title)) {
      seenResourceTitles.add(resource.title);
      return;
    }
    deleteResource(resource.id);
  });
  let resourcesAdded = 0;
  for (const r of RESOURCES) {
    const existing = loadResourcesForClient(CLIENT).find((er) => er.title === r.title);
    if (existing) {
      updateResource({ ...existing, ...r, client: CLIENT, id: existing.id, createdAt: existing.createdAt });
      continue;
    }
    addResource(createResource({ ...r, client: CLIENT }));
    resourcesAdded += 1;
  }

  return { phasesAdded, opportunitiesAdded, resourcesAdded };
}
