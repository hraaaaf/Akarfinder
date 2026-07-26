import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_MAP_ATLAS_AVAILABILITY,
  MAP_ATLAS_LAYERS,
  canSelectMapAtlasLayer,
  mapAtlasLayerChangesRanking,
  resolveMapAtlasLayer,
} from "../../../lib/ux/map-atlas";
import {
  MIN_ATLAS_CANONICAL_SAMPLE,
  mapAtlasAvailabilityFromPublication,
} from "../../../lib/ux/map-atlas-publication";

test("Atlas exposes listings, density and price as explicit layers", () => {
  assert.deepEqual(MAP_ATLAS_LAYERS.map((layer) => layer.id), ["listings", "density", "price"]);
});

test("uncertified density and price layers remain unavailable", () => {
  assert.equal(canSelectMapAtlasLayer("listings", DEFAULT_MAP_ATLAS_AVAILABILITY), true);
  assert.equal(canSelectMapAtlasLayer("density", DEFAULT_MAP_ATLAS_AVAILABILITY), false);
  assert.equal(canSelectMapAtlasLayer("price", DEFAULT_MAP_ATLAS_AVAILABILITY), false);
  assert.match(DEFAULT_MAP_ATLAS_AVAILABILITY.density.reason ?? "", /échantillon canonique/i);
  assert.match(DEFAULT_MAP_ATLAS_AVAILABILITY.price.reason ?? "", /certification/i);
});

test("an unavailable Atlas request falls back to honest listing distribution", () => {
  assert.equal(resolveMapAtlasLayer("density", DEFAULT_MAP_ATLAS_AVAILABILITY), "listings");
  assert.equal(resolveMapAtlasLayer("price", DEFAULT_MAP_ATLAS_AVAILABILITY), "listings");
});

test("publication gates require geometry, canonical sample and methodology", () => {
  const blocked = mapAtlasAvailabilityFromPublication({
    canonicalPropertyCount: MIN_ATLAS_CANONICAL_SAMPLE - 1,
    densityPublished: true,
    priceReferencePublished: true,
    priceSampleSizeCanonical: MIN_ATLAS_CANONICAL_SAMPLE,
    askingPriceOnly: true,
    methodologyVersion: "atlas-v1",
    geometryCertified: true,
  });
  assert.equal(blocked.density.available, false);

  const certified = mapAtlasAvailabilityFromPublication({
    canonicalPropertyCount: MIN_ATLAS_CANONICAL_SAMPLE,
    densityPublished: true,
    priceReferencePublished: true,
    priceSampleSizeCanonical: MIN_ATLAS_CANONICAL_SAMPLE,
    askingPriceOnly: true,
    methodologyVersion: "atlas-v1",
    geometryCertified: true,
  });
  assert.equal(certified.density.available, true);
  assert.equal(certified.price.available, true);
});

test("price layer remains blocked without asking-price disclosure or methodology", () => {
  const availability = mapAtlasAvailabilityFromPublication({
    canonicalPropertyCount: 20,
    densityPublished: true,
    priceReferencePublished: true,
    priceSampleSizeCanonical: 20,
    askingPriceOnly: false,
    methodologyVersion: "",
    geometryCertified: true,
  });
  assert.equal(availability.price.available, false);
});

test("uncertified geometry blocks density and price layers", () => {
  const availability = mapAtlasAvailabilityFromPublication({
    canonicalPropertyCount: 20,
    densityPublished: true,
    priceReferencePublished: true,
    priceSampleSizeCanonical: 20,
    askingPriceOnly: true,
    methodologyVersion: "atlas-v1",
    geometryCertified: false,
  });
  assert.equal(availability.density.available, false);
  assert.equal(availability.price.available, false);
  assert.match(availability.density.reason ?? "", /géométrie/i);
});

test("Atlas layer selection is presentation-only and never changes ranking", () => {
  assert.equal(mapAtlasLayerChangesRanking(), false);

  const shell = readFileSync(resolve(process.cwd(), "components/search/LightZillowSearchShell.tsx"), "utf8");
  const mapPanel = readFileSync(resolve(process.cwd(), "components/search/SearchMapPanel.tsx"), "utf8");
  const rankingCalls = shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? [];

  assert.equal(rankingCalls.length, 1);
  assert.ok(mapPanel.includes("MapAtlasLayerSwitcher"));
  assert.ok(!mapPanel.includes("sortListings("));
});

test("Atlas does not claim heatmaps, district geometry or price rendering before certification", () => {
  const mapPanel = readFileSync(resolve(process.cwd(), "components/search/SearchMapPanel.tsx"), "utf8");
  assert.ok(!mapPanel.includes("heatmap"));
  assert.ok(!mapPanel.includes("district polygon"));
  assert.ok(!mapPanel.includes("price_m2"));
});
