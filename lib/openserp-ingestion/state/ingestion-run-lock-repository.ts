// OPENSERP-SERVERLESS-TIME-BUDGET-AND-LOCK-SAFETY-1 — Phase 7.
// Thin wrapper around the two atomic Postgres functions
// (acquire_openserp_ingestion_lock / release_openserp_ingestion_lock) --
// all of the actual compare-and-swap / expiry-takeover logic lives in SQL
// (supabase/migrations/20260718180000_create_openserp_ingestion_run_lock.sql)
// so it can never be re-implemented here as a racy read-then-write. This
// file only shapes the RPC call and its result.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export const INGESTION_RUN_LOCK_NAME = "openserp-ingestion";

export type AcquireLockResult =
  | { acquired: true; ownerId: string; expiresAt: string }
  | { acquired: false; reason: "LOCK_HELD_BY_ANOTHER_OWNER"; currentOwnerId: string; currentExpiresAt: string };

export async function acquireIngestionRunLock(ownerId: string, leaseSeconds: number): Promise<AcquireLockResult> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("acquire_openserp_ingestion_lock", {
    p_lock_name: INGESTION_RUN_LOCK_NAME,
    p_owner_id: ownerId,
    p_lease_seconds: Math.max(1, Math.round(leaseSeconds)),
  });

  if (error) {
    throw new Error(`acquireIngestionRunLock failed: ${error.message}`);
  }
  const row = data?.[0] as { acquired: boolean; current_owner_id: string; current_expires_at: string } | undefined;
  if (!row) {
    throw new Error("acquireIngestionRunLock: no row returned by acquire_openserp_ingestion_lock");
  }

  if (row.acquired) {
    return { acquired: true, ownerId, expiresAt: row.current_expires_at };
  }
  return {
    acquired: false,
    reason: "LOCK_HELD_BY_ANOTHER_OWNER",
    currentOwnerId: row.current_owner_id,
    currentExpiresAt: row.current_expires_at,
  };
}

// Returns true only if this call actually deleted the lock (i.e. ownerId
// still matched at the moment of the call) -- false means either the lock
// was already gone, or a later owner has since taken it over (never an
// error case: both are fine outcomes for a release).
export async function releaseIngestionRunLock(ownerId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("release_openserp_ingestion_lock", {
    p_lock_name: INGESTION_RUN_LOCK_NAME,
    p_owner_id: ownerId,
  });
  if (error) {
    throw new Error(`releaseIngestionRunLock failed: ${error.message}`);
  }
  return Boolean(data);
}
