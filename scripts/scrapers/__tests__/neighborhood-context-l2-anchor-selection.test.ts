import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNeighborhoodPoiRelation,
  isCertifiedNeighborhoodGeometry,
  pointInNeighborhoodGeometry,
  selectNeighborhoodAnchors,
  validateNeighborhoodAnchorSelection,
  type NeighborhoodAnchorSelectionV1,
} from "@/lib/neighborhood-context/poi-assignment";
import {
  NEIGHBORHOOD_POI_SCHEMA_VERSION,
  OSM_ATTRIBUTION,
  OSM_LICENSE_URL,
  type NeighborhoodPoiV1,
} from "@/lib/neighborhood-context/poi-registry";
import type { NeighborhoodPoiPilotSnapshotV1 } from "@/lib/neighborhood-context/poi-snapshot";
import type { NeighborhoodGeometryRecord } from "@/lib/geo/neighborhood-geometry-registry";
import { CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW } from "@/lib/geo/casablanca-neighborhood-geometry-shadow";

const NOW = "2026-08-24T18:00:00.000Z";

function poi(id: number, name: string, category: NeighborhoodPoiV1["category"], latitude: number, longitude: number): NeighborhoodPoiV1 {
  return {
    schema_version: NEIGHBORHOOD_POI_SCHEMA_VERSION,
    poi_id: `osm:node:${id}`,
    source_id: "openstreetmap",
    source_entity_id: `node/${id}`,
    provider_id: "ann-l5-certified-seed",
    name,
    normalized_name: name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim(),
    category,
    latitude,
    longitude,
    source_url: `https://www.openstreetmap.org/node/${id}`,
    attribution: OSM_ATTRIBUTION,
    license_policy: "odbl_attribution_required",
    license_url: OSM_LICENSE_URL,
    observed_at: "2026-08-16T11:08:32.249Z",
    freshness_status: "fresh",
    confidence: "source_verified",
    status: "active",
  };
}

function pilot(pois: NeighborhoodPoiV1[]): NeighborhoodPoiPilotSnapshotV1 {
  return {
    canonical_neighborhood_id: "district_rabat_agdal",
    city: "Rabat",
    neighborhood: "Agdal",
    query_origin: { latitude: 33.9959, longitude: -6.8533 },
    query_radius_m: 1800,
    status: "available",
    acquisition_mode: "certified_seed",
    provider_id: "ann-l5-certified-seed",
    observed_at: "2026-08-16T11:08:32.249Z",
    endpoint_used: null,
    poi_count: pois.length,
    categories: Array.from(new Set(pois.map((entry) => entry.category))).sort(),
    pois,
    diagnostics: [],
  };
}

function squareGeometry(overrides: Partial<NeighborhoodGeometryRecord> = {}): NeighborhoodGeometryRecord {
  return {
    version: "v1",
    cityCanonicalId: "rabat",
    neighborhoodCanonicalId: "district_rabat_agdal",
    displayName: "Agdal",
    aliases: ["Agdal"],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-6.87, 33.98],
        [-6.83, 33.98],
        [-6.83, 34.01],
        [-6.87, 34.01],
        [-6.87, 33.98],
      ]],
    },
    source: {
      provider: "test-authority",
      dataset: "test-neighborhood-boundaries",
      sourceUrl: "https://example.test/agdal",
      licenseId: "TEST-1",
      licenseUrl: "https://example.test/license",
      attribution: "Test Authority",
      retrievedAt: NOW,
    },
    publicationStatus: "published",
    reviewed: true,
    ...overrides,
  };
}

describe("Neighborhood Context L2 — territorial relation", () => {
  it("accepts inside only with a reviewed published geometry matching the canonical neighborhood", () => {
    const geometry = squareGeometry();
    assert.equal(isCertifiedNeighborhoodGeometry(geometry, "district_rabat_agdal"), true);
    assert.equal(pointInNeighborhoodGeometry({ latitude: 33.995, longitude: -6.85 }, geometry.geometry), true);

    const relation = buildNeighborhoodPoiRelation(
      pilot([]),
      poi(1, "Université Test", "education", 33.995, -6.85),
      { geometry },
    );
    assert.equal(relation.relation, "inside_certified_boundary");
    assert.equal(relation.territorial_wording, "Dans le quartier");
    assert.equal(relation.evidence_method, "published_reviewed_geometry");
  });

  it("does not use shadow/unreviewed Casablanca geometry as neighborhood-grade proof", () => {
    const shadow = CASABLANCA_NEIGHBORHOOD_GEOMETRY_SHADOW.find((entry) => entry.neighborhoodCanonicalId === "maarif");
    assert.ok(shadow);
    assert.equal(isCertifiedNeighborhoodGeometry(shadow, "district_casablanca_maarif"), false);

    const casablancaPilot: NeighborhoodPoiPilotSnapshotV1 = {
      ...pilot([]),
      canonical_neighborhood_id: "district_casablanca_maarif",
      city: "Casablanca",
      neighborhood: "Maârif",
      query_origin: { latitude: 33.5898, longitude: -7.644 },
    };
    const relation = buildNeighborhoodPoiRelation(
      casablancaPilot,
      poi(2, "Clinique Badr", "health", 33.5948697, -7.6410981),
      { geometry: shadow },
    );
    assert.equal(relation.relation, "near_certified_reference");
    assert.equal(relation.territorial_wording, "Autour du repère quartier");
    assert.notEqual(relation.relation, "inside_certified_boundary");
  });

  it("supports explicit authority linking without inventing a boundary", () => {
    const p = poi(3, "Gare Agdal", "transport", 33.996, -6.851);
    const relation = buildNeighborhoodPoiRelation(pilot([p]), p, {
      authorityLinkedPoiIds: new Set([p.poi_id]),
    });
    assert.equal(relation.relation, "authority_linked");
    assert.equal(relation.territorial_wording, "Rattaché au quartier");
  });

  it("fails closed outside the certified reference radius", () => {
    const far = poi(4, "Très loin", "health", 34.12, -6.85);
    const relation = buildNeighborhoodPoiRelation(pilot([far]), far);
    assert.equal(relation.relation, "unresolved");
    assert.equal(relation.territorial_wording, null);
  });
});

describe("Neighborhood Context L2 — anchor selection", () => {
  const seedPois = [
    poi(10, "Tram", "transport", 33.9958, -6.8530),
    poi(11, "Université", "education", 33.9960, -6.8528),
    poi(12, "Marché", "groceries", 33.9962, -6.8529),
    poi(13, "Clinique A", "health", 33.9964, -6.8527),
    poi(14, "Parc", "green_sport", 33.9966, -6.8526),
    poi(15, "Clinique B", "health", 33.9968, -6.8525),
    poi(16, "Clinique C", "health", 33.9970, -6.8524),
    poi(17, "Mall", "shopping", 33.9972, -6.8523),
    poi(18, "Café", "food", 33.9974, -6.8522),
  ];

  it("selects a stable diverse set with max two anchors per category and max eight total", () => {
    const first = selectNeighborhoodAnchors(pilot(seedPois));
    const second = selectNeighborhoodAnchors(pilot([...seedPois].reverse()));

    assert.equal(first.status, "ready");
    assert.equal(first.anchors.length, 8);
    assert.deepEqual(first.anchors.map((anchor) => anchor.poi_id), second.anchors.map((anchor) => anchor.poi_id));
    assert.equal(first.anchors.filter((anchor) => anchor.category === "health").length, 2);
    assert.equal(first.anchors.some((anchor) => anchor.poi_id === "osm:node:16"), false);
    assert.deepEqual(validateNeighborhoodAnchorSelection(first), []);
  });

  it("keeps territorial wording truth-safe for radius-only candidates", () => {
    const selection = selectNeighborhoodAnchors(pilot(seedPois.slice(0, 5)));
    assert.equal(selection.status, "ready");
    assert.equal(selection.anchors.length, 5);
    assert.equal(selection.anchors.every((anchor) => anchor.relation === "near_certified_reference"), true);
    assert.equal(selection.anchors.every((anchor) => anchor.territorial_wording === "Autour du repère quartier"), true);
  });

  it("reports partial and insufficient context rather than padding fake anchors", () => {
    const partial = selectNeighborhoodAnchors(pilot(seedPois.slice(0, 4)));
    const insufficient = selectNeighborhoodAnchors(pilot(seedPois.slice(0, 2)));
    assert.equal(partial.status, "partial_context");
    assert.equal(insufficient.status, "insufficient_context");
    assert.equal(partial.anchors.length, 4);
    assert.equal(insufficient.anchors.length, 2);
  });

  it("validator catches fabricated inside wording and category overflow", () => {
    const valid = selectNeighborhoodAnchors(pilot(seedPois.slice(0, 5)));
    const mutated: NeighborhoodAnchorSelectionV1 = JSON.parse(JSON.stringify(valid));
    mutated.anchors[0].territorial_wording = "Dans le quartier";
    const errors = validateNeighborhoodAnchorSelection(mutated);
    assert.ok(errors.some((error) => error.startsWith("false_inside_wording:")));
  });
});
