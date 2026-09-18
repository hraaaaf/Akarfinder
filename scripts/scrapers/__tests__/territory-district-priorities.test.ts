import assert from "node:assert/strict";
import test from "node:test";

import { GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import {
  DISTRICT_PRIORITY_OVERRIDES,
  getDistrictPriority,
  getDistrictsVisibleAtZoom,
  getPrioritizedDistrictsForCity,
} from "../../../lib/geo/territory-district-priorities";

test("LOT3 assigns a deterministic priority policy to every canonical district", () => {
  for (const district of GEO_NEIGHBORHOODS) {
    const policy = getDistrictPriority(district);
    assert.ok(policy.score >= 0 && policy.score <= 100, district.id);
    assert.ok(policy.minZoom >= 0 && policy.minZoom <= 24, district.id);
  }
});

test("all current canonical districts have an explicit editorial policy", () => {
  const canonicalIds = GEO_NEIGHBORHOODS.map((district) => district.id).sort();
  const explicitIds = Object.keys(DISTRICT_PRIORITY_OVERRIDES).sort();
  assert.deepEqual(explicitIds, canonicalIds);
});

test("Casablanca reveals Maârif before lower-priority districts", () => {
  const order = getPrioritizedDistrictsForCity("casablanca");
  assert.equal(order[0]?.id, "district_casablanca_maarif");

  const early = getDistrictsVisibleAtZoom("casablanca", 9.5);
  assert.deepEqual(early.map((district) => district.id), ["district_casablanca_maarif"]);

  const later = getDistrictsVisibleAtZoom("casablanca", 10.8);
  assert.ok(later.length > early.length);
  assert.equal(later[0]?.id, "district_casablanca_maarif");
});

test("Rabat and Marrakech keep their flagship district visible as zoom deepens", () => {
  for (const city of ["rabat", "marrakech"] as const) {
    const early = getDistrictsVisibleAtZoom(city, 9.5);
    const deep = getDistrictsVisibleAtZoom(city, 12);
    assert.equal(early.length, 1);
    assert.ok(deep.length > early.length);
    assert.equal(deep[0]?.id, early[0]?.id);
  }
});

test("editorial scores do not alter canonical eligibility flags", () => {
  const before = GEO_NEIGHBORHOODS.map(({ id, seo_eligible, map_eligible }) => ({ id, seo_eligible, map_eligible }));
  for (const district of GEO_NEIGHBORHOODS) getDistrictPriority(district);
  const after = GEO_NEIGHBORHOODS.map(({ id, seo_eligible, map_eligible }) => ({ id, seo_eligible, map_eligible }));
  assert.deepEqual(after, before);
});
