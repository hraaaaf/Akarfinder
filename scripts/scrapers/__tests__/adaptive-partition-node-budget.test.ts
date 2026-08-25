import assert from "node:assert/strict";
import test from "node:test";
import { districtStrategy, enumerateAdaptivePartitions } from "../../coverage/adaptive-partition-enumerator";

test("node budget prevents fan-out before unbounded probing", async () => {
  let probes = 0;
  const result = await enumerateAdaptivePartitions(
    { rootKey: "root", maxNodes: 2, strategies: [districtStrategy(["A", "B", "C"])] },
    { probe: async () => { probes++; return { source: "mubawab", categoryUrl: "https://example.test/category", announcedResults: 100, discoveredUrls: ["https://example.test/a"], listingUrls: ["https://example.test/a"], pagesObserved: 10, paginationCapDetected: true, measuredAt: "2026-08-06T22:00:00Z" }; } },
  );
  assert.equal(probes, 1);
  assert.equal(result.nodesVisited, 1);
  assert.equal(result.stopped[0]?.reason, "max_nodes");
});
