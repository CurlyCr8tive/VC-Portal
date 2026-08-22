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
// MOCK DATA, clearly labeled inline wherever used (per direct instruction
// to fill gaps with mock data rather than block): exact phase-by-phase
// status/dates weren't given, only "heading into the final month" — phase
// status below is a reasonable inference from what WAS built, flagged as
// such in each phase's notes, not presented as confirmed fact. Opportunity
// scores are illustrative placeholders. The missing-assets checklist item
// is a generic placeholder, not Chef Garth's actual confirmed gap list.

import { createPhase } from "../coachingPhaseSchema.js";
import { addPhase, loadPhasesForClient } from "../coachingPhaseStorage.js";
import { createOpportunity } from "../opportunitySchema.js";
import { addOpportunity, loadOpportunitiesForClient } from "../opportunityStorage.js";
import { createResource } from "../coachingResourceSchema.js";
import { addResource, loadResourcesForClient } from "../coachingResourceStorage.js";

const CLIENT = "Greyz Bistro";
const STATUS_NOTE =
  "Status/timing inferred from what's been built and what's in flight — Tenyse's email confirmed \"heading into the final month\" but not phase-by-phase status. Confirm with her before treating this as exact.";

const PHASES = [
  {
    phaseNumber: 1,
    name: "Research & Discovery",
    weeks: "1–2",
    vaam: "V",
    status: "complete",
    goal: "Understand Greyz Bistro's current brand positioning, collect assets, and align on the repositioning away from the original Caribbean-Asian concept.",
    deliverables: ["Asset collection", "Brand research", "Discovery call", "Kickoff call"],
    notes: "Complete — kickoff deck was built, which requires the kickoff call to have happened.",
    homework: [
      { type: "action", text: "Submit outstanding brand assets through the upload link", dueDate: "", status: "complete" },
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
    status: "in_progress",
    goal: "Land on Chef Garth's founder positioning and build the messaging/bio around it.",
    deliverables: ["Positioning statement", "Brand narrative", "Messaging pillars", "Bio in three lengths"],
    notes: `In progress — three positioning angles are still under consideration (Chef Founder, Culinary Educator, Cultural Voice), so this isn't locked yet even though a media kit already exists. ${STATUS_NOTE}`,
    homework: [
      { type: "reflection", text: "Which of these positioning angles feels most like you, and why?", dueDate: "", status: "not_started" },
      {
        type: "reflection",
        text: "Where have people already given you language about your brand, in reviews, press, or guest comments, that you haven't claimed yet?",
        dueDate: "",
        status: "not_started",
      },
    ],
  },
  {
    phaseNumber: 3,
    name: "Media & Thought Leadership",
    weeks: "5–6",
    vaam: "A_AUTHORITY",
    status: "in_progress",
    goal: "Turn the LinkedIn audit findings into elevated content and identify real media angles for the repositioning story.",
    deliverables: ["4–6 media angles", "Speaking topics", "Thought leadership content plan", "LinkedIn elevation"],
    notes: `In progress — LinkedIn audit and fix plan already built (see Resource Library); media angles/speaking topics not yet confirmed built. ${STATUS_NOTE}`,
    homework: [{ type: "action", text: "Review LinkedIn audit findings and return notes", dueDate: "", status: "in_progress" }],
  },
  {
    phaseNumber: 4,
    name: "Partnership Roadmap",
    weeks: "7–8",
    vaam: "A_ALIGNMENT",
    status: "in_progress",
    goal: "Build the curated partnership target list, informed by the WIADCA Carnival and Brooklyn Roasting Company relationships already in motion.",
    deliverables: ["25–40 curated partnership targets across priority categories", "Outreach criteria"],
    notes: `In progress — two real partnerships are already active (see Opportunity Evaluator) ahead of a confirmed full 25–40 target list. ${STATUS_NOTE}`,
    homework: [],
  },
  {
    phaseNumber: 5,
    name: "Outreach Assets",
    weeks: "9–10",
    vaam: "M",
    status: "in_progress",
    goal: "Build the one sheet, media pitch, and partnership templates the final-month push needs.",
    deliverables: ["One sheet", "Media pitch", "Partnership email template", "Influencer vetting criteria"],
    notes: `MOCK STATUS — "heading into the final month" puts the timeline roughly here, but this phase's actual progress wasn't confirmed. ${STATUS_NOTE}`,
    homework: [],
  },
  {
    phaseNumber: 6,
    name: "Growth Roadmap Presentation",
    weeks: "11–12",
    vaam: "M",
    status: "not_started",
    goal: "End-of-sprint review and recommendation for the next phase of the engagement.",
    deliverables: ["End of sprint review", "Refinement", "Recommended next phase"],
    notes: "Not started — this is the capstone deliverable at the very end of the 90 days, which hasn't been reached yet.",
    homework: [],
  },
];

const OPPORTUNITIES = [
  {
    title: "WIADCA Carnival — VIP Breakfast & Stage Premium Tasting Partner",
    description: "Two activations: VIP Breakfast and Stage Premium Tasting Partner, Aug 20 and Sept 7.",
    decisionStatus: "pursuing",
    scores: { audienceFit: 4, brandValues: 4, credibility: 5, revenuePotential: 3, visibilityValue: 5 },
    writeUp:
      "MOCK SCORES — illustrative placeholders showing how the scoring card works, not Tenyse's real evaluation. Real activity: confirmed active partnership work in flight per Tenyse's email.",
  },
  {
    title: "Brooklyn Roasting Company Collaboration",
    description: "Active partnership work in flight, per Tenyse's email — specifics of the collaboration not detailed yet.",
    decisionStatus: "pursuing",
    scores: { audienceFit: 4, brandValues: 5, credibility: 4, revenuePotential: 3, visibilityValue: 4 },
    writeUp: "MOCK SCORES — same illustrative-placeholder caveat as WIADCA Carnival above.",
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
    kind: "checklist",
    title: "MOCK — confirm real missing-asset list with Tenyse",
    priority: "medium",
    content: "Placeholder example (e.g. updated professional headshots) — swap for Chef Garth's actual outstanding assets once confirmed.",
    completed: false,
  },
];

/** Idempotent — checks by (client, phaseNumber)/(client, title) before adding, same pattern as seedRealCaseStudyData.js. */
export function seedGreyzBistroCoachingData() {
  const existingPhases = loadPhasesForClient(CLIENT);
  let phasesAdded = 0;
  for (const p of PHASES) {
    if (existingPhases.some((ep) => ep.phaseNumber === p.phaseNumber)) continue;
    let phase = createPhase({ ...p, client: CLIENT });
    phase.status = p.status;
    phase.homework = p.homework.map((h) => ({
      id: crypto.randomUUID(),
      type: h.type,
      text: h.text,
      dueDate: h.dueDate || "",
      status: h.status,
      response: "",
      createdAt: new Date().toISOString(),
    }));
    addPhase(phase);
    phasesAdded += 1;
  }

  const existingOpportunities = loadOpportunitiesForClient(CLIENT);
  let opportunitiesAdded = 0;
  for (const o of OPPORTUNITIES) {
    if (existingOpportunities.some((eo) => eo.title === o.title)) continue;
    addOpportunity(createOpportunity({ ...o, client: CLIENT }));
    opportunitiesAdded += 1;
  }

  const existingResources = loadResourcesForClient(CLIENT);
  let resourcesAdded = 0;
  for (const r of RESOURCES) {
    if (existingResources.some((er) => er.title === r.title)) continue;
    addResource(createResource({ ...r, client: CLIENT }));
    resourcesAdded += 1;
  }

  return { phasesAdded, opportunitiesAdded, resourcesAdded };
}
