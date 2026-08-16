import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGeoTruth } from "@/lib/geo/geo-truth";
import {
  buildLivingHereModel,
  classifyLivingHereCategory,
  type LivingHereIsochroneObservation,
  type LivingHereRouteObservation,
} from "@/lib/geo/living-here";
import type {
  GeoProviderEvidence,
  IsochroneProviderResult,
  NearbyProviderResult,
  RoutingProviderResult,
} from "@/lib/geo/provider-contracts";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function geo(overrides: Record<string, unknown> = {}) {
  return buildGeoTruth({
    id: "listing-l6",
    city: "Rabat",
    neighborhood: "Agdal",
    latitude: 33.9908,
    longitude: -6.8481,
    geo_precision: "exact",
    geo_source: "scraped_coordinates",
    geo_label: "Coordonnées source",
    ...overrides,
  } as never);
}

function evidence(providerId = "poi-provider", overrides: Partial<GeoProviderEvidence> = {}): GeoProviderEvidence {
  return {
    providerId,
    attribution: "© Provider vérifié",
    fetchedAt: "2026-08-16T11:30:00.000Z",
    expiresAt: "2026-08-16T13:30:00.000Z",
    ...overrides,
  };
}

function nearby(overrides: Partial<Extract<NearbyProviderResult, { status: "available" }>> = {}): NearbyProviderResult {
  return {
    status: "available",
    evidence: evidence(),
    pois: [
      { id: "school-1", name: "École Agdal", category: "school", coordinate: { latitude: 33.991, longitude: -6.847 } },
      { id: "pharmacy-1", name: "Pharmacie Agdal", category: "pharmacy", coordinate: { latitude: 33.9898, longitude: -6.849 } },
      { id: "tram-1", name: "Station Agdal", category: "tram_stop", coordinate: { latitude: 33.992, longitude: -6.85 } },
    ],
    ...overrides,
  };
}

function route(
  poiId: string,
  destination: { latitude: number; longitude: number },
  mode: "walking" | "driving" = "walking",
  overrides: Partial<Extract<RoutingProviderResult, { status: "available" }>> = {},
): LivingHereRouteObservation {
  return {
    poiId,
    destination,
    result: {
      status: "available",
      evidence: evidence("route-provider"),
      route: { distanceMeters: 540, durationSeconds: 430, mode },
      ...overrides,
    },
  };
}

function isochrone(minutes: number, mode: "walking" | "driving" = "walking"): LivingHereIsochroneObservation {
  const result: IsochroneProviderResult = {
    status: "available",
    evidence: evidence("iso-provider"),
    minutes,
    mode,
    geojson: { type: "FeatureCollection", features: [] },
  };
  return { result };
}

describe("ANN-L6 taxonomy and verified POI model", () => {
  it("maps target Morocco daily-life categories without depending on provider names", () => {
    assert.equal(classifyLivingHereCategory("kindergarten"), "education");
    assert.equal(classifyLivingHereCategory("supermarket"), "groceries");
    assert.equal(classifyLivingHereCategory("pharmacie"), "health");
    assert.equal(classifyLivingHereCategory("tram_stop"), "transport");
    assert.equal(classifyLivingHereCategory("mosque"), "worship");
    assert.equal(classifyLivingHereCategory("shopping_centre"), "shopping");
    assert.equal(classifyLivingHereCategory("beach"), "coast");
    assert.equal(classifyLivingHereCategory("something_unknown"), "other");
  });

  it("renders full verified context only from exact GeoTruth plus fresh provider evidence", () => {
    const school = { latitude: 33.991, longitude: -6.847 };
    const model = buildLivingHereModel({
      geo: geo(),
      nearby: nearby(),
      routes: [route("school-1", school, "walking"), route("school-1", school, "driving")],
      isochrones: [isochrone(5), isochrone(10), isochrone(15)],
      now: NOW,
    });

    assert.equal(model.visibility, "full");
    assert.equal(model.reason, "exact_verified");
    assert.equal(model.origin.displayMode, "exact_pin");
    assert.equal(model.origin.exact, true);
    assert.equal(model.canShowPreciseRouteTimes, true);
    assert.equal(model.pois.length, 3);
    assert.equal(model.pois.find((poi) => poi.id === "school-1")?.routes.length, 2);
    assert.deepEqual(model.isochrones.map((item) => item.minutes), [5, 10, 15]);
    assert.ok(model.attribution.includes("© Provider vérifié"));
  });

  it("keeps a neighborhood centroid contextual and strips all precise route/isochrone claims", () => {
    const model = buildLivingHereModel({
      geo: geo({ geo_precision: "neighborhood_centroid", geo_source: "neighborhood_centroid" }),
      nearby: nearby(),
      routes: [route("school-1", { latitude: 33.991, longitude: -6.847 })],
      isochrones: [isochrone(5), isochrone(10), isochrone(15)],
      now: NOW,
    });

    assert.equal(model.visibility, "context");
    assert.equal(model.reason, "neighborhood_context_only");
    assert.equal(model.origin.displayMode, "neighborhood_context");
    assert.equal(model.canShowPreciseRouteTimes, false);
    assert.equal(model.pois.length, 3);
    assert.equal(model.pois.every((poi) => poi.routes.length === 0), true);
    assert.equal(model.isochrones.length, 0);
  });

  it("hides precise neighborhood experience for city-centroid and unavailable geography", () => {
    const city = buildLivingHereModel({
      geo: geo({ geo_precision: "city_centroid", geo_source: "city_centroid" }),
      nearby: nearby(),
      now: NOW,
    });
    assert.equal(city.visibility, "hidden");
    assert.equal(city.reason, "geo_too_coarse");
    assert.equal(city.pois.length, 0);

    const missing = buildLivingHereModel({
      geo: geo({ latitude: null, longitude: null }),
      nearby: nearby(),
      now: NOW,
    });
    assert.equal(missing.visibility, "hidden");
    assert.equal(missing.reason, "geo_unavailable");
  });

  it("fails closed when nearby evidence is stale, missing or future-dated", () => {
    for (const badEvidence of [
      evidence("poi-provider", { expiresAt: "2026-08-16T11:59:59.000Z" }),
      evidence("poi-provider", { expiresAt: null }),
      evidence("poi-provider", { fetchedAt: "2026-08-16T12:01:00.000Z" }),
    ]) {
      const model = buildLivingHereModel({
        geo: geo(),
        nearby: nearby({ evidence: badEvidence }),
        now: NOW,
      });
      assert.equal(model.reason, "provider_unavailable");
      assert.equal(model.pois.length, 0);
      assert.equal(model.isochrones.length, 0);
    }
  });
});

describe("ANN-L6 anti-dup and route coherence", () => {
  it("deduplicates same-category same-name POIs within 80 m and rejects malformed POIs", () => {
    const model = buildLivingHereModel({
      geo: geo(),
      nearby: nearby({
        pois: [
          { id: "a", name: "Pharmacie Atlas", category: "pharmacy", coordinate: { latitude: 33.991, longitude: -6.847 } },
          { id: "b", name: "Pharmacie Atlas", category: "pharmacie", coordinate: { latitude: 33.9912, longitude: -6.8471 } },
          { id: "c", name: "Pharmacie Atlas", category: "pharmacy", coordinate: { latitude: 34.001, longitude: -6.847 } },
          { id: "", name: "Sans id", category: "school", coordinate: { latitude: 33.99, longitude: -6.84 } },
          { id: "bad", name: "Hors monde", category: "school", coordinate: { latitude: 200, longitude: -6.84 } },
        ],
      }),
      now: NOW,
    });

    assert.equal(model.pois.length, 2);
    assert.deepEqual(model.pois.map((poi) => poi.id), ["a", "c"]);
  });

  it("publishes a route only when its recorded destination matches the POI coordinate", () => {
    const school = { latitude: 33.991, longitude: -6.847 };
    const model = buildLivingHereModel({
      geo: geo(),
      nearby: nearby({ pois: [{ id: "school-1", name: "École Agdal", category: "school", coordinate: school }] }),
      routes: [
        route("school-1", school, "walking"),
        route("school-1", { latitude: 34.1, longitude: -6.9 }, "driving"),
      ],
      now: NOW,
    });

    assert.equal(model.pois[0]?.routes.length, 1);
    assert.equal(model.pois[0]?.routes[0]?.mode, "walking");
  });

  it("rejects stale routes and invalid route measurements instead of fabricating minutes", () => {
    const school = { latitude: 33.991, longitude: -6.847 };
    const stale: RoutingProviderResult = {
      status: "available",
      evidence: evidence("route-provider", { expiresAt: "2026-08-16T11:00:00.000Z" }),
      route: { distanceMeters: 500, durationSeconds: 400, mode: "walking" },
    };
    const invalid: RoutingProviderResult = {
      status: "available",
      evidence: evidence("route-provider"),
      route: { distanceMeters: -1, durationSeconds: 0, mode: "driving" },
    };
    const model = buildLivingHereModel({
      geo: geo(),
      nearby: nearby({ pois: [{ id: "school-1", name: "École Agdal", category: "school", coordinate: school }] }),
      routes: [
        { poiId: "school-1", destination: school, result: stale },
        { poiId: "school-1", destination: school, result: invalid },
      ],
      now: NOW,
    });
    assert.equal(model.pois[0]?.routes.length, 0);
  });

  it("admits only fresh 5/10/15-minute isochrones from an exact origin", () => {
    const invalidMinutes = isochrone(20);
    const stale = isochrone(10);
    if (stale.result.status === "available") {
      stale.result.evidence = evidence("iso-provider", { expiresAt: "2026-08-16T11:00:00.000Z" });
    }
    const model = buildLivingHereModel({
      geo: geo(),
      nearby: nearby(),
      isochrones: [isochrone(5), stale, isochrone(15), invalidMinutes],
      now: NOW,
    });
    assert.deepEqual(model.isochrones.map((item) => item.minutes), [5, 15]);
  });
});
