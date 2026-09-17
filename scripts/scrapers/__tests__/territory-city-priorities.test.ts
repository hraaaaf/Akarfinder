import assert from "node:assert/strict";
import test from "node:test";

import { GEO_CITIES, type CanonicalCitySlug } from "../../../lib/geo/geo-entity-registry";
import {
  NATIONAL_CITY_PRIORITY,
  getNationalCitiesVisibleAtZoom,
  getNationalCityRevealOrder,
} from "../../../lib/geo/territory-city-priorities";

const FLAGSHIP: CanonicalCitySlug[] = [
  "casablanca",
  "rabat",
  "marrakech",
  "tanger",
  "agadir",
  "fes",
];

test("LOT2 covers every canonical city exactly once", () => {
  const canonical = GEO_CITIES.map((city) => city.slug).sort();
  const prioritized = Object.keys(NATIONAL_CITY_PRIORITY).sort();

  assert.deepEqual(prioritized, canonical);
});

test("flagship cities are the first national reveal group", () => {
  const order = getNationalCityRevealOrder();
  assert.deepEqual(order.slice(0, FLAGSHIP.length), FLAGSHIP);
  for (const flagship of FLAGSHIP) {
    assert.equal(NATIONAL_CITY_PRIORITY[flagship].retainPriority, true);
    assert.equal(NATIONAL_CITY_PRIORITY[flagship].tier, "flagship");
  }
});

test("low zoom reveals only the flagship surface", () => {
  assert.deepEqual(getNationalCitiesVisibleAtZoom(4.2), FLAGSHIP);
});

test("zooming in only adds cities and keeps flagship cities", () => {
  const zoom42 = getNationalCitiesVisibleAtZoom(4.2);
  const zoom55 = getNationalCitiesVisibleAtZoom(5.5);
  const zoom70 = getNationalCitiesVisibleAtZoom(7.0);

  assert.ok(zoom55.length > zoom42.length);
  assert.ok(zoom70.length > zoom55.length);

  for (const flagship of FLAGSHIP) {
    assert.ok(zoom55.includes(flagship));
    assert.ok(zoom70.includes(flagship));
  }
});

test("priority scores form a deterministic descending reveal order", () => {
  const order = getNationalCityRevealOrder();
  const scores = order.map((slug) => NATIONAL_CITY_PRIORITY[slug].score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});
