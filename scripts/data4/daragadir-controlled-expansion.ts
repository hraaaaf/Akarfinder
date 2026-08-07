import { MAX_BATCH_SIZE, MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION } from "./daragadir-controlled-promotion";

export const EXPANSION_TARGET_CUMULATIVE_ROWS = MAX_CUMULATIVE_ROWS_BEFORE_RECERTIFICATION;
export const EXPANSION_BATCH_SIZE = MAX_BATCH_SIZE;

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

export function requireCertifiedExpansionStart(plan: ExpansionPlan): void {
  if (plan.currentPersistentRows !== 50) throw new Error(`Expected certified 50-row starting point, got ${plan.currentPersistentRows}`);
  if (!plan.canReachTarget) throw new Error("Insufficient eligible candidates to reach 500-row re-certification cap");
  if (plan.nextBatchSize !== 100) throw new Error(`Expected next batch 100, got ${plan.nextBatchSize}`);
  if (plan.plannedBatchSizes.join(",") !== "100,100,100,100,50") throw new Error(`Unexpected expansion plan: ${plan.plannedBatchSizes.join(",")}`);
}
