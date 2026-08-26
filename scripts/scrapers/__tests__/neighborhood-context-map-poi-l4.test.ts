import assert from "node:assert/strict";
import test from "node:test";

import type { NeighborhoodContextAnchorReadV1 } from "@/lib/neighborhood-context/read-model";
import {
  availableMapPoiFilters,
  filterMapPoiAnchors,
  formatMapPoiDistance,
  mapPoiFilterForCategory,
} from "@/lib/neighborhood-context/map-poi-presentation";

function anchor(
  poi_id: string,
  rank: number,
  category: NeighborhoodContextAnchorReadV1["category"],
  freshness_status: NeighborhoodContextAnchorReadV1["freshness_status"] = "fresh",
): NeighborhoodContextAnchorReadV1 {
  return {
    poi_id,
    name: poi_id,
    category,
    rank,
    role: "daily",
    latitude: 34.0 + rank / 1000,
    longitude: -6.8 - rank / 1000,
    relation: "near_certified_reference",
    territorial_wording: "Autour du repère quartier",
    distance_to_reference_m: rank * 100,
    source_id: "test",
    source_url: null,
    attribution: "Test attribution",
    license_policy: "test",
    license_url: null,
    observed_at: "2026-08-20T00:00:00.000Z",
    freshness_status,
  };
}

test("presentation groups reuse canonical LivingHere categories", () => {
  assert.equal(mapPoiFilterForCategory("transport"), "transport");
  assert.equal(mapPoiFilterForCategory("education"), "education");
  assert.equal(mapPoiFilterForCategory("health"), "health");
  assert.equal(mapPoiFilterForCategory("groceries"), "groceries");
  assert.equal(mapPoiFilterForCategory("green_sport"), "green_sport");
  assert.equal(mapPoiFilterForCategory("shopping"), "services");
  assert.equal(mapPoiFilterForCategory("banking"), "services");
  assert.equal(mapPoiFilterForCategory("other"), "services");
});

test("available filters expose only groups present in anchors", () => {
  const filters = availableMapPoiFilters([
    anchor("a", 1, "health"),
    anchor("b", 2, "groceries"),
    anchor("c", 3, "shopping"),
  ]);
  assert.deepEqual(filters, ["all", "health", "groceries", "services"]);
});

test("map anchors are rank-stable, fresh-only and capped at eight", () => {
  const anchors = Array.from({ length: 10 }, (_, index) => anchor(`p${index + 1}`, index + 1, "health"));
  const shuffled = [anchors[5], anchors[0], anchors[8], ...anchors.filter((_, index) => ![5, 0, 8].includes(index))];
  assert.deepEqual(
    filterMapPoiAnchors(shuffled, "all").map((item) => item.poi_id),
    ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
  );
});

test("category filter never leaks unrelated anchors", () => {
  const anchors = [
    anchor("school", 1, "education"),
    anchor("clinic", 2, "health"),
    anchor("market", 3, "groceries"),
    anchor("bank", 4, "banking"),
  ];
  assert.deepEqual(filterMapPoiAnchors(anchors, "health").map((item) => item.poi_id), ["clinic"]);
  assert.deepEqual(filterMapPoiAnchors(anchors, "services").map((item) => item.poi_id), ["bank"]);
});

test("distance formatter does not manufacture travel-time wording", () => {
  assert.equal(formatMapPoiDistance(474), "470 m");
  assert.equal(formatMapPoiDistance(1361), "1,4 km");
  assert.equal(formatMapPoiDistance(null), null);
  for (const value of [formatMapPoiDistance(474), formatMapPoiDistance(1361)]) {
    assert.doesNotMatch(String(value), /min|minute|marche|voiture/i);
  }
});
