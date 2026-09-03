import { DECISION_STATUSES } from "./opportunitySchema.js";

export const OPPORTUNITY_STATUS_LABELS = {
  pursuing: "Pursuing",
  pressure_testing: "Pressure Testing",
  declined: "Declined",
};

function percent(done, total) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function calculateCoachingProgress({ phases = [], resources = [], opportunities = [] } = {}) {
  const phaseTotal = phases.length;
  const phasesComplete = phases.filter((p) => p.status === "complete").length;
  const allHomework = phases.flatMap((p) => p.homework || []);
  const actionableHomework = allHomework.filter((h) => h.type !== "standing");
  const homeworkComplete = actionableHomework.filter((h) => h.status === "complete").length;
  const checklistItems = resources.filter((r) => r.kind === "checklist");
  const checklistComplete = checklistItems.filter((r) => r.completed).length;
  const opportunityPipeline = DECISION_STATUSES.reduce((counts, status) => {
    counts[status] = opportunities.filter((o) => o.decisionStatus === status).length;
    return counts;
  }, {});

  return {
    phases: {
      complete: phasesComplete,
      total: phaseTotal,
      percent: percent(phasesComplete, phaseTotal),
    },
    homework: {
      complete: homeworkComplete,
      total: actionableHomework.length,
      percent: percent(homeworkComplete, actionableHomework.length),
    },
    checklist: {
      complete: checklistComplete,
      total: checklistItems.length,
      percent: percent(checklistComplete, checklistItems.length),
    },
    opportunities: {
      total: opportunities.length,
      pipeline: opportunityPipeline,
    },
  };
}
