import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStreetRealityForListing, createStreetRealityProviderRegistry } from "@/lib/geo/street-reality-service";
import type { Listing } from "@/lib/listings/types";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l7-service-test",
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

describe("ANN-L7 Street Reality provider registry", () => {
  it("has no implicit provider and requires explicit Mapillary order", () => {
    assert.deepEqual(createStreetRealityProviderRegistry({}).streetImagery, []);
    assert.equal(createStreetRealityProviderRegistry({
      AKAR_GEO_STREET_IMAGERY_PROVIDERS: "unknown,mapillary",
      AKAR_GEO_MAPILLARY_ENDPOINT: "https://graph.mapillary.test",
      AKAR_GEO_MAPILLARY_ACCESS_TOKEN: "token",
    }).streetImagery.map((provider) => provider.id).join(","), "mapillary");
  });
});

describe("ANN-L7 Street Reality server orchestration", () => {
  it("builds exact street context from explicit server-only Mapillary config", async () => {
    const calls: URL[] = [];
    const model = await buildStreetRealityForListing(listing(), {
      env: {
        AKAR_GEO_STREET_IMAGERY_PROVIDERS: "mapillary",
        AKAR_GEO_MAPILLARY_ENDPOINT: "https://graph.mapillary.test",
        AKAR_GEO_MAPILLARY_ACCESS_TOKEN: "secret-token",
      },
      now: new Date("2026-08-16T12:30:00.000Z"),
      fetchImpl: async (input) => {
        const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
        calls.push(url);
        return response({ data: [{
          id: "123",
          computed_geometry: { type: "Point", coordinates: [-6.8480, 33.9909] },
          captured_at: "2026-07-01T10:00:00Z",
          thumb_1024_url: "https://images.example.test/123.jpg",
        }] });
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(model.visibility, "full");
    assert.equal(model.referenceKind, "property");
    assert.equal(model.providerId, "mapillary");
    assert.equal(model.assets.length, 1);
  });

  it("returns hidden without provider config and never invents fallback imagery", async () => {
    let calls = 0;
    const model = await buildStreetRealityForListing(listing(), {
      env: {},
      fetchImpl: async () => {
        calls += 1;
        return response({ data: [] });
      },
    });
    assert.equal(model.visibility, "hidden");
    assert.equal(model.assets.length, 0);
    assert.equal(calls, 0);
  });

  it("does not call providers for city-centroid geography", async () => {
    let calls = 0;
    const model = await buildStreetRealityForListing(listing({
      geo_precision: "city_centroid",
      geo_source: "city_centroid",
    }), {
      env: {
        AKAR_GEO_STREET_IMAGERY_PROVIDERS: "mapillary",
        AKAR_GEO_MAPILLARY_ENDPOINT: "https://graph.mapillary.test",
        AKAR_GEO_MAPILLARY_ACCESS_TOKEN: "secret-token",
      },
      fetchImpl: async () => {
        calls += 1;
        return response({ data: [] });
      },
    });
    assert.equal(model.visibility, "hidden");
    assert.equal(calls, 0);
  });
});
