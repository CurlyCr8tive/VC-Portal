export const DEMO_FALLBACKS = {
  avgLeadTimeDays: 18,
  leadTimeDelta: -3,
  aveDelta: 18,
  placementsDelta: 9,
  avePerPlacement: 6750,
  defaultTotalAVE: 142350,
};

export function hasPlacements(metrics = {}, explicitCount = null) {
  const count = explicitCount ?? metrics.totalPlacements;
  return Number(count || 0) > 0;
}

export function demoAVEForPlacement(placement = {}, index = 0) {
  if (placement.aveValue != null) return placement.aveValue;
  const reach = Number(placement.audienceReach || 0);
  if (reach > 0) return Math.round(Math.max(2400, Math.min(48000, reach * 0.004)));
  return DEMO_FALLBACKS.avePerPlacement + index * 750;
}

export function demoTotalAVEForPlacements(placements = []) {
  if (!placements.length) return 0;
  return placements.reduce((sum, placement, index) => sum + demoAVEForPlacement(placement, index), 0);
}

export function applyDemoMetricFallbacks(metrics = {}, { placements = null, placementCount = null } = {}) {
  const count = placementCount ?? metrics.totalPlacements ?? placements?.length ?? 0;
  const hasRows = hasPlacements(metrics, count);
  const fallbackAVE = placements?.length ? demoTotalAVEForPlacements(placements) : DEMO_FALLBACKS.defaultTotalAVE;

  return {
    ...metrics,
    totalAVE: metrics.totalAVE != null ? metrics.totalAVE : hasRows ? fallbackAVE : metrics.totalAVE,
    avgLeadTime: metrics.avgLeadTime != null ? metrics.avgLeadTime : hasRows ? DEMO_FALLBACKS.avgLeadTimeDays : metrics.avgLeadTime,
    aveDelta: metrics.aveDelta != null ? metrics.aveDelta : hasRows ? DEMO_FALLBACKS.aveDelta : metrics.aveDelta,
    placementsDelta: metrics.placementsDelta != null ? metrics.placementsDelta : hasRows ? DEMO_FALLBACKS.placementsDelta : metrics.placementsDelta,
    leadTimeDelta: metrics.leadTimeDelta != null ? metrics.leadTimeDelta : hasRows ? DEMO_FALLBACKS.leadTimeDelta : metrics.leadTimeDelta,
  };
}
