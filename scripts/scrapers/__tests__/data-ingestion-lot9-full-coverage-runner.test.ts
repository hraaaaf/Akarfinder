import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildInitialFullCoveragePlan } from "../../../data-ingestion/sources/mubawab/full-coverage.js";
import { runFullCoverageWave } from "../../../data-ingestion/sources/mubawab/full-coverage-runner.js";

function html(ids: string[]) {
  return `<!doctype html><html><body>${ids.map((id) => `<a href="/fr/a/${id}/listing-${id}">listing</a>`).join("")}</body></html>`;
}

describe("Lot 9 bounded Full Coverage runner", () => {
  it("processes a bounded wave, deduplicates globally, checkpoints pages and creates only valid next windows", async () => {
    const partitions = buildInitialFullCoveragePlan(2)
      .filter((partition) => partition.city === "Casablanca")
      .slice(0, 3);

    const result = await runFullCoverageWave({
      partitions,
      maxPartitions: 3,
      pageWindow: 2,
      seenSourceIds: ["1002"],
      fetchPage: async (url) => {
        if (url.includes("appartements-a-vendre")) {
          return url.includes(":p:2") ? html(["1003"]) : html(["1001", "1002"]);
        }
        if (url.includes("appartements-a-louer")) {
          return html(["2001"]);
        }
        if (url.includes("terrains-a-vendre")) throw new Error("temporary_upstream_failure");
        throw new Error(`unexpected_url:${url}`);
      },
    });

    const sale = result.partitions[0];
    const rent = result.partitions[1];
    const land = result.partitions[2];

    assert.equal(sale.status, "completed");
    assert.equal(sale.stop_reason, "window_exhausted");
    assert.equal(sale.pages_processed, 2);
    assert.equal(sale.next_page, 3);

    assert.equal(rent.status, "completed");
    assert.equal(rent.stop_reason, "zero_new_unique_ids");
    assert.equal(rent.pages_processed, 2);

    assert.equal(land.status, "failed");
    assert.deepEqual(land.errors, ["temporary_upstream_failure"]);

    assert.equal(result.next_partitions.length, 1);
    assert.equal(result.next_partitions[0].scope_id, sale.scope_id);
    assert.equal(result.next_partitions[0].page_start, 3);
    assert.equal(result.next_partitions[0].page_end, 4);

    assert.deepEqual(result.seen_source_ids, ["1001", "1002", "1003", "2001"]);
    assert.equal(result.summary.partitions_started, 3);
    assert.equal(result.summary.partitions_completed, 2);
    assert.equal(result.summary.partitions_failed, 1);
    assert.equal(result.summary.pages_requested, 5);
    assert.equal(result.summary.pages_succeeded, 4);
    assert.equal(result.summary.listings_discovered, 5);
    assert.equal(result.summary.unique_added, 3);
    assert.equal(result.summary.duplicate_refs, 2);
    assert.equal(result.summary.next_partitions_created, 1);
  });

  it("classifies robots and explicit source blocks as terminal safety stops instead of retryable failures", async () => {
    const partitions = buildInitialFullCoveragePlan(2)
      .filter((partition) => partition.city === "Casablanca")
      .slice(0, 2);

    const result = await runFullCoverageWave({
      partitions,
      maxPartitions: 2,
      pageWindow: 2,
      fetchPage: async (url) => {
        if (url.includes("appartements-a-vendre")) throw new Error(`robots_disallowed:${url}`);
        throw new Error(`explicit_source_block:HTTP 429:${url}`);
      },
    });

    assert.equal(result.partitions[0].status, "completed");
    assert.equal(result.partitions[0].stop_reason, "robots_disallowed");
    assert.equal(result.partitions[1].status, "completed");
    assert.equal(result.partitions[1].stop_reason, "source_block");
    assert.equal(result.summary.partitions_failed, 0);
    assert.equal(result.summary.next_partitions_created, 0);
  });

  it("pauses instead of falsely completing a partition when the kill-switch fires before the first page", async () => {
    const partitions = buildInitialFullCoveragePlan(2)
      .filter((partition) => partition.city === "Casablanca")
      .slice(0, 3);
    let killChecks = 0;
    let fetchCalls = 0;

    const result = await runFullCoverageWave({
      partitions,
      maxPartitions: 3,
      pageWindow: 2,
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
    assert.equal(result.partitions[0].status, "pending");
    assert.equal(result.partitions[0].stop_reason, "manual_kill_switch");
    assert.equal(result.partitions[0].next_page, 1);
    assert.equal(result.partitions[1].status, "pending");
    assert.equal(result.partitions[2].status, "pending");
    assert.equal(result.summary.partitions_completed, 0);
    assert.equal(result.summary.stopped_by_kill_switch, true);
    assert.equal(result.summary.partitions_started, 1);
  });

  it("resumes from the exact page checkpoint after a mid-partition kill-switch", async () => {
    const partition = buildInitialFullCoveragePlan(3)
      .find((item) => item.city === "Casablanca" && item.category_key === "apartment_sale");
    assert.ok(partition);
    let killChecks = 0;

    const paused = await runFullCoverageWave({
      partitions: [partition],
      maxPartitions: 1,
      pageWindow: 3,
      isKilled: () => {
        killChecks += 1;
        return killChecks >= 3;
      },
      fetchPage: async () => html(["7001"]),
    });

    assert.equal(paused.partitions[0].status, "pending");
    assert.equal(paused.partitions[0].stop_reason, "manual_kill_switch");
    assert.equal(paused.partitions[0].pages_processed, 1);
    assert.equal(paused.partitions[0].next_page, 2);
    assert.deepEqual(paused.seen_source_ids, ["7001"]);

    const requested: string[] = [];
    const resumed = await runFullCoverageWave({
      partitions: paused.partitions,
      seenSourceIds: paused.seen_source_ids,
      maxPartitions: 1,
      pageWindow: 3,
      fetchPage: async (url) => {
        requested.push(url);
        return url.includes(":p:2") ? html(["7002"]) : html(["7003"]);
      },
    });

    assert.equal(requested.length, 2);
    assert.ok(requested[0].includes(":p:2"));
    assert.ok(requested[1].includes(":p:3"));
    assert.equal(resumed.partitions[0].status, "completed");
    assert.equal(resumed.partitions[0].stop_reason, "window_exhausted");
    assert.equal(resumed.partitions[0].pages_processed, 3);
    assert.equal(resumed.partitions[0].next_page, 4);
    assert.deepEqual(resumed.seen_source_ids, ["7001", "7002", "7003"]);
  });
});
