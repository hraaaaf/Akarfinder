import { MAX_BATCH_SIZE, MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION } from "./daragadir-controlled-promotion";

export const EXPANSION_TARGET_CUMULATIVE_ROWS = MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION;
export const EXPANSION_BATCH_SIZE = MAX_BATCH_SIZE;
export const EXPANSION_CERTIFIED_CHECKPOINTS = [50, 150, 250, 350, 450, 500] as const;

export interface ExpansionPlan {
  currentPersistentRows: number;
  candidateRows: number;
  targetCumulativeRows: number;
  remainingToTarget: number;
  plannedBatchSizes: number[];
  nextBatchSize: number;
  canReachTarget: boolean;
}

export function buildExpansionPlan(currentPersistentRows: number, candidateRows: number): ExpansionPlan {
  if (!Number.isInteger(currentPersistentRows) || currentPersistentRows < 0) throw new Error("Invalid currentPersistentRows");
  if (!Number.isInteger(candidateRows) || candidateRows < 0) throw new Error("Invalid candidateRows");
  if (currentPersistentRows > EXPANSION_TARGET_CUMULATIVE_ROWS) throw new Error("Cumulative promotion exceeds re-certification cap");

  const remainingToTarget = EXPANSION_TARGET_CUMULATIVE_ROWS - currentPersistentRows;
  const promotable = Math.min(remainingToTarget, candidateRows);
  const plannedBatchSizes: number[] = [];
  let remaining = promotable;
  while (remaining > 0) {
    const size = Math.min(EXPANSION_BATCH_SIZE, remaining);
    plannedBatchSizes.push(size);
    remaining -= size;
  }

  return {
    currentPersistentRows,
    candidateRows,
    targetCumulativeRows: EXPANSION_TARGET_CUMULATIVE_ROWS,
    remainingToTarget,
    plannedBatchSizes,
    nextBatchSize: plannedBatchSizes[0] ?? 0,
    canReachTarget: candidateRows >= remainingToTarget,
  };
}

function expectedPlanAtCheckpoint(currentPersistentRows: number): number[] {
  switch (currentPersistentRows) {
    case 50: return [100,100,100,100,50];
    case 150: return [100,100,100,50];
    case 250: return [100,100,50];
    case 350: return [100,50];
    case 450: return [50];
    case 500: return [];
    default: throw new Error(`Uncertified DATA-4.3H checkpoint: ${currentPersistentRows}`);
  }
}

export function requireCertifiedExpansionCheckpoint(plan: ExpansionPlan): void {
  const expectedPlan = expectedPlanAtCheckpoint(plan.currentPersistentRows);
  if (plan.currentPersistentRows === EXPANSION_TARGET_CUMULATIVE_ROWS) {
    if (plan.remainingToTarget !== 0 || plan.nextBatchSize !== 0 || plan.plannedBatchSizes.length !== 0) {
      throw new Error(`Expected completed 500-row state, got ${JSON.stringify(plan)}`);
    }
    return;
  }
  if (!plan.canReachTarget) {
    throw new Error(`Insufficient eligible candidates to reach 500-row re-certification cap: candidates=${plan.candidateRows}, required=${plan.remainingToTarget}, plan=${plan.plannedBatchSizes.join(",")}`);
  }
  if (plan.plannedBatchSizes.join(",") !== expectedPlan.join(",")) {
    throw new Error(`Unexpected expansion plan at ${plan.currentPersistentRows}: ${plan.plannedBatchSizes.join(",")}`);
  }
}

// Backward-compatible alias for older callers/tests. The contract now validates
// any certified DATA-4.3H checkpoint, not only the original 50-row start.
export const requireCertifiedExpansionStart = requireCertifiedExpansionCheckpoint;
