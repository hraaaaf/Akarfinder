import { runFullCoverageWave, type FullCoverageWaveResult } from "./full-coverage-runner.js";
import {
  applyFullCoverageWave,
  type FullCoveragePersistentState,
} from "./full-coverage-state.js";
import type { DiscoveryFetcher } from "./discovery.js";

export type FullCoverageCampaignResult = {
  state: FullCoveragePersistentState;
  waves_executed: number;
  stopped_by_kill_switch: boolean;
  exhausted_pending_partitions: boolean;
};

function positiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`lot9_campaign_invalid_${field}:${value}`);
  return value;
}

export async function runFullCoverageCampaign(input: {
  state: FullCoveragePersistentState;
  fetchPage: DiscoveryFetcher;
  maxWaves: number;
  maxPartitionsPerWave: number;
  isKilled?: () => boolean;
  now?: () => string;
  onCheckpoint?: (state: FullCoveragePersistentState, wave: FullCoverageWaveResult) => Promise<void> | void;
}): Promise<FullCoverageCampaignResult> {
  const maxWaves = positiveInteger(input.maxWaves, "max_waves");
  const maxPartitionsPerWave = positiveInteger(input.maxPartitionsPerWave, "max_partitions_per_wave");
  const now = input.now ?? (() => new Date().toISOString());
  let state = input.state;
  let wavesExecuted = 0;
  let stoppedByKillSwitch = false;

  for (let index = 0; index < maxWaves; index++) {
    const pendingBefore = state.partitions.filter((partition) => partition.status === "pending").length;
    if (pendingBefore === 0) break;

    const startedAt = now();
    const wave = await runFullCoverageWave({
      partitions: state.partitions,
      fetchPage: input.fetchPage,
      maxPartitions: maxPartitionsPerWave,
      pageWindow: state.page_window,
      seenSourceIds: state.seen_source_ids,
      isKilled: input.isKilled,
    });
    const completedAt = now();

    if (wave.summary.partitions_started === 0) {
      throw new Error("lot9_campaign_no_partition_progress");
    }

    state = applyFullCoverageWave(state, wave, {
      waveId: `${state.run_id}:wave-${String(state.totals.waves_completed + 1).padStart(4, "0")}`,
      startedAt,
      completedAt,
    });
    wavesExecuted += 1;
    await input.onCheckpoint?.(state, wave);

    if (wave.summary.stopped_by_kill_switch) {
      stoppedByKillSwitch = true;
      break;
    }
  }

  return {
    state,
    waves_executed: wavesExecuted,
    stopped_by_kill_switch: stoppedByKillSwitch,
    exhausted_pending_partitions: state.partitions.every((partition) => partition.status !== "pending"),
  };
}
