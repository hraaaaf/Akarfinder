import assert from "node:assert/strict";
import test from "node:test";

import {
  computeZoomRelevance,
  selectNationalCityVisibility,
} from "../../../lib/geo/territory-national-visibility";

test("LOT5 low zoom keeps the flagship cities first", () => {
  const selected = selectNationalCityVisibility({ zoom: 4.2, maxLabels: 6 });
  assert.deepEqual(selected.map((item) => item.citySlug), [
    "casablanca",
    "rabat",
    "marrakech",
    "tanger",
    "agadir",
    "fes",
  ]);
  assert.ok(selected.every((item) => item.retained));
});

test("zooming in adds non-flagship cities without evicting flagships", () => {
  const selected = selectNationalCityVisibility({ zoom: 5.5, maxLabels: 12 });
  const slugs = selected.map((item) => item.citySlug);
  for (const flagship of ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"]) {
    assert.ok(slugs.includes(flagship as any));
  }
  assert.ok(slugs.includes("meknes"));
  assert.ok(slugs.includes("kenitra"));
});

test("capacity remains deterministic and favors retained flagship labels", () => {
  const selected = selectNationalCityVisibility({ zoom: 7, maxLabels: 4 });
  assert.deepEqual(selected.map((item) => item.citySlug), [
    "casablanca",
    "rabat",
    "marrakech",
    "tanger",
  ]);
});

test("zoom relevance is zero before threshold and reaches one after the ramp", () => {
  assert.equal(computeZoomRelevance(5, 4.9), 0);
  assert.equal(computeZoomRelevance(5, 5), 0.72);
  assert.equal(computeZoomRelevance(5, 7), 1);
});

test("invalid label capacity fails closed", () => {
  assert.deepEqual(selectNationalCityVisibility({ zoom: 5, maxLabels: 0 }), []);
  assert.deepEqual(selectNationalCityVisibility({ zoom: Number.NaN, maxLabels: 5 }), []);
});
