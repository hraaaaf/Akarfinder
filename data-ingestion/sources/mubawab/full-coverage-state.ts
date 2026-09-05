import { buildInitialFullCoveragePlan, type FullCoveragePartition } from "./full-coverage.js";
import type { FullCoverageWaveResult } from "./full-coverage-runner.js";

export type FullCoverageWaveHistoryEntry = {
  wave_id: string;
  started_at: string;
  completed_at: string;
  partitions_started: number;
  partitions_completed: number;
  partitions_failed: number;
  pages_requested: number;
  pages_succeeded: number;
  listings_discovered: number;
  unique_added: number;
  duplicate_refs: number;
  next_partitions_created: number;
  stopped_by_kill_switch: boolean;
};

export type FullCoveragePersistentState = {
  version: 1;
  source: "mubawab";
  run_id: string;
  created_at: string;
  updated_at: string;
  page_window: number;
  partitions: FullCoveragePartition[];
  seen_source_ids: string[];
  totals: {
    waves_completed: number;
    pages_requested: number;
    pages_succeeded: number;
    listings_discovered: number;
    unique_listings: number;
    duplicate_refs: number;
  };
  wave_history: FullCoverageWaveHistoryEntry[];
};

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`lot9_state_invalid_${field}:${value}`);
  return value;
}

function assertIsoTimestamp(value: string, field: string): void {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`lot9_state_invalid_${field}:${value}`);
}

function assertUniquePartitionIds(partitions: FullCoveragePartition[]): void {
  const ids = new Set<string>();
  for (const partition of partitions) {
    if (ids.has(partition.partition_id)) throw new Error(`lot9_state_duplicate_partition:${partition.partition_id}`);
    ids.add(partition.partition_id);
  }
}

export function createFullCoverageState(input: {
  pageWindow?: number;
  now?: () => string;
  runId?: string;
} = {}): FullCoveragePersistentState {
  const pageWindow = positiveInteger(input.pageWindow ?? 25, "page_window");
  const now = input.now?.() ?? new Date().toISOString();
  assertIsoTimestamp(now, "created_at");
  const runId = input.runId ?? `mubawab-full-coverage-${now.replace(/[:.]/g, "-")}`;
  const partitions = buildInitialFullCoveragePlan(pageWindow);
  assertUniquePartitionIds(partitions);

  return {
    version: 1,
    source: "mubawab",
    run_id: runId,
    created_at: now,
    updated_at: now,
    page_window: pageWindow,
    partitions,
    seen_source_ids: [],
    totals: {
      waves_completed: 0,
      pages_requested: 0,
      pages_succeeded: 0,
      listings_discovered: 0,
      unique_listings: 0,
      duplicate_refs: 0,
    },
    wave_history: [],
  };
}

export function applyFullCoverageWave(
  state: FullCoveragePersistentState,
  result: FullCoverageWaveResult,
  input: { waveId: string; startedAt: string; completedAt: string },
): FullCoveragePersistentState {
  if (state.version !== 1 || state.source !== "mubawab") throw new Error("lot9_state_unsupported_state");
  if (!input.waveId.trim()) throw new Error("lot9_state_empty_wave_id");
  assertIsoTimestamp(input.startedAt, "wave_started_at");
  assertIsoTimestamp(input.completedAt, "wave_completed_at");
  if (Date.parse(input.completedAt) < Date.parse(input.startedAt)) throw new Error("lot9_state_wave_time_reversed");
  if (state.wave_history.some((entry) => entry.wave_id === input.waveId)) throw new Error(`lot9_state_duplicate_wave:${input.waveId}`);

  const currentById = new Map(state.partitions.map((partition) => [partition.partition_id, partition]));
  for (const partition of result.partitions) {
    if (!currentById.has(partition.partition_id)) throw new Error(`lot9_state_unknown_partition:${partition.partition_id}`);
    currentById.set(partition.partition_id, partition);
  }

  for (const next of result.next_partitions) {
    if (currentById.has(next.partition_id)) throw new Error(`lot9_state_duplicate_next_partition:${next.partition_id}`);
    currentById.set(next.partition_id, next);
  }

  const partitions = [...currentById.values()];
  assertUniquePartitionIds(partitions);
  const seenSourceIds = [...new Set(result.seen_source_ids)].sort();
  if (seenSourceIds.length < state.seen_source_ids.length) throw new Error("lot9_state_seen_ids_regressed");
  for (const id of state.seen_source_ids) {
    if (!seenSourceIds.includes(id)) throw new Error(`lot9_state_seen_id_lost:${id}`);
  }

  const historyEntry: FullCoverageWaveHistoryEntry = {
    wave_id: input.waveId,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    partitions_started: result.summary.partitions_started,
    partitions_completed: result.summary.partitions_completed,
    partitions_failed: result.summary.partitions_failed,
    pages_requested: result.summary.pages_requested,
    pages_succeeded: result.summary.pages_succeeded,
    listings_discovered: result.summary.listings_discovered,
    unique_added: result.summary.unique_added,
    duplicate_refs: result.summary.duplicate_refs,
    next_partitions_created: result.summary.next_partitions_created,
    stopped_by_kill_switch: result.summary.stopped_by_kill_switch,
  };

  return {
    ...state,
    updated_at: input.completedAt,
    partitions,
    seen_source_ids: seenSourceIds,
    totals: {
      waves_completed: state.totals.waves_completed + 1,
      pages_requested: state.totals.pages_requested + result.summary.pages_requested,
      pages_succeeded: state.totals.pages_succeeded + result.summary.pages_succeeded,
      listings_discovered: state.totals.listings_discovered + result.summary.listings_discovered,
      unique_listings: seenSourceIds.length,
      duplicate_refs: state.totals.duplicate_refs + result.summary.duplicate_refs,
    },
    wave_history: [...state.wave_history, historyEntry],
  };
}

export function fullCoverageStateSummary(state: FullCoveragePersistentState) {
  const statusCounts = state.partitions.reduce<Record<string, number>>((acc, partition) => {
    acc[partition.status] = (acc[partition.status] ?? 0) + 1;
    return acc;
  }, {});
  const terminalScopes = new Set(
    state.partitions
      .filter((partition) => partition.status === "completed" && partition.stop_reason !== "window_exhausted")
      .map((partition) => partition.scope_id),
  );
  const activeScopes = new Set(
    state.partitions
      .filter((partition) => partition.status === "pending" || partition.status === "running" || partition.stop_reason === "window_exhausted")
      .map((partition) => partition.scope_id),
  );

  return {
    run_id: state.run_id,
    partitions_total: state.partitions.length,
    partition_status_counts: statusCounts,
    terminal_scopes: terminalScopes.size,
    active_scopes: activeScopes.size,
    unique_listings: state.seen_source_ids.length,
    totals: state.totals,
  };
}
