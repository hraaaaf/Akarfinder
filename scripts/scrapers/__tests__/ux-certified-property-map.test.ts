import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildCertifiedPropertyMapPoints,
  certifiedMapInteractionChangesRanking,
  hasCertifiedExactCoordinates,
  projectCertifiedCoordinates,
} from "../../../lib/ux/certified-property-map";
import type { Listing } from "../../../lib/listings/types";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Appartement test",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_500_000,
    currency: "DH",
    surface_m2: 90,
    price_per_m2: 16_667,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Récent",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 80,
    is_mre_friendly: false,
    description: "",
    image_url: "",
    reliability_explanation: "",
    latitude: 33.5731,
    longitude: -7.5898,
    geo_precision: "exact",
    geo_source: "scraped_coordinates",
    ...overrides,
  };
}

test("exact coordinates require an explicit certified source", () => {
  assert.equal(hasCertifiedExactCoordinates(makeListing()), true);
  assert.equal(hasCertifiedExactCoordinates(makeListing({ geo_precision: "city_centroid" })), false);
  assert.equal(hasCertifiedExactCoordinates(makeListing({ geo_source: "city_centroid" })), false);
  assert.equal(hasCertifiedExactCoordinates(makeListing({ latitude: null })), false);
  assert.equal(hasCertifiedExactCoordinates(makeListing({ longitude: 100 })), false);
});

test("coordinate projection stays inside the Atlas viewport", () => {
  const point = projectCertifiedCoordinates(33.5731, -7.5898);
  assert.ok(point.x >= 0 && point.x <= 100);
  assert.ok(point.y >= 0 && point.y <= 100);
});

test("one canonical property produces one exact map point", () => {
  const points = buildCertifiedPropertyMapPoints([
    makeListing({ id: "a", duplicate_group_id: "cluster-1" }),
    makeListing({ id: "b", duplicate_group_id: "cluster-1" }),
    makeListing({ id: "c", geo_precision: "neighborhood_centroid" }),
  ]);

  assert.equal(points.length, 1);
  assert.equal(points[0]?.canonicalPropertyId, "property-group:cluster-1");
});

test("map interactions remain presentation-only", () => {
  assert.equal(certifiedMapInteractionChangesRanking(), false);
  const shell = readFileSync(resolve(process.cwd(), "components/search/LightZillowSearchShell.tsx"), "utf8");
  assert.equal((shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? []).length, 1);
});

test("Atlas renders exact markers only through the certified contract", () => {
  const map = readFileSync(resolve(process.cwd(), "components/search/SearchMapPanel.tsx"), "utf8");
  assert.match(map, /buildCertifiedPropertyMapPoints\(visibleListings\)/);
  assert.match(map, /hasCertifiedExactCoordinates\(activeListing\)/);
  assert.match(map, /exactPropertyPoints\.map/);
  assert.ok(!map.includes("Math.random"));
  assert.ok(!map.includes("latitude ??"));
  assert.ok(!map.includes("longitude ??"));
});
