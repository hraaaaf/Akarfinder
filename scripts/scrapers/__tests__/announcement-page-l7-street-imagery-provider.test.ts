import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import { MapillaryStreetImageryProvider } from "@/lib/geo/providers/mapillary-street-imagery";
import type { Listing } from "@/lib/listings/types";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l7-mapillary-test",
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

function provider(fetchImpl: typeof fetch, overrides: Partial<ConstructorParameters<typeof MapillaryStreetImageryProvider>[0]> = {}) {
  return new MapillaryStreetImageryProvider({
    endpoint: "https://graph.mapillary.test",
    accessToken: "server-token",
    fetchImpl,
    now: () => new Date("2026-08-16T12:00:00.000Z"),
    ...overrides,
  });
}

describe("ANN-L7 Mapillary street imagery adapter", () => {
  it("queries a bounded bbox, authenticates server-side and returns attributable nearby assets", async () => {
    const calls: URL[] = [];
    const adapter = provider(async (input, init) => {
      const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
      calls.push(url);
      assert.equal(init?.method, "GET");
      assert.equal(new Headers(init?.headers).get("authorization"), "OAuth server-token");
      assert.equal(init?.cache, "no-store");
      assert.match(url.searchParams.get("fields") ?? "", /captured_at/);
      assert.match(url.searchParams.get("fields") ?? "", /creator/);
      assert.match(url.searchParams.get("bbox") ?? "", /^-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+$/);
      return response({
        data: [
          {
            id: "123",
            computed_geometry: { type: "Point", coordinates: [-6.8479, 33.9909] },
            captured_at: 1_754_000_000_000,
            thumb_1024_url: "https://images.example.test/123.jpg",
            creator: { id: "user-1", username: "mapper_one" },
          },
          {
            id: "outside",
            computed_geometry: { type: "Point", coordinates: [-6.80, 34.04] },
            captured_at: "2026-07-01T10:00:00Z",
            thumb_1024_url: "https://images.example.test/outside.jpg",
            creator: { id: "user-2", username: "mapper_two" },
          },
          {
            id: "bad-geometry",
            computed_geometry: { type: "LineString", coordinates: [] },
            captured_at: "2026-07-01T10:00:00Z",
            creator: { id: "user-3", username: "mapper_three" },
          },
        ],
      });
    });

    const result = await adapter.nearbyImagery({
      origin: buildGeoTruth(listing()),
      radiusMeters: 250,
    });

    assert.equal(calls.length, 1);
    assert.equal(result.status, "available");
    if (result.status !== "available") throw new Error("expected imagery");
    assert.equal(result.evidence.providerId, "mapillary");
    assert.equal(result.evidence.attribution, "Mapillary");
    assert.equal(result.evidence.fetchedAt, "2026-08-16T12:00:00.000Z");
    assert.equal(result.evidence.expiresAt, "2026-08-16T13:00:00.000Z");
    assert.equal(result.assets.length, 1);
    assert.deepEqual(result.assets[0]?.coordinate, { latitude: 33.9909, longitude: -6.8479 });
    assert.equal(result.assets[0]?.id, "mapillary:123");
    assert.equal(result.assets[0]?.thumbnailUrl, "https://images.example.test/123.jpg");
    assert.equal(result.assets[0]?.viewerUrl, "https://www.mapillary.com/app/?pKey=123");
    assert.equal(result.assets[0]?.creatorUsername, "mapper_one");
    assert.match(result.assets[0]?.capturedAt ?? "", /^2025-/);
  });

  it("supports neighborhood-centroid context but refuses city-centroid context", async () => {
    let calls = 0;
    const adapter = provider(async () => {
      calls += 1;
      return response({
        data: [{
          id: "context",
          geometry: { type: "Point", coordinates: [-6.8480, 33.9909] },
          captured_at: "2026-07-01T10:00:00Z",
          thumb_1024_url: "https://images.example.test/context.jpg",
          creator: { id: "user-context", username: "context_mapper" },
        }],
      });
    });

    const neighborhood = await adapter.nearbyImagery({
      origin: buildGeoTruth(listing({
        geo_precision: "neighborhood_centroid",
        geo_source: "neighborhood_centroid",
      })),
      radiusMeters: 250,
    });
    assert.equal(neighborhood.status, "available");

    const city = await adapter.nearbyImagery({
      origin: buildGeoTruth(listing({
        geo_precision: "city_centroid",
        geo_source: "city_centroid",
      })),
      radiusMeters: 250,
    });
    assert.equal(city.status, "unavailable");
    if (city.status === "unavailable") assert.equal(city.reason, "unsupported_origin");
    assert.equal(calls, 1);
  });

  it("fails closed without explicit endpoint/token and never calls fetch", async () => {
    let calls = 0;
    const adapter = provider(async () => {
      calls += 1;
      return response({ data: [] });
    }, { endpoint: "", accessToken: "" });

    const result = await adapter.nearbyImagery({ origin: buildGeoTruth(listing()), radiusMeters: 250 });
    assert.equal(result.status, "unavailable");
    if (result.status === "unavailable") assert.equal(result.reason, "not_configured");
    assert.equal(calls, 0);
  });

  it("fails closed on upstream errors, empty payloads, missing creator attribution and assets outside the requested radius", async () => {
    const origin = buildGeoTruth(listing());

    const upstream = await provider(async () => response({}, 503)).nearbyImagery({ origin, radiusMeters: 150 });
    assert.equal(upstream.status, "unavailable");
    if (upstream.status === "unavailable") assert.equal(upstream.reason, "upstream_error");

    const empty = await provider(async () => response({ data: [] })).nearbyImagery({ origin, radiusMeters: 150 });
    assert.equal(empty.status, "unavailable");
    if (empty.status === "unavailable") assert.equal(empty.reason, "empty");

    const missingCreator = await provider(async () => response({
      data: [{
        id: "no-creator",
        computed_geometry: { type: "Point", coordinates: [-6.8480, 33.9909] },
        captured_at: "2026-07-01T10:00:00Z",
      }],
    })).nearbyImagery({ origin, radiusMeters: 150 });
    assert.equal(missingCreator.status, "unavailable");
    if (missingCreator.status === "unavailable") assert.equal(missingCreator.reason, "empty");

    const outside = await provider(async () => response({
      data: [{
        id: "far",
        computed_geometry: { type: "Point", coordinates: [-6.80, 34.04] },
        captured_at: "2026-07-01T10:00:00Z",
        creator: { id: "far-user", username: "far_mapper" },
      }],
    })).nearbyImagery({ origin, radiusMeters: 150 });
    assert.equal(outside.status, "unavailable");
    if (outside.status === "unavailable") assert.equal(outside.reason, "empty");
  });

  it("caps provider evidence TTL at 24 hours", async () => {
    const adapter = provider(async () => response({
      data: [{
        id: "ttl",
        computed_geometry: { type: "Point", coordinates: [-6.8480, 33.9909] },
        captured_at: "2026-07-01T10:00:00Z",
        creator: { id: "ttl-user", username: "ttl_mapper" },
      }],
    }), { evidenceTtlMs: 7 * 24 * 60 * 60 * 1000 });

    const result = await adapter.nearbyImagery({ origin: buildGeoTruth(listing()), radiusMeters: 250 });
    assert.equal(result.status, "available");
    if (result.status !== "available") throw new Error("expected imagery");
    assert.equal(result.evidence.expiresAt, "2026-08-17T12:00:00.000Z");
  });
});
