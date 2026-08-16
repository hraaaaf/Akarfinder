import assert from "node:assert/strict";
import test from "node:test";
import type { RabatMarketZonesGeoJson } from "@/lib/geo/rabat-market-zones-geojson";
import { buildRabatIntelligenceGeoJson, INTELLIGENCE_PALETTES } from "@/lib/map/intelligence-payload";

const geometry: RabatMarketZonesGeoJson = {
  type: "FeatureCollection",
  features: ["agdal", "hay-riad", "souissi", "hassan"].map((slug, index) => ({
    type: "Feature" as const,
    id: `zone-${slug}`,
    properties: {
      zoneId: `zone-${slug}`,
      slug,
      displayName: slug,
      semanticType: "market_zone" as const,
      officialBoundary: false as const,
      canonicalNeighborhoodIds: [slug],
      areaKm2: index + 1,
      publicationStatus: "canary" as const,
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[[index, 0], [index + 0.1, 0], [index + 0.1, 0.1], [index, 0]]],
    },
  })),
};

const metrics = geometry.features.map((feature, index) => ({
  zoneId: feature.properties.zoneId,
  displayName: feature.properties.displayName,
  transactionType: "sale",
  areaKm2: feature.properties.areaKm2,
  listingCount: [2, 4, 8, 16][index],
  pricePerM2SampleCount: [1, 0, 6, 10][index],
  medianPricePerM2Mad: [12_000, null, 18_000, 15_000][index] as number | null,
  observedListingDensityPerKm2: [2, 4, 8, 16][index],
  priceReliability: ["insufficient", "insufficient", "limited", "moderate"][index] as "insufficient" | "limited" | "moderate" | "strong",
  freshnessStatus: "fresh_confirmed",
  snapshotVersion: "snapshot-test",
}));

test("density payload uses one reproducible scale for legend and fills", () => {
  const payload = buildRabatIntelligenceGeoJson({ geometry, metrics, mode: "density", transaction: "sale" });
  assert.equal(payload.properties.observedMarketOnly, true);
  assert.deepEqual(payload.properties.legend.thresholds, [3.5, 6, 10]);
  assert.equal(payload.properties.legend.colors.length, 4);
  for (const feature of payload.features) {
    assert.equal(feature.properties.metricUnit, "annonces/km²");
    assert.equal(feature.properties.neutral, false);
    assert.equal(
      feature.properties.fillColor,
      payload.properties.legend.colors[feature.properties.classIndex as number],
    );
  }
});

test("every mode carries the same transaction-scoped defensible KPI summary", () => {
  for (const mode of ["price", "density", "listings"] as const) {
    const payload = buildRabatIntelligenceGeoJson({ geometry, metrics, mode, transaction: "sale" });
    const agdal = payload.features.find((feature) => feature.properties.slug === "agdal")!;
    assert.deepEqual(agdal.properties.marketMetrics, {
      priceMedianMadM2: 12_000,
      priceSampleCount: 1,
      priceReliability: "insufficient",
      listingCount: 2,
      listingDensityKm2: 2,
    });
  }
});

test("price payload keeps insufficient zones neutral without hiding real samples", () => {
  const payload = buildRabatIntelligenceGeoJson({ geometry, metrics, mode: "price", transaction: "sale" });
  const agdal = payload.features.find((feature) => feature.properties.slug === "agdal")!;
  const souissi = payload.features.find((feature) => feature.properties.slug === "souissi")!;
  assert.equal(agdal.properties.metricValue, 12_000);
  assert.equal(agdal.properties.sampleCount, 1);
  assert.equal(agdal.properties.reliability, "insufficient");
  assert.equal(agdal.properties.neutral, true);
  assert.equal(agdal.properties.fillColor, INTELLIGENCE_PALETTES.neutral);
  assert.equal(souissi.properties.neutral, false);
  assert.equal(payload.properties.legend.availableCount, 2);
});

test("transaction scope never mixes rows", () => {
  const payload = buildRabatIntelligenceGeoJson({ geometry, metrics, mode: "listings", transaction: "rent" });
  assert.equal(payload.properties.legend.availableCount, 0);
  assert.ok(payload.features.every((feature) => feature.properties.neutral));
  assert.ok(payload.features.every((feature) => feature.properties.metricValue === null));
  assert.ok(payload.features.every((feature) => feature.properties.marketMetrics.priceMedianMadM2 === null));
  assert.ok(payload.features.every((feature) => feature.properties.marketMetrics.listingCount === 0));
});
