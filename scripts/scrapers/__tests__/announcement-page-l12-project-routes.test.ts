import assert from "node:assert/strict";
import test from "node:test";

import { buildGeoTruth } from "../../../lib/geo/geo-truth";
import type { RoutingMatrixProviderResult } from "../../../lib/geo/provider-contracts";
import type { Listing } from "../../../lib/listings/types";
import { buildProjectRoutesModel } from "../../../lib/property-detail/project-routes";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l12-route",
    title: "Appartement",
    city: "Rabat",
    neighborhood: "Hay Riad",
    price: 1_800_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 18_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    is_mre_friendly: true,
    description: "QA",
    image_url: "",
    reliability_explanation: "QA",
    latitude: 33.9716,
    longitude: -6.8498,
    geo_precision: "exact",
    geo_source: "manual_import",
    ...overrides,
  };
}

const anchors = [
  { label: "Travail", latitude: 33.9900, longitude: -6.8400, max_minutes: 20 },
  { label: "École", latitude: 33.9800, longitude: -6.8300, max_minutes: 15 },
];

function available(mode: "walking" | "driving", fetchedAt = "2026-08-17T10:00:00.000Z"): RoutingMatrixProviderResult {
  return {
    status: "available",
    evidence: {
      providerId: "valhalla",
      attribution: "Valhalla QA",
      fetchedAt,
      expiresAt: "2026-08-17T20:00:00.000Z",
    },
    routes: [
      { destination: { latitude: 33.9900, longitude: -6.8400 }, mode, distanceMeters: 6500, durationSeconds: mode === "driving" ? 900 : 3600 },
      { destination: { latitude: 33.9800, longitude: -6.8300 }, mode, distanceMeters: 4200, durationSeconds: mode === "driving" ? 1200 : 2700 },
    ],
  };
}

test("ANN-L12 never exposes precise project routes from a non-exact property origin", () => {
  const geo = buildGeoTruth(listing({ geo_precision: "neighborhood_centroid", geo_source: "neighborhood_centroid" }));
  const model = buildProjectRoutesModel({ geo, anchors, observations: [{ mode: "driving", result: available("driving") }], now: new Date("2026-08-17T11:00:00.000Z") });
  assert.equal(model.available, false);
  assert.equal(model.reason, "origin_not_exact");
  assert.equal(model.routes.every((route) => route.status === "unavailable"), true);
});

test("ANN-L12 exposes measured walking and driving routes only with fresh provider evidence", () => {
  const geo = buildGeoTruth(listing());
  const model = buildProjectRoutesModel({
    geo,
    anchors,
    observations: [
      { mode: "walking", result: available("walking") },
      { mode: "driving", result: available("driving") },
    ],
    now: new Date("2026-08-17T11:00:00.000Z"),
  });
  assert.equal(model.available, true);
  assert.equal(model.reason, "measured");
  assert.equal(model.routes.filter((route) => route.status === "measured").length, 4);
  assert.equal(model.routes.find((route) => route.label === "Travail" && route.mode === "driving")?.withinTarget, true);
  assert.equal(model.routes.find((route) => route.label === "École" && route.mode === "driving")?.withinTarget, false);
});

test("ANN-L12 rejects stale routing evidence", () => {
  const geo = buildGeoTruth(listing());
  const stale: RoutingMatrixProviderResult = {
    ...available("driving", "2026-08-15T10:00:00.000Z"),
    evidence: {
      providerId: "valhalla",
      attribution: "Valhalla QA",
      fetchedAt: "2026-08-15T10:00:00.000Z",
      expiresAt: "2026-08-15T20:00:00.000Z",
    },
  };
  const model = buildProjectRoutesModel({ geo, anchors, observations: [{ mode: "driving", result: stale }], now: new Date("2026-08-17T11:00:00.000Z") });
  assert.equal(model.available, false);
  assert.equal(model.reason, "provider_unavailable");
  assert.equal(model.routes.every((route) => route.durationSeconds == null), true);
});

test("ANN-L12 keeps an anchor visible as unavailable when a measured pair is missing", () => {
  const geo = buildGeoTruth(listing());
  const partial = available("driving");
  if (partial.status !== "available") throw new Error("fixture");
  partial.routes = partial.routes.slice(0, 1);
  const model = buildProjectRoutesModel({ geo, anchors, observations: [{ mode: "driving", result: partial }], now: new Date("2026-08-17T11:00:00.000Z") });
  assert.equal(model.routes.find((route) => route.label === "Travail" && route.mode === "driving")?.status, "measured");
  assert.equal(model.routes.find((route) => route.label === "École" && route.mode === "driving")?.status, "unavailable");
});
