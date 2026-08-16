import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import {
  buildStreetRealityModel,
  STREET_REALITY_EXACT_MAX_DISTANCE_METERS,
  STREET_REALITY_NEIGHBORHOOD_MAX_DISTANCE_METERS,
} from "@/lib/geo/street-reality";
import type { StreetImageryProviderResult } from "@/lib/geo/provider-contracts";
import type { Listing } from "@/lib/listings/types";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l7-model-test",
    title: "Appartement test",
    city: "Rabat",
    neighborhood: "Agdal",
    price: 2_000_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 20_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    is_mre_friendly: false,
    description: "Test",
    image_url: "",
    reliability_explanation: "Test",
    latitude: 33.9908,
    longitude: -6.8481,
    geo_precision: "exact",
    geo_source: "manual_import",
    geo_label: "Test exact",
    ...overrides,
  };
}

function imagery(overrides: Partial<Extract<StreetImageryProviderResult, { status: "available" }>> = {}): Extract<StreetImageryProviderResult, { status: "available" }> {
  return {
    status: "available",
    evidence: {
      providerId: "mapillary",
      attribution: "Mapillary",
      fetchedAt: "2026-08-16T12:00:00.000Z",
      expiresAt: "2026-08-16T13:00:00.000Z",
    },
    assets: [
      {
        id: "mapillary:near",
        coordinate: { latitude: 33.9909, longitude: -6.8480 },
        capturedAt: "2026-07-01T10:00:00.000Z",
        thumbnailUrl: "https://images.example.test/near.jpg",
        viewerUrl: "https://www.mapillary.com/app/?pKey=near",
      },
      {
        id: "mapillary:far",
        coordinate: { latitude: 34.01, longitude: -6.82 },
        capturedAt: "2026-07-01T10:00:00.000Z",
        thumbnailUrl: "https://images.example.test/far.jpg",
        viewerUrl: "https://www.mapillary.com/app/?pKey=far",
      },
    ],
    ...overrides,
  };
}

describe("ANN-L7 Street Reality model", () => {
  it("renders exact context as nearby street imagery, never as property photography", () => {
    const model = buildStreetRealityModel({
      geo: buildGeoTruth(listing()),
      imagery: imagery(),
      now: new Date("2026-08-16T12:30:00.000Z"),
    });
    assert.equal(model.visibility, "full");
    assert.equal(model.referenceKind, "property");
    assert.equal(model.referenceLabel, "Vue de rue à proximité du bien");
    assert.equal(model.maxDistanceMeters, STREET_REALITY_EXACT_MAX_DISTANCE_METERS);
    assert.equal(model.assets.length, 1);
    assert.equal(model.assets[0]?.id, "mapillary:near");
    assert.equal((model.assets[0]?.distanceMeters ?? 999) < STREET_REALITY_EXACT_MAX_DISTANCE_METERS, true);
  });

  it("allows neighborhood context with a wider explicit threshold but no property claim", () => {
    const model = buildStreetRealityModel({
      geo: buildGeoTruth(listing({
        geo_precision: "neighborhood_centroid",
        geo_source: "neighborhood_centroid",
      })),
      imagery: imagery(),
      now: new Date("2026-08-16T12:30:00.000Z"),
    });
    assert.equal(model.visibility, "context");
    assert.equal(model.referenceKind, "neighborhood");
    assert.equal(model.referenceLabel, "Vue de rue à proximité — Agdal");
    assert.equal(model.maxDistanceMeters, STREET_REALITY_NEIGHBORHOOD_MAX_DISTANCE_METERS);
  });

  it("hides city-centroid and unknown geography", () => {
    const city = buildStreetRealityModel({
      geo: buildGeoTruth(listing({ geo_precision: "city_centroid", geo_source: "city_centroid" })),
      imagery: imagery(),
      now: new Date("2026-08-16T12:30:00.000Z"),
    });
    const unknown = buildStreetRealityModel({
      geo: buildGeoTruth(listing({ latitude: null, longitude: null, geo_precision: "unknown", geo_source: "unknown" })),
      imagery: imagery(),
      now: new Date("2026-08-16T12:30:00.000Z"),
    });
    assert.equal(city.visibility, "hidden");
    assert.equal(unknown.visibility, "hidden");
  });

  it("hides stale or malformed provider evidence", () => {
    const stale = buildStreetRealityModel({
      geo: buildGeoTruth(listing()),
      imagery: imagery({
        evidence: {
          providerId: "mapillary",
          attribution: "Mapillary",
          fetchedAt: "2026-08-15T10:00:00.000Z",
          expiresAt: "2026-08-15T11:00:00.000Z",
        },
      }),
      now: new Date("2026-08-16T12:30:00.000Z"),
    });
    assert.equal(stale.visibility, "hidden");
  });

  it("rejects assets without a usable public viewer or thumbnail", () => {
    const model = buildStreetRealityModel({
      geo: buildGeoTruth(listing()),
      imagery: imagery({
        assets: [{
          id: "mapillary:no-url",
          coordinate: { latitude: 33.9909, longitude: -6.8480 },
          capturedAt: null,
          thumbnailUrl: null,
          viewerUrl: null,
        }],
      }),
      now: new Date("2026-08-16T12:30:00.000Z"),
    });
    assert.equal(model.visibility, "hidden");
  });
});
