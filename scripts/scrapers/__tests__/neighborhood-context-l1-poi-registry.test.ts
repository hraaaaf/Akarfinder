import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adaptOsmNearbyResult,
  computeNeighborhoodPoiFreshness,
  dedupeNeighborhoodPois,
  NEIGHBORHOOD_POI_SCHEMA_VERSION,
  normalizeNeighborhoodPoiName,
  OSM_ATTRIBUTION,
  OSM_LICENSE_URL,
  validateNeighborhoodPoiV1,
  type NeighborhoodPoiV1,
} from "@/lib/neighborhood-context/poi-registry";
import {
  ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
  ANN_L5_CERTIFIED_SEED_RUN_ID,
  getAnnL5CertifiedSeedNeighborhoodIds,
  getAnnL5CertifiedSeedPois,
} from "@/lib/neighborhood-context/certified-seed";
import {
  getNeighborhoodContextL1Pilots,
  NEIGHBORHOOD_CONTEXT_L1_CATEGORIES,
} from "@/lib/neighborhood-context/pilot-neighborhoods";
import {
  NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION,
  readNeighborhoodPoiSnapshot,
  summarizeNeighborhoodPoiSnapshot,
  validateNeighborhoodPoiSnapshotV1,
  type NeighborhoodPoiSnapshotV1,
} from "@/lib/neighborhood-context/poi-snapshot";
import type { NearbyProviderResult } from "@/lib/geo/provider-contracts";

const NOW = new Date("2026-08-24T12:00:00.000Z");

function availableNearby(): NearbyProviderResult {
  return {
    status: "available",
    evidence: {
      providerId: "overpass",
      attribution: OSM_ATTRIBUTION,
      fetchedAt: "2026-08-24T11:30:00.000Z",
      expiresAt: "2026-08-24T12:30:00.000Z",
    },
    pois: [
      { id: "osm:node:101", name: "Université Mohammed V", category: "university", coordinate: { latitude: 33.997, longitude: -6.847 } },
      { id: "osm:node:102", name: "Carrefour Market", category: "supermarket", coordinate: { latitude: 33.994, longitude: -6.851 } },
      { id: "osm:node:103", name: "Station Agdal", category: "tram_stop", coordinate: { latitude: 33.995, longitude: -6.849 } },
    ],
  };
}

function basePoi(overrides: Partial<NeighborhoodPoiV1> = {}): NeighborhoodPoiV1 {
  return {
    schema_version: NEIGHBORHOOD_POI_SCHEMA_VERSION,
    poi_id: "osm:node:101",
    source_id: "openstreetmap",
    source_entity_id: "node/101",
    provider_id: "overpass",
    name: "Université Mohammed V",
    normalized_name: "universite mohammed v",
    category: "education",
    latitude: 33.997,
    longitude: -6.847,
    source_url: "https://www.openstreetmap.org/node/101",
    attribution: OSM_ATTRIBUTION,
    license_policy: "odbl_attribution_required",
    license_url: OSM_LICENSE_URL,
    observed_at: "2026-08-24T11:30:00.000Z",
    freshness_status: "fresh",
    confidence: "source_verified",
    status: "active",
    ...overrides,
  };
}

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const radius = 6_371_000;
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

describe("Neighborhood Context L1 — canonical POI registry", () => {
  it("adapts fresh OSM Nearby results into stable canonical POI identities", () => {
    const adapted = adaptOsmNearbyResult(availableNearby(), NOW);
    assert.equal(adapted.status, "available");
    assert.equal(adapted.rejected.length, 0);
    assert.equal(adapted.pois.length, 3);
    assert.deepEqual(adapted.pois.map((poi) => poi.poi_id), ["osm:node:101", "osm:node:102", "osm:node:103"]);

    const university = adapted.pois.find((poi) => poi.poi_id === "osm:node:101");
    assert.ok(university);
    assert.equal(university.category, "education");
    assert.equal(university.source_entity_id, "node/101");
    assert.equal(university.source_url, "https://www.openstreetmap.org/node/101");
    assert.equal(university.license_policy, "odbl_attribution_required");
    assert.equal(university.status, "active");
    assert.equal(validateNeighborhoodPoiV1(university, NOW).valid, true);
  });

  it("normalizes French and Arabic POI names without deleting Arabic-only identities", () => {
    assert.equal(normalizeNeighborhoodPoiName("Université Mohammed V"), "universite mohammed v");
    assert.equal(normalizeNeighborhoodPoiName("صيدلية ابن سينا"), "صيدلية ابن سينا");
  });

  it("rejects malformed OSM identity, invalid coordinates and missing attribution", () => {
    const badIdentity = availableNearby();
    if (badIdentity.status !== "available") throw new Error("fixture");
    badIdentity.pois = [
      { id: "school-legacy", name: "École", category: "school", coordinate: { latitude: 33.99, longitude: -6.84 } },
      { id: "osm:node:999", name: "Hors monde", category: "school", coordinate: { latitude: 200, longitude: -6.84 } },
    ];
    const adapted = adaptOsmNearbyResult(badIdentity, NOW);
    assert.equal(adapted.pois.length, 0);
    assert.equal(adapted.rejected.length, 2);

    const validation = validateNeighborhoodPoiV1(basePoi({ attribution: "" }), NOW);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes("attribution"));
    assert.ok(validation.errors.includes("osm_attribution"));
  });

  it("fails closed when provider evidence is stale", () => {
    const nearby = availableNearby();
    if (nearby.status !== "available") throw new Error("fixture");
    nearby.evidence.expiresAt = "2026-08-24T11:59:00.000Z";
    const adapted = adaptOsmNearbyResult(nearby, NOW);
    assert.equal(adapted.status, "unavailable");
    assert.equal(adapted.unavailable_reason, "invalid_evidence");
    assert.equal(adapted.pois.length, 0);
  });

  it("marks registry observations stale after the explicit 30-day policy", () => {
    assert.equal(computeNeighborhoodPoiFreshness("2026-08-01T12:00:00.000Z", NOW), "fresh");
    assert.equal(computeNeighborhoodPoiFreshness("2026-07-01T12:00:00.000Z", NOW), "stale");
    const stale = basePoi({ observed_at: "2026-07-01T12:00:00.000Z", freshness_status: "stale", status: "stale" });
    assert.equal(validateNeighborhoodPoiV1(stale, NOW).valid, true);
  });

  it("deduplicates same-category same-name POIs within 80m while preserving stable identity", () => {
    const a = basePoi({ poi_id: "osm:node:100", source_entity_id: "node/100", source_url: "https://www.openstreetmap.org/node/100" });
    const b = basePoi({ poi_id: "osm:node:101", source_entity_id: "node/101", source_url: "https://www.openstreetmap.org/node/101", latitude: 33.9972, longitude: -6.8471 });
    const c = basePoi({ poi_id: "osm:node:102", source_entity_id: "node/102", source_url: "https://www.openstreetmap.org/node/102", latitude: 34.01, longitude: -6.847 });
    const deduped = dedupeNeighborhoodPois([c, b, a, a]);
    assert.deepEqual(deduped.map((poi) => poi.poi_id), ["osm:node:100", "osm:node:102"]);
  });
});

describe("Neighborhood Context L1 — certified continuity seed", () => {
  it("uses only the four ANN-L5 certified pilot cities and never fills Agadir/Fès", () => {
    assert.equal(ANN_L5_CERTIFIED_SEED_RUN_ID, 31943502557);
    assert.equal(ANN_L5_CERTIFIED_SEED_OBSERVED_AT, "2026-08-16T11:08:32.249Z");
    assert.deepEqual(getAnnL5CertifiedSeedNeighborhoodIds(), [
      "district_casablanca_maarif",
      "district_marrakech_gueliz",
      "district_rabat_agdal",
      "district_tanger_malabata",
    ]);
    assert.equal(getAnnL5CertifiedSeedPois("district_agadir_founty", NOW).length, 0);
    assert.equal(getAnnL5CertifiedSeedPois("district_fes_ville_nouvelle", NOW).length, 0);
  });

  it("keeps every seeded POI fresh, valid, category-scoped and within the 1.8km pilot candidate radius", () => {
    const pilots = getNeighborhoodContextL1Pilots();
    let total = 0;
    for (const pilot of pilots) {
      const pois = getAnnL5CertifiedSeedPois(pilot.canonical_neighborhood_id, NOW);
      for (const poi of pois) {
        total += 1;
        assert.equal(validateNeighborhoodPoiV1(poi, NOW).valid, true, poi.poi_id);
        assert.equal(poi.status, "active");
        assert.equal(poi.freshness_status, "fresh");
        assert.ok(NEIGHBORHOOD_CONTEXT_L1_CATEGORIES.includes(poi.category), poi.category);
        assert.ok(haversineMeters(pilot.query_origin, poi) <= pilot.query_radius_m, `${pilot.neighborhood}: ${poi.poi_id}`);
      }
    }
    assert.equal(total, 13);
  });
});

describe("Neighborhood Context L1 — pilot and snapshot contracts", () => {
  it("resolves exactly the six canonical pilot neighborhoods without inventing IDs", () => {
    const pilots = getNeighborhoodContextL1Pilots();
    assert.equal(pilots.length, 6);
    assert.deepEqual(pilots.map((pilot) => pilot.canonical_neighborhood_id), [
      "district_rabat_agdal",
      "district_casablanca_maarif",
      "district_marrakech_gueliz",
      "district_tanger_malabata",
      "district_agadir_founty",
      "district_fes_ville_nouvelle",
    ]);
    assert.equal(pilots.every((pilot) => Number.isFinite(pilot.query_origin.latitude) && Number.isFinite(pilot.query_origin.longitude)), true);
  });

  it("validates a read-only live snapshot and performs no network access while reading it", () => {
    const poi = basePoi();
    const snapshot: NeighborhoodPoiSnapshotV1 = {
      schema_version: NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION,
      generated_at: NOW.toISOString(),
      production_provider_claim: false,
      source_policy: {
        source_id: "openstreetmap",
        attribution: OSM_ATTRIBUTION,
        license_policy: "odbl_attribution_required",
        license_url: OSM_LICENSE_URL,
        acquisition_mode: "explicit_batch_only",
      },
      pilots: [{
        canonical_neighborhood_id: "district_rabat_agdal",
        city: "Rabat",
        neighborhood: "Agdal",
        query_origin: { latitude: 33.9959, longitude: -6.8533 },
        query_radius_m: 1800,
        status: "available",
        acquisition_mode: "live",
        provider_id: "overpass",
        observed_at: "2026-08-24T11:30:00.000Z",
        endpoint_used: "https://overpass-api.de/api/interpreter",
        poi_count: 1,
        categories: ["education"],
        pois: [poi],
        diagnostics: [],
      }],
    };

    assert.equal(validateNeighborhoodPoiSnapshotV1(snapshot, NOW).valid, true);
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error("network must not be used by registry read path");
    }) as typeof fetch;
    try {
      const read = readNeighborhoodPoiSnapshot(snapshot, NOW);
      assert.equal(read.pilots[0]?.pois[0]?.poi_id, "osm:node:101");
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const summary = summarizeNeighborhoodPoiSnapshot(snapshot);
    assert.equal(summary.available_pilots, 1);
    assert.equal(summary.live_pilots, 1);
    assert.equal(summary.certified_seed_pilots, 0);
    assert.equal(summary.total_pois, 1);
  });

  it("validates a certified-seed snapshot only when it stays explicit and endpoint-free", () => {
    const seeded = getAnnL5CertifiedSeedPois("district_rabat_agdal", NOW);
    const snapshot: NeighborhoodPoiSnapshotV1 = {
      schema_version: NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION,
      generated_at: NOW.toISOString(),
      production_provider_claim: false,
      source_policy: {
        source_id: "openstreetmap",
        attribution: OSM_ATTRIBUTION,
        license_policy: "odbl_attribution_required",
        license_url: OSM_LICENSE_URL,
        acquisition_mode: "explicit_batch_only",
      },
      pilots: [{
        canonical_neighborhood_id: "district_rabat_agdal",
        city: "Rabat",
        neighborhood: "Agdal",
        query_origin: { latitude: 33.9959, longitude: -6.8533 },
        query_radius_m: 1800,
        status: "available",
        acquisition_mode: "certified_seed",
        provider_id: "ann-l5-certified-seed",
        observed_at: ANN_L5_CERTIFIED_SEED_OBSERVED_AT,
        endpoint_used: null,
        poi_count: seeded.length,
        categories: Array.from(new Set(seeded.map((poi) => poi.category))).sort(),
        pois: seeded,
        diagnostics: ["continuity seed"],
      }],
    };
    assert.equal(validateNeighborhoodPoiSnapshotV1(snapshot, NOW).valid, true);
    const summary = summarizeNeighborhoodPoiSnapshot(snapshot);
    assert.equal(summary.certified_seed_pilots, 1);
    assert.equal(summary.live_pilots, 0);
  });

  it("rejects snapshots that silently publish data in a degraded pilot", () => {
    const snapshot: NeighborhoodPoiSnapshotV1 = {
      schema_version: NEIGHBORHOOD_POI_SNAPSHOT_SCHEMA_VERSION,
      generated_at: NOW.toISOString(),
      production_provider_claim: false,
      source_policy: {
        source_id: "openstreetmap",
        attribution: OSM_ATTRIBUTION,
        license_policy: "odbl_attribution_required",
        license_url: OSM_LICENSE_URL,
        acquisition_mode: "explicit_batch_only",
      },
      pilots: [{
        canonical_neighborhood_id: "district_rabat_agdal",
        city: "Rabat",
        neighborhood: "Agdal",
        query_origin: { latitude: 33.9959, longitude: -6.8533 },
        query_radius_m: 1800,
        status: "external_degraded",
        acquisition_mode: "none",
        provider_id: "overpass",
        observed_at: null,
        endpoint_used: null,
        poi_count: 1,
        categories: ["education"],
        pois: [basePoi()],
        diagnostics: ["upstream_error"],
      }],
    };
    const validation = validateNeighborhoodPoiSnapshotV1(snapshot, NOW);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes("non_available_with_pois:district_rabat_agdal"));
  });
});
