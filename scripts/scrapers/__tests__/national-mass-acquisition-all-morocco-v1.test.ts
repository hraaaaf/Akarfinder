import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildQueryUniverseV2 } from "../../../lib/openserp-ingestion/query-universe-v2.js";
import {
  ACQUISITION_EXPANSION_CITIES,
  ALL_ACQUISITION_CITIES,
  CITY_ARABIC_NAMES,
} from "../../../lib/openserp-ingestion/national-geography.js";

test("national acquisition geography covers Morocco beyond the historical 16-city planner", () => {
  assert.ok(ACQUISITION_EXPANSION_CITIES.length >= 35);
  assert.ok(ALL_ACQUISITION_CITIES.length >= 50);
  for (const city of ["Casablanca", "Rabat", "Tanger", "Oujda", "Safi", "Béni Mellal", "Al Hoceima", "Errachidia", "Guelmim", "Laâyoune", "Dakhla"]) {
    assert.ok(ALL_ACQUISITION_CITIES.includes(city), `missing national acquisition city: ${city}`);
    assert.ok(CITY_ARABIC_NAMES[city], `missing Arabic discovery label for ${city}`);
  }
});

test("V2 query universe spans at least 50 Moroccan cities while staying bounded", () => {
  const universe = buildQueryUniverseV2();
  assert.ok(universe.cities_covered >= 50, `expected >=50 cities, got ${universe.cities_covered}`);
  assert.ok(universe.total_queries >= 8_000, `expected >=8000 queries, got ${universe.total_queries}`);
  assert.ok(universe.total_queries <= 20_000, `expected <=20000 queries, got ${universe.total_queries}`);
  const cities = new Set(universe.queries.map((query) => query.city));
  for (const city of ["Casablanca", "Safi", "Béni Mellal", "Al Hoceima", "Errachidia", "Laâyoune", "Dakhla"]) {
    assert.ok(cities.has(city), `query universe missing ${city}`);
  }
});

test("national scale runner never reduces the V2 universe to one city", () => {
  const runner = readFileSync(join(process.cwd(), "scripts/openserp/run-ingestion-github-actions.ts"), "utf8");
  assert.ok(runner.includes("const universe = buildQueryUniverseV2()"));
  assert.ok(runner.includes("national_hot_lane: true"));
  assert.ok(runner.includes("single_city_exclusive_filter: false"));
  assert.equal(runner.includes("MASS_CAMPAIGN_CITY"), false);
  assert.equal(runner.includes("MASS_CAMPAIGN_BOOTSTRAP_TARGET"), false);
  assert.equal(runner.includes("query.city === MASS_CAMPAIGN_CITY"), false);
});

test("new geography remains city-level only when no vetted district taxonomy exists", () => {
  const universe = buildQueryUniverseV2();
  const dakhla = universe.queries.filter((query) => query.city === "Dakhla");
  assert.ok(dakhla.length > 0);
  assert.ok(dakhla.every((query) => query.district === null), "must not invent Dakhla districts");
});