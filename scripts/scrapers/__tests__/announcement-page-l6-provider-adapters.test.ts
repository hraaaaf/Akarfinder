import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import { buildLivingHereForListing, createLivingHereProviderRegistry } from "@/lib/geo/living-here-service";
import { OverpassNearbyProvider } from "@/lib/geo/providers/overpass-nearby";
import { ValhallaRoutingProvider } from "@/lib/geo/providers/valhalla-routing";
import type { Listing } from "@/lib/listings/types";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function exactListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l6-provider-test",
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

function exactTruth() {
  const truth = buildGeoTruth(exactListing());
  assert.equal(truth.availability, "exact");
  if (truth.availability !== "exact") throw new Error("expected exact truth");
  return truth;
}

describe("ANN-L6 provider registry", () => {
  it("has no public or implicit provider fallback when env order is empty", () => {
    const registry = createLivingHereProviderRegistry({});
    assert.deepEqual(registry.nearby, []);
    assert.deepEqual(registry.routingMatrix, []);
    assert.deepEqual(registry.isochrone, []);
  });
});

describe("ANN-L6 Overpass adapter", () => {
  it("parses named OSM elements and ignores malformed payload entries", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push(requestUrl(input));
      assert.equal(init?.method, "POST");
      const body = String(init?.body ?? "");
      assert.match(body, /data=/);
      return response({
        elements: [
          { type: "node", id: 1, lat: 33.991, lon: -6.847, tags: { name: "École Agdal", amenity: "school" } },
          { type: "way", id: 2, center: { lat: 33.989, lon: -6.849 }, tags: { name: "Pharmacie Atlas", amenity: "pharmacy" } },
          { type: "node", id: 3, lat: 200, lon: -6.8, tags: { name: "Invalide", amenity: "school" } },
          { type: "node", id: 4, lat: 33.99, lon: -6.84, tags: { amenity: "cafe" } },
        ],
      });
    };
    const provider = new OverpassNearbyProvider({ endpoint: "https://geo.internal/overpass", fetchImpl });
    const result = await provider.nearby({ origin: exactTruth(), categories: ["education", "health"], radiusMeters: 2500 });
    assert.equal(calls.length, 1);
    assert.equal(result.status, "available");
    if (result.status !== "available") throw new Error("expected nearby data");
    assert.deepEqual(result.pois.map((poi) => poi.id), ["osm:node:1", "osm:way:2"]);
    assert.deepEqual(result.pois.map((poi) => poi.category), ["school", "pharmacy"]);
    assert.match(result.evidence.attribution, /OpenStreetMap/);
  });

  it("fails closed without an explicit endpoint", async () => {
    let called = false;
    const provider = new OverpassNearbyProvider({
      endpoint: "",
      fetchImpl: async () => {
        called = true;
        return response({});
      },
    });
    const result = await provider.nearby({ origin: exactTruth(), categories: ["education"], radiusMeters: 2500 });
    assert.equal(result.status, "unavailable");
    if (result.status === "unavailable") assert.equal(result.reason, "not_configured");
    assert.equal(called, false);
  });
});

describe("ANN-L6 Valhalla adapter", () => {
  it("uses one-to-many matrices and converts kilometers to meters", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.match(requestUrl(input), /sources_to_targets$/);
      const body = JSON.parse(String(init?.body ?? "{}")) as { costing?: string; targets?: unknown[] };
      assert.equal(body.costing, "pedestrian");
      assert.equal(body.targets?.length, 2);
      return response({
        units: "kilometers",
        sources_to_targets: [[
          { distance: 0.42, time: 320, from_index: 0, to_index: 0 },
          { distance: 1.25, time: 910, from_index: 0, to_index: 1 },
        ]],
      });
    };
    const provider = new ValhallaRoutingProvider({ endpoint: "https://routing.internal", fetchImpl });
    const result = await provider.matrix({
      origin: exactTruth(),
      destinations: [
        { latitude: 33.991, longitude: -6.847 },
        { latitude: 33.995, longitude: -6.84 },
      ],
      mode: "walking",
    });
    assert.equal(result.status, "available");
    if (result.status !== "available") throw new Error("expected matrix");
    assert.deepEqual(result.routes.map((route) => route.distanceMeters), [420, 1250]);
    assert.deepEqual(result.routes.map((route) => route.durationSeconds), [320, 910]);
  });

  it("returns GeoJSON only for supported ANN-L6 isochrone windows", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      assert.match(requestUrl(input), /isochrone$/);
      const body = JSON.parse(String(init?.body ?? "{}")) as { costing?: string; contours?: Array<{ time?: number }> };
      assert.equal(body.costing, "pedestrian");
      assert.equal(body.contours?.[0]?.time, 10);
      return response({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: { contour: 10 }, geometry: { type: "Polygon", coordinates: [] } }],
      });
    };
    const provider = new ValhallaRoutingProvider({ endpoint: "https://routing.internal", fetchImpl });
    const ok = await provider.isochrone({ origin: exactTruth(), minutes: 10, mode: "walking" });
    assert.equal(ok.status, "available");
    const invalid = await provider.isochrone({ origin: exactTruth(), minutes: 20, mode: "walking" });
    assert.equal(invalid.status, "unavailable");
    if (invalid.status === "unavailable") assert.equal(invalid.reason, "unsupported_origin");
  });
});

describe("ANN-L6 server orchestration", () => {
  it("builds verified POIs, walking/driving matrices and 5/10/15 isochrones from explicit private endpoints", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = requestUrl(input);
      calls.push(url);
      if (url.endsWith("/overpass")) {
        return response({ elements: [
          { type: "node", id: 11, lat: 33.991, lon: -6.847, tags: { name: "École Agdal", amenity: "school" } },
          { type: "node", id: 12, lat: 33.989, lon: -6.849, tags: { name: "Pharmacie Atlas", amenity: "pharmacy" } },
          { type: "node", id: 13, lat: 33.992, lon: -6.85, tags: { name: "Station Agdal", railway: "tram_stop" } },
        ] });
      }
      if (url.endsWith("/sources_to_targets")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { targets?: unknown[] };
        return response({
          units: "kilometers",
          sources_to_targets: [(body.targets ?? []).map((_, index) => ({ distance: 0.4 + index * 0.2, time: 300 + index * 120, from_index: 0, to_index: index }))],
        });
      }
      if (url.endsWith("/isochrone")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { contours?: Array<{ time?: number }> };
        return response({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: { contour: body.contours?.[0]?.time }, geometry: { type: "Polygon", coordinates: [] } }],
        });
      }
      return response({}, 500);
    };

    const model = await buildLivingHereForListing(exactListing(), {
      env: {
        AKAR_GEO_NEARBY_PROVIDERS: "overpass",
        AKAR_GEO_ROUTING_PROVIDERS: "valhalla",
        AKAR_GEO_ISOCHRONE_PROVIDERS: "valhalla",
        AKAR_GEO_OVERPASS_ENDPOINT: "https://geo.internal/overpass",
        AKAR_GEO_VALHALLA_ENDPOINT: "https://routing.internal",
      },
      fetchImpl,
    });

    assert.equal(model.visibility, "full");
    assert.equal(model.pois.length, 3);
    assert.equal(model.pois.every((poi) => poi.routes.length === 2), true);
    assert.deepEqual(model.isochrones.map((item) => item.minutes), [5, 10, 15]);
    assert.equal(calls.filter((url) => url.endsWith("/overpass")).length, 1);
    assert.equal(calls.filter((url) => url.endsWith("/sources_to_targets")).length, 2);
    assert.equal(calls.filter((url) => url.endsWith("/isochrone")).length, 3);
  });

  it("does not call any provider for city-centroid geography", async () => {
    let calls = 0;
    const model = await buildLivingHereForListing(exactListing({
      geo_precision: "city_centroid",
      geo_source: "city_centroid",
    }), {
      env: {
        AKAR_GEO_NEARBY_PROVIDERS: "overpass",
        AKAR_GEO_OVERPASS_ENDPOINT: "https://geo.internal/overpass",
      },
      fetchImpl: async () => {
        calls += 1;
        return response({});
      },
    });
    assert.equal(model.visibility, "hidden");
    assert.equal(calls, 0);
  });
});
