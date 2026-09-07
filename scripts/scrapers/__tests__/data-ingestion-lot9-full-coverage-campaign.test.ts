import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runFullCoverageCampaign } from "../../../data-ingestion/sources/mubawab/full-coverage-campaign.js";
import { createFullCoverageState } from "../../../data-ingestion/sources/mubawab/full-coverage-state.js";

function html(ids: string[]) {
  return `<!doctype html><html><body>${ids.map((id) => `<a href="/fr/a/${id}/listing-${id}">listing</a>`).join("")}</body></html>`;
}

describe("Lot 9 bounded Full Coverage campaign", () => {
  it("executes several bounded waves and checkpoints persistent state after each wave", async () => {
    const initial = createFullCoverageState({
      pageWindow: 1,
      now: () => "2026-09-04T16:00:00.000Z",
      runId: "lot9-campaign-proof",
    });
    let tick = 0;
    const checkpoints: number[] = [];

    const result = await runFullCoverageCampaign({
      state: initial,
      maxWaves: 3,
      maxPartitionsPerWave: 2,
      now: () => `2026-09-04T16:00:${String(++tick).padStart(2, "0")}.000Z`,
      fetchPage: async (url) => {
        const match = url.match(/:p:(\d+)/);
        const page = match ? Number(match[1]) : 1;
        const key = url.includes("appartements-a-vendre") ? "1" : url.includes("appartements-a-louer") ? "2" : "3";
        return html([`${key}${page}01`, `${key}${page}02`]);
      },
      onCheckpoint: async (state) => {
        checkpoints.push(state.totals.waves_completed);
        const reloaded = JSON.parse(JSON.stringify(state));
        assert.equal(reloaded.totals.unique_listings, state.totals.unique_listings);
      },
    });

    assert.equal(result.waves_executed, 3);
    assert.deepEqual(checkpoints, [1, 2, 3]);
    assert.equal(result.state.totals.waves_completed, 3);
    assert.equal(result.state.totals.pages_requested, 6);
    assert.equal(result.state.totals.pages_succeeded, 6);
    assert.equal(result.state.seen_source_ids.length, 6);
    assert.equal(result.stopped_by_kill_switch, false);
    assert.equal(result.state.wave_history.length, 3);
  });

  it("stops the campaign immediately when the runner kill-switch fires", async () => {
    const initial = createFullCoverageState({
      pageWindow: 2,
      now: () => "2026-09-04T17:00:00.000Z",
      runId: "lot9-campaign-kill",
    });
    let killChecks = 0;
    let fetchCalls = 0;

    const result = await runFullCoverageCampaign({
      state: initial,
      maxWaves: 5,
      maxPartitionsPerWave: 4,
      now: (() => {
        let tick = 0;
        return () => `2026-09-04T17:00:${String(++tick).padStart(2, "0")}.000Z`;
      })(),
      isKilled: () => {
        killChecks += 1;
        return killChecks >= 2;
      },
      fetchPage: async () => {
        fetchCalls += 1;
        return html(["9999"]);
      },
    });

    assert.equal(fetchCalls, 0);
    assert.equal(result.waves_executed, 1);
    assert.equal(result.stopped_by_kill_switch, true);
    assert.equal(result.state.totals.waves_completed, 1);
    assert.equal(result.state.wave_history[0].stopped_by_kill_switch, true);
  });
});
