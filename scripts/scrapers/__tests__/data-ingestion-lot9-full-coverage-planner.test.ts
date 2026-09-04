import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDiscoveryUrl,
  buildFullCoverageScopes,
  buildInitialFullCoveragePlan,
  checkpointPartition,
  completePartition,
  failPartition,
  markPartitionRunning,
  nextFullCoveragePartition,
} from "../../../data-ingestion/sources/mubawab/full-coverage.js";

describe("Lot 9 Mubawab Full Coverage planner", () => {
  it("builds the complete deterministic first-wave matrix across enabled cities and categories", () => {
    const scopes = buildFullCoverageScopes();
    const plan = buildInitialFullCoveragePlan(25);

    assert.equal(scopes.length, 132);
    assert.equal(plan.length, 132);
    assert.equal(new Set(scopes.map((scope) => scope.scope_id)).size, 132);
    assert.equal(new Set(plan.map((partition) => partition.partition_id)).size, 132);

    assert.ok(scopes.some((scope) => scope.city === "Casablanca" && scope.category_key === "apartment_sale"));
    assert.ok(scopes.some((scope) => scope.city === "Rabat" && scope.category_key === "riad_rent"));
    assert.ok(scopes.some((scope) => scope.city === "Fès" && scope.category_key === "land_sale"));

    for (const partition of plan) {
      assert.equal(partition.page_start, 1);
      assert.equal(partition.page_end, 25);
      assert.equal(partition.next_page, 1);
      assert.equal(partition.status, "pending");
      assert.equal(partition.pages_processed, 0);
      assert.equal(partition.stop_reason, null);
    }
  });

  it("creates deterministic deep-pagination windows only after the previous window is exhausted", () => {
    const initial = buildInitialFullCoveragePlan(25)[0];
    const running = markPartitionRunning(initial);
    const checkpointed = checkpointPartition(running, {
      page: 25,
      listings_discovered: 500,
      unique_added: 420,
    });
    const completed = completePartition(checkpointed, "window_exhausted");
    const next = nextFullCoveragePartition(completed, 25);

    assert.ok(next);
    assert.equal(next.scope_id, initial.scope_id);
    assert.equal(next.page_start, 26);
    assert.equal(next.page_end, 50);
    assert.equal(next.next_page, 26);
    assert.equal(next.status, "pending");
    assert.match(next.partition_id, /:p26-50$/);
  });

  it("terminates a scope when discovery reports zero new unique ids", () => {
    const initial = buildInitialFullCoveragePlan(10)[0];
    const running = markPartitionRunning(initial);
    const checkpointed = checkpointPartition(running, {
      page: 4,
      listings_discovered: 20,
      unique_added: 0,
    });
    const completed = completePartition(checkpointed, "zero_new_unique_ids");

    assert.equal(nextFullCoveragePartition(completed, 10), null);
    assert.equal(completed.stop_reason, "zero_new_unique_ids");
  });

  it("keeps a monotonic checkpoint and rejects invalid page/count transitions", () => {
    const initial = buildInitialFullCoveragePlan(10)[0];
    const running = markPartitionRunning(initial);
    const page3 = checkpointPartition(running, {
      page: 3,
      listings_discovered: 60,
      unique_added: 50,
    });

    assert.equal(page3.next_page, 4);
    assert.equal(page3.pages_processed, 3);
    assert.equal(page3.listings_discovered, 60);
    assert.equal(page3.unique_added, 50);

    assert.throws(
      () => checkpointPartition(page3, { page: 3, listings_discovered: 10, unique_added: 10 }),
      /lot9_invalid_checkpoint_page/,
    );
    assert.throws(
      () => checkpointPartition(page3, { page: 4, listings_discovered: 5, unique_added: 6 }),
      /lot9_invalid_checkpoint_counts/,
    );
  });

  it("records failed partitions without silently advancing them", () => {
    const initial = buildInitialFullCoveragePlan(25)[0];
    const failed = failPartition(markPartitionRunning(initial), "HTTP 502");

    assert.equal(failed.status, "failed");
    assert.deepEqual(failed.errors, ["HTTP 502"]);
    assert.throws(() => nextFullCoveragePartition(failed, 25), /lot9_partition_not_completed/);
  });

  it("builds source URLs inside the partition and preserves source route semantics", () => {
    const plan = buildInitialFullCoveragePlan(25);
    const casaApartmentSale = plan.find((partition) => partition.city === "Casablanca" && partition.category_key === "apartment_sale");
    assert.ok(casaApartmentSale);

    assert.equal(
      buildDiscoveryUrl(casaApartmentSale, 1),
      "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre",
    );
    assert.equal(
      buildDiscoveryUrl(casaApartmentSale, 25),
      "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre:p:25",
    );
    assert.throws(() => buildDiscoveryUrl(casaApartmentSale, 26), /lot9_page_outside_partition/);
  });
});
