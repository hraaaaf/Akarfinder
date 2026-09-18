import assert from "node:assert/strict";
import test from "node:test";

import { selectStableTerritoryLabels } from "../../../lib/geo/territory-label-stability";

test("LOT7 prevents overlapping labels while keeping the higher priority one", () => {
  const selected = selectStableTerritoryLabels({
    maxLabels: 10,
    candidates: [
      { id: "casablanca", x: 100, y: 100, width: 90, height: 24, visibilityScore: 100, retainPriority: true },
      { id: "mohammedia", x: 125, y: 100, width: 90, height: 24, visibilityScore: 68, retainPriority: false },
      { id: "rabat", x: 300, y: 100, width: 70, height: 24, visibilityScore: 98, retainPriority: true },
    ],
  });

  assert.deepEqual(selected.map((item) => item.id), ["casablanca", "rabat"]);
});

test("hysteresis keeps a previously visible label through a small score reversal", () => {
  const selected = selectStableTerritoryLabels({
    maxLabels: 1,
    previousVisibleIds: new Set(["stable"]),
    hysteresisBonus: 4,
    candidates: [
      { id: "stable", x: 100, y: 100, width: 80, height: 24, visibilityScore: 80, retainPriority: false },
      { id: "challenger", x: 100, y: 100, width: 80, height: 24, visibilityScore: 82, retainPriority: false },
    ],
  });

  assert.equal(selected[0]?.id, "stable");
});

test("retained flagship labels outrank non-retained labels under collision", () => {
  const selected = selectStableTerritoryLabels({
    maxLabels: 1,
    candidates: [
      { id: "flagship", x: 100, y: 100, width: 80, height: 24, visibilityScore: 70, retainPriority: true },
      { id: "local", x: 100, y: 100, width: 80, height: 24, visibilityScore: 99, retainPriority: false },
    ],
  });

  assert.equal(selected[0]?.id, "flagship");
});

test("capacity and invalid geometry fail closed deterministically", () => {
  assert.deepEqual(selectStableTerritoryLabels({ maxLabels: 0, candidates: [] }), []);

  const selected = selectStableTerritoryLabels({
    maxLabels: 2,
    candidates: [
      { id: "invalid", x: Number.NaN, y: 0, width: 10, height: 10, visibilityScore: 100, retainPriority: true },
      { id: "valid", x: 0, y: 0, width: 10, height: 10, visibilityScore: 90, retainPriority: true },
    ],
  });
  assert.deepEqual(selected.map((item) => item.id), ["valid"]);
});
