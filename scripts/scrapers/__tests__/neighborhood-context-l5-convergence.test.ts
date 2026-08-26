import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildConvergedLivingHereForListing,
  buildLivingHereNeighborhoodContextForListing,
} from "../../../lib/geo/living-here-converged-service";
import { hasLivingHereNeighborhoodContext } from "../../../lib/geo/living-here-context";
import type { LivingHereModel } from "../../../lib/geo/living-here";
import type { Listing } from "../../../lib/listings/types";
import { getNeighborhoodContextReadModelByNames } from "../../../lib/neighborhood-context/resolve-read-model";
import { getNeighborhoodContextReadModelBySlugs } from "../../../lib/neighborhood-context/read-model";

const CERTIFIED_NOW = new Date("2026-08-26T12:00:00.000Z");

function contextListing(): Listing {
  return {
    id: "l5-context-listing",
    title: "Fixture L5 Agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    latitude: 33.9959,
    longitude: -6.8533,
    geo_precision: "neighborhood_centroid",
    geo_source: "neighborhood_centroid",
    geo_label: "Agdal",
  } as Listing;
}

function exactListing(): Listing {
  return {
    ...contextListing(),
    id: "l5-exact-listing",
    latitude: 33.9908,
    longitude: -6.8481,
    geo_precision: "exact",
    geo_source: "manual_import",
    geo_label: "Coordonnées exactes QA",
  } as Listing;
}

function exactMeasurementsFixture(): LivingHereModel {
  return {
    version: "1.0",
    listingId: "l5-exact-listing",
    visibility: "full",
    reason: "exact_verified",
    origin: {
      coordinate: { latitude: 33.9908, longitude: -6.8481 },
      displayMode: "exact_pin",
      exact: true,
    },
    canShowPreciseRouteTimes: true,
    pois: [{
      id: "ann-l6-measured-school",
      name: "École mesurée QA",
      category: "education",
      categoryLabel: "Écoles & crèches",
      coordinate: { latitude: 33.9912, longitude: -6.8468 },
      confidence: "provider_verified",
      providerId: "qa-provider",
      attribution: "Fixture QA interne",
      observedAt: "2026-08-16T12:00:00.000Z",
      routes: [{
        mode: "walking",
        distanceMeters: 540,
        durationSeconds: 420,
        providerId: "qa-routing",
        attribution: "Fixture QA interne",
        observedAt: "2026-08-16T12:00:00.000Z",
      }],
    }],
    isochrones: [],
    attribution: ["Fixture QA interne"],
  };
}

test("L5 resolves the exact same Agdal read-model by names and slugs", () => {
  const bySlug = getNeighborhoodContextReadModelBySlugs("rabat", "agdal", CERTIFIED_NOW);
  const byName = getNeighborhoodContextReadModelByNames("Rabat", "Agdal", CERTIFIED_NOW);
  assert.ok(bySlug);
  assert.ok(byName);
  assert.equal(bySlug.canonical_neighborhood_id, "district_rabat_agdal");
  assert.equal(byName.canonical_neighborhood_id, bySlug.canonical_neighborhood_id);
  assert.equal(bySlug.coverage_status, "covered");
  assert.equal(bySlug.anchor_count, 5);
  assert.deepEqual(byName.anchors.map((anchor) => anchor.poi_id), bySlug.anchors.map((anchor) => anchor.poi_id));
  assert.ok(bySlug.anchors.every((anchor) => anchor.freshness_status === "fresh"));
  assert.ok(bySlug.anchors.every((anchor) => anchor.attribution && anchor.observed_at));
});

test("neighborhood-centroid listings use NCI without any provider network call", async () => {
  let fetchCalls = 0;
  const fetchImpl = (async () => {
    fetchCalls += 1;
    throw new Error("provider network must not be called for neighborhood context");
  }) as typeof fetch;

  const model = await buildConvergedLivingHereForListing(contextListing(), {
    fetchImpl,
    env: { AKAR_GEO_OVERPASS_ENDPOINT: "https://forbidden.invalid" },
    now: CERTIFIED_NOW,
  });
  const readModel = getNeighborhoodContextReadModelBySlugs("rabat", "agdal", CERTIFIED_NOW)!;

  assert.equal(fetchCalls, 0);
  assert.ok(hasLivingHereNeighborhoodContext(model));
  assert.equal(model.neighborhoodContext.canonicalNeighborhoodId, readModel.canonical_neighborhood_id);
  assert.equal(model.neighborhoodContext.coverageStatus, "covered");
  assert.equal(model.neighborhoodContext.anchorCount, 5);
  assert.equal(model.canShowPreciseRouteTimes, false);
  assert.deepEqual(model.pois.map((poi) => poi.id), readModel.anchors.map((anchor) => anchor.poi_id));
  assert.ok(model.pois.every((poi) => poi.routes.length === 0));
  assert.ok(model.pois.every((poi) => poi.territorialWording !== "Dans le quartier"));
  assert.equal(model.exactPropertyMeasurements, undefined);
});

test("exact listings keep NCI anchors as context and measured routes in a distinct submodel", async () => {
  const model = await buildConvergedLivingHereForListing(exactListing(), {
    now: CERTIFIED_NOW,
    exactMeasurementsOverride: exactMeasurementsFixture(),
  });
  const readModel = getNeighborhoodContextReadModelBySlugs("rabat", "agdal", CERTIFIED_NOW)!;

  assert.ok(hasLivingHereNeighborhoodContext(model));
  assert.equal(model.neighborhoodContext.canonicalNeighborhoodId, readModel.canonical_neighborhood_id);
  assert.deepEqual(model.pois.map((poi) => poi.id), readModel.anchors.map((anchor) => anchor.poi_id));
  assert.equal(model.canShowPreciseRouteTimes, false);
  assert.ok(model.pois.every((poi) => poi.routes.length === 0));
  assert.ok(model.exactPropertyMeasurements);
  assert.equal(model.exactPropertyMeasurements.origin.exact, true);
  assert.equal(model.exactPropertyMeasurements.canShowPreciseRouteTimes, true);
  assert.equal(model.exactPropertyMeasurements.pois[0]?.routes[0]?.distanceMeters, 540);
  assert.notDeepEqual(
    model.exactPropertyMeasurements.pois.map((poi) => poi.id),
    model.pois.map((poi) => poi.id),
  );
});

test("stale NCI seed fails closed instead of publishing old anchors", () => {
  const model = buildLivingHereNeighborhoodContextForListing(
    contextListing(),
    new Date("2026-10-01T12:00:00.000Z"),
  );
  assert.equal(model.neighborhoodContext.coverageStatus, "unavailable");
  assert.equal(model.neighborhoodContext.anchorCount, 0);
  assert.equal(model.pois.length, 0);
  assert.equal(model.canShowPreciseRouteTimes, false);
});

test("product surfaces no longer publish legacy proximity/lifestyle arrays as neighborhood truth", () => {
  const files = [
    "components/landing/SignatureMapSection.tsx",
    "app/immobilier/[city]/[district]/page.tsx",
    "app/quartiers/[citySlug]/[neighborhoodSlug]/page.tsx",
    "lib/seo-neighborhood-pages/neighborhood-seo-data.ts",
  ];
  for (const file of files) {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    assert.equal(source.includes(".proximityHighlights"), false, `${file} still publishes proximityHighlights`);
    assert.equal(source.includes(".lifestyleTags"), false, `${file} still publishes lifestyleTags`);
  }
});
