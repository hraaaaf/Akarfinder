import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { GEO_CITIES } from "../../../lib/geo/geo-entity-registry";
import {
  CANONICAL_CITY_REGION,
  MOROCCO_REGIONS,
} from "../../../lib/geo/morocco-region-registry";
import { NATIONAL_COUNTRY_HUBS } from "../../../lib/map/national-map-product-policy";
import {
  CASABLANCA_TARGET_NEIGHBORHOOD_READINESS,
  CASABLANCA_TARGET_NEIGHBORHOOD_READINESS_SUMMARY,
} from "../../../lib/geo/casablanca-target-neighborhood-readiness";

test("GOAL national map keeps exactly 12 canonical regions", () => {
  assert.equal(MOROCCO_REGIONS.length, 12);
  assert.equal(new Set(MOROCCO_REGIONS.map((region) => region.slug)).size, 12);
  assert.ok(MOROCCO_REGIONS.every((region) => region.authority === "HCP_12_REGION_FRAMEWORK"));
});

test("every canonical city is assigned to exactly one canonical region", () => {
  assert.equal(GEO_CITIES.length, 19);
  assert.equal(Object.keys(CANONICAL_CITY_REGION).length, GEO_CITIES.length);
  const regionSlugs = new Set(MOROCCO_REGIONS.map((region) => region.slug));
  for (const city of GEO_CITIES) {
    assert.ok(regionSlugs.has(CANONICAL_CITY_REGION[city.slug]), `missing region for ${city.slug}`);
  }
});

test("country level exposes only the eight locked product hubs", () => {
  assert.deepEqual(
    NATIONAL_COUNTRY_HUBS.map((hub) => hub.slug),
    ["casablanca", "rabat", "tanger", "marrakech", "fes", "agadir", "kenitra", "mohammedia"],
  );
  assert.equal(new Set(NATIONAL_COUNTRY_HUBS.map((hub) => hub.slug)).size, 8);
  const canonical = new Set(GEO_CITIES.map((city) => city.slug));
  assert.ok(NATIONAL_COUNTRY_HUBS.every((hub) => canonical.has(hub.slug)));
});

test("Casablanca TARGET neighborhoods remain fail-closed until product boundaries are certified", () => {
  assert.equal(CASABLANCA_TARGET_NEIGHBORHOOD_READINESS.length, 8);
  assert.equal(CASABLANCA_TARGET_NEIGHBORHOOD_READINESS_SUMMARY.targetNeighborhoodCount, 8);
  assert.equal(CASABLANCA_TARGET_NEIGHBORHOOD_READINESS_SUMMARY.publishedProductBoundaryCount, 0);
  assert.ok(CASABLANCA_TARGET_NEIGHBORHOOD_READINESS.every((item) => item.geometryPublicationAllowed === false));
});

test("navigation source preserves Pays -> Région -> Ville -> Quartier hierarchy", () => {
  const router = fs.readFileSync("components/map/NationalMapRouter.tsx", "utf8");
  const experience = fs.readFileSync("components/map/NationalTerritoryExperience.tsx", "utf8");
  const api = fs.readFileSync("app/api/geo/national-territories/route.ts", "utf8");

  assert.match(router, /params\.get\("region"\)/);
  assert.match(router, /next\.set\("region", slug\)/);
  assert.match(router, /next\.set\("city", slug\)/);
  assert.match(router, /next\.set\("district", slug\)/);

  assert.match(experience, /view: "region"/);
  assert.match(experience, /data-akarfinder-country-target-rail/);
  assert.match(experience, /data-akarfinder-region-target-rail/);
  assert.match(experience, /onSelectRegion\(place\.region\.slug\)/);

  assert.match(api, /displayPolicy: "COUNTRY_HUBS_ONLY"/);
  assert.match(api, /displayPolicy: "CANONICAL_REGION_CITY_HUBS"/);
  assert.match(api, /regionGeometryPublicationCount: 0/);
  assert.match(api, /geometryStatus: "not_published"/);
});

test("GOAL contract forbids synthetic region and neighborhood geometry", () => {
  const api = fs.readFileSync("app/api/geo/national-territories/route.ts", "utf8");
  const readiness = fs.readFileSync("lib/geo/casablanca-target-neighborhood-readiness.ts", "utf8");
  assert.doesNotMatch(api, /voronoi|turf\.buffer|midpoint/i);
  assert.match(readiness, /geometryPublicationAllowed: false/);
});
