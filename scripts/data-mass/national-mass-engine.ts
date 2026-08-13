export const MASS6_STAGES = ["DISCOVER","CLASSIFY","POLICY","INDEX","FRESHNESS","DEDUP","RANK"] as const;
export type Mass6Stage = typeof MASS6_STAGES[number];

export type Mass6StageState = Record<Mass6Stage, boolean>;

export function evaluateNationalMassEngine(state: Mass6StageState) {
  let blockedAt: Mass6Stage | null = null;
  let previousPassed = true;
  for (const stage of MASS6_STAGES) {
    const passed = state[stage] === true;
    if (!previousPassed || !passed) {
      blockedAt ??= stage;
      previousPassed = false;
    }
  }

  const rankEligible = blockedAt === null;
  return {
    schemaVersion: "MASS_6_NATIONAL_MASS_ENGINE_V1",
    mode: "shadow_read_only",
    orderedStages: MASS6_STAGES,
    blockedAt,
    rankEligible,
    databaseWrites: 0,
    registryWrites: 0,
    searchActivations: 0,
    sourceNetworkRequests: 0,
    detailPageFetches: 0,
    permissionsInferred: 0,
  } as const;
}
