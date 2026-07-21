// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 7.
// Was previously a compare-and-set lock built on a discovery_candidates
// sentinel row, recovered from staleness via a "read the row, then
// conditionally UPDATE it" path -- a real read-then-write race, and the
// reason a killed invocation (FUNCTION_INVOCATION_TIMEOUT; see
// data/audits/openserp-serverless-state-real-run-attempt-result.json)
// left a stuck lock that had to be manually deleted. Now a thin
// semantic wrapper over the dedicated, lease-based, atomic-at-the-SQL-
// level lock (lib/openserp-ingestion/state/ingestion-run-lock-repository.ts
// + supabase/migrations/20260718180000_create_openserp_ingestion_run_lock.sql).
// A killed invocation now self-heals: its lease simply expires, and the
// next attempt takes over atomically -- no manual cleanup is ever needed.

import {
  acquireIngestionRunLock as acquireLease,
  releaseIngestionRunLock as releaseLease,
} from "./state/ingestion-run-lock-repository";
import { DbCallTimeoutError, TimeBudgetExhaustedBeforeDbCallError } from "./state/db-call-guard";

export type RunLockResult = { acquired: true } | { acquired: false; reason: "SKIPPED_OVERLAPPING_RUN" };

export async function acquireIngestionRunLock(runId: string, leaseSeconds: number): Promise<RunLockResult> {
  const result = await acquireLease(runId, leaseSeconds);
  if (result.acquired) return { acquired: true };
  return { acquired: false, reason: "SKIPPED_OVERLAPPING_RUN" };
}

export async function releaseIngestionRunLock(runId: string): Promise<void> {
  // Best-effort by design (OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1
  // Phase 9): if the bounded release call times out or is refused for
  // lack of budget, swallow it -- the lease's own expiry is the final,
  // already-proven-in-production safety net (REAL-RUN-VALIDATION-2's
  // killed invocation self-healed exactly this way). Any other error
  // still propagates: a genuine DB failure should be visible, not hidden.
  try {
    await releaseLease(runId);
  } catch (error) {
    if (error instanceof DbCallTimeoutError || error instanceof TimeBudgetExhaustedBeforeDbCallError) {
      return;
    }
    throw error;
  }
}
