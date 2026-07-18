// OPENSERP-SERVERLESS-STATE-PERSISTENCE-1 — section 9.
// Persists the mutable rotation-state half of each query (everything
// query-rotation-planner.ts's markQueryExecuted() would otherwise have
// written back into the local query-universe-v1.json file). The static
// query_definition half stays in the JSON catalog, read-only, forever.
//
// No fallback to a filesystem write anywhere in this file, by design --
// if the DB call fails, the caller sees the error and the run fails loudly
// rather than silently degrading to a non-durable local write.

import { getSupabaseServerClient } from "@/lib/db/supabase-client";

export type OpenSerpEngineName = "bing" | "duckduckgo" | "ecosia";

export type QueryRotationDbState = {
  query_id: string;
  query_universe_version: string;
  query_definition_hash: string;
  last_executed_at: string | null;
  next_eligible_at: string | null;
  failure_count: number;
  successful_run_count: number;
  discovery_yield: number;
  last_engine: OpenSerpEngineName | null;
  last_run_id: string | null;
};

export type QueryDefinitionForSeed = {
  query_id: string;
  query_universe_version: string;
  query_definition_hash: string;
};

export async function loadQueryStates(queryIds: string[]): Promise<Map<string, QueryRotationDbState>> {
  const map = new Map<string, QueryRotationDbState>();
  if (queryIds.length === 0) return map;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("openserp_query_rotation_state")
    .select(
      "query_id, query_universe_version, query_definition_hash, last_executed_at, next_eligible_at, failure_count, successful_run_count, discovery_yield, last_engine, last_run_id",
    )
    .in("query_id", queryIds);

  if (error) {
    throw new Error(`loadQueryStates failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(row.query_id, row as QueryRotationDbState);
  }
  return map;
}

export async function upsertQueryStates(states: QueryRotationDbState[], runId: string): Promise<void> {
  if (states.length === 0) return;

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = states.map((state) => ({
    ...state,
    last_run_id: runId,
    updated_at: now,
  }));

  const { error } = await supabase.from("openserp_query_rotation_state").upsert(rows, { onConflict: "query_id" });
  if (error) {
    throw new Error(`upsertQueryStates failed: ${error.message}`);
  }
}

// Lazily creates a neutral (never-executed) rotation-state row for any
// query_id present in the static universe but not yet in the DB -- covers
// both the initial seed and any future universe growth (new queries added
// to query-universe-v1.json after the first seed) without a separate
// migration step each time.
export async function seedMissingQueryStates(definitions: QueryDefinitionForSeed[]): Promise<{ seeded: number }> {
  if (definitions.length === 0) return { seeded: 0 };

  const existing = await loadQueryStates(definitions.map((d) => d.query_id));
  const missing = definitions.filter((d) => !existing.has(d.query_id));
  if (missing.length === 0) return { seeded: 0 };

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = missing.map((d) => ({
    query_id: d.query_id,
    query_universe_version: d.query_universe_version,
    query_definition_hash: d.query_definition_hash,
    last_executed_at: null,
    next_eligible_at: null,
    failure_count: 0,
    successful_run_count: 0,
    discovery_yield: 0,
    last_engine: null,
    last_run_id: null,
    created_at: now,
    updated_at: now,
  }));

  // onConflict + ignoreDuplicates guards against a race with another
  // concurrent invocation seeding the same missing rows between the
  // loadQueryStates check above and this insert.
  const { error } = await supabase
    .from("openserp_query_rotation_state")
    .upsert(rows, { onConflict: "query_id", ignoreDuplicates: true });
  if (error) {
    throw new Error(`seedMissingQueryStates failed: ${error.message}`);
  }
  return { seeded: rows.length };
}
