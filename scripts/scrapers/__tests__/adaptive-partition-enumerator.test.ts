import assert from "node:assert/strict";
import test from "node:test";
import {
  districtStrategy,
  enumerateAdaptivePartitions,
  numericRangeStrategy,
  type PartitionNode,
} from "../../coverage/adaptive-partition-enumerator";

const base = {
  source: "mubawab",
  categoryUrl: "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre",
  pagesObserved: 10,
  paginationCapDetected: true,
  evidence: ["fixture"],
  measuredAt: "2026-08-06T22:00:00Z",
};

function urls(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://example.test/${prefix}/${i + 1}`);
}

test("does not partition a complete root", async () => {
  const result = await enumerateAdaptivePartitions(
    { rootKey: "root", strategies: [numericRangeStrategy("price", [1_000_000])] },
    { probe: async () => ({ ...base, announcedResults: 2, discoveredUrls: urls("a", 2), listingUrls: urls("a", 2) }) },
  );
  assert.equal(result.nodesVisited, 1);
  assert.equal(result.partitioned.length, 0);
  assert.equal(result.leaves[0]?.audit.status, "complete");
});

test("partitions a capped gap and closes it through children", async () => {
  const seen: PartitionNode[] = [];
  const result = await enumerateAdaptivePartitions(
    { rootKey: "casa-sale", strategies: [numericRangeStrategy("price", [1_000_000])] },
    {
      probe: async (node) => {
        seen.push(node);
        if (node.depth === 0) return { ...base, announcedResults: 100, discoveredUrls: urls("root", 20), listingUrls: urls("root", 20) };
        const childUrls = node.key.endsWith(":1") ? urls("low", 50) : urls("high", 50);
        return { ...base, announcedResults: 50, discoveredUrls: childUrls, listingUrls: childUrls, paginationCapDetected: false };
      },
    },
  );
  assert.equal(seen.length, 3);
  assert.equal(result.partitioned.length, 1);
  assert.equal(result.leaves.length, 2);
  assert.equal(result.uniqueListingUrls.length, 120);
});

test("deduplicates listing URLs across overlapping partitions", async () => {
  const shared = "https://example.test/shared";
  const result = await enumerateAdaptivePartitions(
    { rootKey: "root", strategies: [numericRangeStrategy("rooms", [2])] },
    {
      probe: async (node) => node.depth === 0
        ? { ...base, announcedResults: 10, discoveredUrls: [shared], listingUrls: [shared] }
        : { ...base, announcedResults: 1, discoveredUrls: [shared], listingUrls: [shared], paginationCapDetected: false },
    },
  );
  assert.deepEqual(result.uniqueListingUrls, ["https://example.test/shared"]);
});

test("stops fail-closed at max depth", async () => {
  const result = await enumerateAdaptivePartitions(
    { rootKey: "root", maxDepth: 1, strategies: [districtStrategy(["A", "B"]), numericRangeStrategy("price", [100])] },
    { probe: async (node) => ({ ...base, announcedResults: 10, discoveredUrls: urls(node.key, 1), listingUrls: urls(node.key, 1) }) },
  );
  assert.equal(result.partitioned.length, 1);
  assert.equal(result.stopped.length, 2);
  assert.ok(result.stopped.every((item) => item.reason === "max_depth"));
});

test("rejects invalid numeric boundaries", () => {
  assert.throws(() => numericRangeStrategy("price", [-1]), /boundaries/);
});

test("falls through to next strategy when a dimension is already set", async () => {
  const result = await enumerateAdaptivePartitions(
    {
      rootKey: "root",
      maxDepth: 2,
      strategies: [districtStrategy(["A", "B"]), numericRangeStrategy("price", [100])],
    },
    { probe: async (node) => ({ ...base, announcedResults: 10, discoveredUrls: urls(node.key, 1), listingUrls: urls(node.key, 1) }) },
  );
  assert.equal(result.partitioned[0]?.dimension, "district");
  assert.ok(result.partitioned.slice(1).every((item) => item.dimension === "price"));
});
