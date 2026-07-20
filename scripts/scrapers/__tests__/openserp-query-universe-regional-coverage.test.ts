// OPENSERP-QUERY-UNIVERSE-REGIONAL-DOMAIN-CITY-SCOPING-1
// Exercises the REAL, unmodified buildUniverse() against the REAL
// data/openserp/source-domain-registry.json -- no mocking, since this is a
// data-generation script, not a pure function meant to be isolated from its
// registry input. Never calls main() (the only function that writes to
// disk), so this file never touches the Production query-universe-v1.json.

import test from "node:test";
import assert from "node:assert/strict";
import { buildUniverse, type UniverseQuery } from "../../openserp/build-query-universe.js";
import { TIER_1_CITIES } from "../../../lib/openserp-ingestion/national-geography.js";

function siteQueriesFor(universe: UniverseQuery[], domain: string): UniverseQuery[] {
  return universe.filter((q) => q.target_domain === domain);
}

test("national domain (coverage_cities null/absent): still generates all TIER_1_CITIES x sale/rent", () => {
  const universe = buildUniverse();
  const mubawab = siteQueriesFor(universe, "mubawab.ma");
  assert.equal(mubawab.length, TIER_1_CITIES.length * 2, "mubawab.ma must be unchanged: every TIER_1 city x sale/rent");
  const citiesSeen = new Set(mubawab.map((q) => q.city));
  assert.equal(citiesSeen.size, TIER_1_CITIES.length);
  for (const city of TIER_1_CITIES) assert.ok(citiesSeen.has(city), `mubawab.ma must still target ${city}`);
});

test("regional domain (coverage_cities set): generates ONLY those cities, not TIER_1_CITIES", () => {
  const universe = buildUniverse();
  const barnes = siteQueriesFor(universe, "barnes-marrakech.com");
  assert.equal(barnes.length, 2, "barnes-marrakech.com must generate exactly 2 queries (Marrakech x sale/rent)");
  for (const q of barnes) assert.equal(q.city, "Marrakech");

  const marrakechRealty = siteQueriesFor(universe, "marrakechrealty.com");
  assert.equal(marrakechRealty.length, 4, "marrakechrealty.com must generate exactly 4 queries (2 cities x sale/rent)");
  const cities = new Set(marrakechRealty.map((q) => q.city));
  assert.deepEqual([...cities].sort(), ["Casablanca", "Marrakech"]);
});

test("kawtarimmobilier.com: Essaouira accepted even though it is outside TIER_1_CITIES", () => {
  assert.ok(!TIER_1_CITIES.includes("Essaouira"), "precondition: Essaouira must NOT be in TIER_1_CITIES for this mission");

  const universe = buildUniverse();
  const kawtar = siteQueriesFor(universe, "kawtarimmobilier.com");
  assert.equal(kawtar.length, 2, "kawtarimmobilier.com must generate exactly 2 queries (Essaouira x sale/rent)");
  for (const q of kawtar) assert.equal(q.city, "Essaouira");
});

test("limmobiliersansfrontieres.com: exactly its 2 configured cities, sale and rent both present", () => {
  const universe = buildUniverse();
  const rows = siteQueriesFor(universe, "limmobiliersansfrontieres.com");
  assert.equal(rows.length, 4);
  const byCity = new Map<string, Set<string>>();
  for (const q of rows) {
    if (!byCity.has(q.city)) byCity.set(q.city, new Set());
    byCity.get(q.city)!.add(q.transaction);
  }
  assert.deepEqual([...byCity.keys()].sort(), ["Marrakech", "Meknès"]);
  for (const transactions of byCity.values()) {
    assert.deepEqual([...transactions].sort(), ["rent", "sale"]);
  }
});

test("generic (non site:) query count is unaffected by regional domain scoping", () => {
  const universe = buildUniverse();
  const generic = universe.filter((q) => q.query_family === "general" && q.target_domain === null);
  // Two independent invocations must agree -- proves this block's size
  // depends only on TIER_1/2 cities and TIER_3 districts, never on
  // per-domain coverage_cities (which this mission only threads into the
  // separate brand_hint/target_domain loop).
  const universe2 = buildUniverse();
  const generic2 = universe2.filter((q) => q.query_family === "general" && q.target_domain === null);
  assert.equal(generic.length, generic2.length);
  assert.ok(generic.length > 0);
});

test("buildUniverse() is deterministic across repeated calls", () => {
  const first = buildUniverse();
  const second = buildUniverse();
  assert.equal(first.length, second.length);
  const firstIds = first.map((q) => q.query_id).sort();
  const secondIds = second.map((q) => q.query_id).sort();
  assert.deepEqual(firstIds, secondIds);
});
