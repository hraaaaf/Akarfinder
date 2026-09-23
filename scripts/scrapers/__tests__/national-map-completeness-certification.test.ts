import assert from "node:assert/strict";
import test from "node:test";

import { GEO_CITIES, GEO_NEIGHBORHOODS } from "../../../lib/geo/geo-entity-registry";
import { VERIFIED_LANDMARKS } from "../../../lib/geo/territory-landmark-registry";
import {
  NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS,
  NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY,
} from "../../../lib/geo/national-neighborhood-boundary-readiness";
import { buildCanonicalPremiumMapData } from "../../../lib/map/canonical-premium-map-data";

test("national completeness keeps all 19 canonical cities positioned", () => {
  const regionalCities = buildCanonicalPremiumMapData().flatMap((region) => region.regionalCities);
  assert.equal(GEO_CITIES.length, 19);
  assert.equal(regionalCities.length, 19);
  assert.equal(new Set(regionalCities.map((city) => city.slug)).size, 19);
  assert.ok(regionalCities.every((city) => city.coordinates), "every canonical city must have a map centroid");
});

test("national completeness keeps all 63 canonical neighborhoods landmark-anchored", () => {
  assert.equal(GEO_NEIGHBORHOODS.length, 63);

  const landmarkParents = new Set(VERIFIED_LANDMARKS.map((entry) => entry.entity.parentId));
  const missing = GEO_NEIGHBORHOODS
    .filter((district) => !landmarkParents.has(district.id))
    .map((district) => district.id);

  assert.deepEqual(missing, []);
  assert.equal(
    GEO_NEIGHBORHOODS.filter((district) => landmarkParents.has(district.id)).length,
    63,
  );
});

test("national completeness classifies boundary readiness for every canonical neighborhood", () => {
  assert.equal(NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY.canonicalNeighborhoodCount, 63);
  assert.equal(NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY.explicitStatusCount, 63);
  assert.equal(NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.length, 63);
  assert.equal(
    new Set(NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.map((entry) => entry.districtId)).size,
    63,
  );

  const canonicalIds = new Set(GEO_NEIGHBORHOODS.map((district) => district.id));
  assert.ok(NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.every((entry) => canonicalIds.has(entry.districtId)));
});

test("national completeness remains fail-closed on unverified product boundaries", () => {
  assert.equal(NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY.syntheticBoundaryCount, 0);
  assert.equal(NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY.publishedProductBoundaryCount, 0);
  assert.equal(NATIONAL_NEIGHBORHOOD_BOUNDARY_SUMMARY.unpublishedCount, 63);
  assert.ok(
    NATIONAL_NEIGHBORHOOD_BOUNDARY_READINESS.every(
      (entry) =>
        entry.publicationAllowed === false &&
        entry.status !== "PUBLISHED_PRODUCT_BOUNDARY" &&
        entry.geometryRole !== "PRODUCT_BOUNDARY",
    ),
  );
});
