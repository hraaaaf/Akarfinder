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
import { CANONICAL_PREMIUM_MAP_SUMMARY, buildCanonicalPremiumMapData } from "../../../lib/map/canonical-premium-map-data";

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

test("premium entry uses canonical data and no synthetic neighborhood geometry", () => {
  const regions = buildCanonicalPremiumMapData();
  const premium = fs.readFileSync("components/map/PremiumInteractiveMap.tsx", "utf8");
  const page = fs.readFileSync("app/map/page.tsx", "utf8");

  assert.equal(CANONICAL_PREMIUM_MAP_SUMMARY.regionCount, 12);
  assert.equal(CANONICAL_PREMIUM_MAP_SUMMARY.countryHubCount, 8);
  assert.equal(CANONICAL_PREMIUM_MAP_SUMMARY.syntheticPriceCount, 0);
  assert.equal(regions.reduce((sum, region) => sum + region.cities.length, 0), 8);

  assert.match(premium, /buildCanonicalPremiumMapData/);
  assert.match(premium, /data-db-mode="canonical-registry"/);
  assert.match(premium, /data-neighborhood-canonical-index/);
  assert.doesNotMatch(premium, /function neighborhoodPolygon/);
  assert.doesNotMatch(premium, /data-db-mode="mock-only"/);
  assert.doesNotMatch(premium, /Frontières de quartiers stylisées/);

  assert.match(page, /const region = firstParam\(params\.region\)/);
  assert.match(page, /!region && !city && !district/);
});

test("Maârif target uses verified landmark registry and validated artwork", () => {
  const page = fs.readFileSync("app/map/page.tsx", "utf8");
  const router = fs.readFileSync("components/map/NationalMapRouter.tsx", "utf8");
  const rail = fs.readFileSync("components/map/MaarifTargetRail.tsx", "utf8");
  const endpoint = fs.readFileSync("app/api/geo/verified-landmarks/route.ts", "utf8");
  const artwork = fs.readFileSync("components/map/LandmarkArtwork.tsx", "utf8");

  assert.match(page, /hasMaarifTargetSelection/);
  assert.match(page, /<MaarifTargetRail \/>/);
  assert.match(router, /reserveRail=\{isMaarifReference\}/);
  assert.match(rail, /\/api\/geo\/verified-landmarks\?city=casablanca&district=maarif/);
  assert.match(rail, /LandmarkArtwork/);
  assert.match(endpoint, /getVerifiedLandmarksForDistrict/);
  assert.match(endpoint, /points_only: true/);
  assert.match(endpoint, /boundary_claim: false/);
  assert.match(artwork, /case "twin-center"/);
  assert.match(artwork, /case "stade-mohammed-v"/);
});

test("GOAL contract forbids synthetic region and neighborhood geometry", () => {
  const api = fs.readFileSync("app/api/geo/national-territories/route.ts", "utf8");
  const readiness = fs.readFileSync("lib/geo/casablanca-target-neighborhood-readiness.ts", "utf8");
  assert.doesNotMatch(api, /voronoi|turf\.buffer|midpoint/i);
  assert.match(readiness, /geometryPublicationAllowed: false/);
});
