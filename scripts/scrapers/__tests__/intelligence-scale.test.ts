import assert from "node:assert/strict";
import test from "node:test";
import { buildIntelligenceScale } from "@/lib/map/intelligence-scale";

test("density thresholds are derived only from the current snapshot", () => {
  const result = buildIntelligenceScale("density", [
    { zoneId: "a", value: 2 },
    { zoneId: "b", value: 4 },
    { zoneId: "c", value: 8 },
    { zoneId: "d", value: 16 },
  ]);
  assert.deepEqual(result.legend, {
    mode: "density",
    method: "snapshot_quantiles_v1",
    availableCount: 4,
    classCount: 4,
    thresholds: [3.5, 6, 10],
    min: 2,
    max: 16,
  });
  assert.deepEqual(result.classes.map((row) => row.classIndex), [0, 1, 2, 3]);
});

test("price keeps insufficient and missing observations neutral", () => {
  const result = buildIntelligenceScale("price", [
    { zoneId: "agdal", value: 12_000, reliability: "insufficient" },
    { zoneId: "hay-riad", value: null, reliability: "insufficient" },
    { zoneId: "souissi", value: 18_000, reliability: "limited" },
    { zoneId: "hassan", value: 15_000, reliability: "moderate" },
  ]);
  assert.equal(result.legend.availableCount, 2);
  assert.equal(result.legend.classCount, 2);
  assert.deepEqual(result.classes.map((row) => [row.zoneId, row.neutral]), [
    ["agdal", true],
    ["hay-riad", true],
    ["souissi", false],
    ["hassan", false],
  ]);
});

test("listings zero is a real lowest value, not missing data", () => {
  const result = buildIntelligenceScale("listings", [
    { zoneId: "a", value: 0 },
    { zoneId: "b", value: 3 },
  ]);
  assert.equal(result.classes[0].neutral, false);
  assert.equal(result.classes[0].classIndex, 0);
  assert.equal(result.legend.min, 0);
});

test("all unavailable values produce an empty legend and neutral classes", () => {
  const result = buildIntelligenceScale("price", [
    { zoneId: "a", value: null, reliability: "insufficient" },
    { zoneId: "b", value: 20_000, reliability: "insufficient" },
  ]);
  assert.equal(result.legend.availableCount, 0);
  assert.equal(result.legend.classCount, 0);
  assert.equal(result.legend.min, null);
  assert.equal(result.legend.max, null);
  assert.ok(result.classes.every((row) => row.neutral && row.classIndex === null));
});

test("class count contracts to distinct values and rejects invalid class requests", () => {
  const result = buildIntelligenceScale("density", [
    { zoneId: "a", value: 5 },
    { zoneId: "b", value: 5 },
    { zoneId: "c", value: 10 },
  ], 5);
  assert.equal(result.legend.classCount, 2);
  assert.throws(() => buildIntelligenceScale("density", [], 0), /between 1 and 7/);
});
