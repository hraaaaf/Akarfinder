import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runFullCoverageWave } from "../../../data-ingestion/sources/mubawab/full-coverage-runner.js";
import {
  applyFullCoverageWave,
  createFullCoverageState,
  fullCoverageStateSummary,
  type FullCoveragePersistentState,
} from "../../../data-ingestion/sources/mubawab/full-coverage-state.js";

function html(ids: string[]) {
  return `<!doctype html><html><body>${ids.map((id) => `<a href="/fr/a/${id}/listing-${id}">listing</a>`).join("")}</body></html>`;
}

function roundTrip(state: FullCoveragePersistentState): FullCoveragePersistentState {
  return JSON.parse(JSON.stringify(state)) as FullCoveragePersistentState;
}

describe("Lot 9 persistent Full Coverage state", () => {
  it("persists partitions, seen IDs and cumulative metrics across independent waves", async () => {
    let state = createFullCoverageState({
      pageWindow: 2,
      now: () => "2026-09-04T14:20:00.000Z",
      runId: "lot9-state-proof",
    });

    assert.equal(state.partitions.length, 132);
    assert.equal(state.seen_source_ids.length, 0);

    const firstWave = await runFullCoverageWave({
      partitions: state.partitions,
      seenSourceIds: state.seen_source_ids,
      maxPartitions: 1,
      pageWindow: state.page_window,
      fetchPage: async (url) => url.includes(":p:2") ? html(["1002", "1003"]) : html(["1001", "1002"]),
    });

    state = applyFullCoverageWave(state, firstWave, {
      waveId: "wave-001",
      startedAt: "2026-09-04T14:20:01.000Z",
      completedAt: "2026-09-04T14:20:02.000Z",
    });

    assert.deepEqual(state.seen_source_ids, ["1001", "1002", "1003"]);
    assert.equal(state.totals.waves_completed, 1);
    assert.equal(state.totals.pages_requested, 2);
    assert.equal(state.totals.pages_succeeded, 2);
    assert.equal(state.totals.listings_discovered, 4);
    assert.equal(state.totals.unique_listings, 3);
    assert.equal(state.totals.duplicate_refs, 1);
    assert.equal(state.partitions.length, 133);
    assert.equal(state.wave_history.length, 1);

    state = roundTrip(state);
    const pending = state.partitions.filter((partition) => partition.status === "pending");
    const secondWave = await runFullCoverageWave({
      partitions: pending,
      seenSourceIds: state.seen_source_ids,
      maxPartitions: 1,
      pageWindow: state.page_window,
      fetchPage: async () => html(["1003", "2001"]),
    });

    state = applyFullCoverageWave(state, secondWave, {
      waveId: "wave-002",
      startedAt: "2026-09-04T14:21:01.000Z",
      completedAt: "2026-09-04T14:21:02.000Z",
    });

    assert.deepEqual(state.seen_source_ids, ["1001", "1002", "1003", "2001"]);
    assert.equal(state.totals.waves_completed, 2);
    assert.equal(state.totals.unique_listings, 4);
    assert.equal(state.wave_history.length, 2);
    assert.equal(state.wave_history[1].wave_id, "wave-002");

    const summary = fullCoverageStateSummary(state);
    assert.equal(summary.unique_listings, 4);
    assert.equal(summary.totals.waves_completed, 2);
    assert.ok(summary.partitions_total >= 133);
  });

  it("rejects duplicate wave application and loss of previously seen IDs", async () => {
    const state = createFullCoverageState({
      pageWindow: 1,
      now: () => "2026-09-04T15:00:00.000Z",
      runId: "lot9-state-guards",
    });
    const wave = await runFullCoverageWave({
      partitions: state.partitions,
      maxPartitions: 1,
      pageWindow: 1,
      fetchPage: async () => html(["9001"]),
    });
    const applied = applyFullCoverageWave(state, wave, {
      waveId: "guard-wave",
      startedAt: "2026-09-04T15:00:01.000Z",
      completedAt: "2026-09-04T15:00:02.000Z",
    });

    assert.throws(() => applyFullCoverageWave(applied, wave, {
      waveId: "guard-wave",
      startedAt: "2026-09-04T15:00:03.000Z",
      completedAt: "2026-09-04T15:00:04.000Z",
    }), /lot9_state_duplicate_wave/);

    const regressed = { ...wave, seen_source_ids: [] };
    assert.throws(() => applyFullCoverageWave(applied, regressed, {
      waveId: "guard-wave-2",
      startedAt: "2026-09-04T15:00:05.000Z",
      completedAt: "2026-09-04T15:00:06.000Z",
    }), /lot9_state_seen_ids_regressed|lot9_state_seen_id_lost/);
  });
});
