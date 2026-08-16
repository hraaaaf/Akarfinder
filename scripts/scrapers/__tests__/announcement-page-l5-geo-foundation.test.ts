import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildGeoTruth, isExactGeoTruth } from "@/lib/geo/geo-truth";
import { executeProviderFailover } from "@/lib/geo/provider-failover";
import { hasFreshProviderEvidence } from "@/lib/geo/provider-contracts";

function listing(overrides: Record<string, unknown> = {}) {
  return {
    id: "geo-test",
    city: "Rabat",
    neighborhood: "Agdal",
    latitude: 33.9908,
    longitude: -6.8481,
    geo_precision: "exact" as const,
    geo_source: "scraped_coordinates" as const,
    geo_label: "Coordonnées déclarées par la source",
    ...overrides,
  };
}

describe("ANN-L5 GeoTruth", () => {
  it("admits an exact origin only for finite in-range coordinates explicitly marked exact", () => {
    const truth = buildGeoTruth(listing());
    assert.equal(truth.availability, "exact");
    assert.equal(truth.exactOriginAllowed, true);
    assert.deepEqual(truth.coordinate, { latitude: 33.9908, longitude: -6.8481 });
    assert.equal(isExactGeoTruth(truth), true);
    assert.equal(truth.legacyNearbyTimesTrusted, false);
  });

  it("keeps neighborhood and city centroids as context only, never exact origins", () => {
    for (const precision of ["neighborhood_centroid", "city_centroid"] as const) {
      const truth = buildGeoTruth(listing({
        geo_precision: precision,
        geo_source: precision,
      }));
      assert.equal(truth.availability, "context_only");
      assert.equal(truth.exactOriginAllowed, false);
      assert.equal(isExactGeoTruth(truth), false);
      assert.ok(truth.coordinate);
    }
  });

  it("fails closed on missing, NaN and out-of-range coordinates", () => {
    const cases = [
      { latitude: null, longitude: null, reason: "coordinates_missing" },
      { latitude: Number.NaN, longitude: -6.8, reason: "coordinates_invalid" },
      { latitude: 91, longitude: -6.8, reason: "coordinates_invalid" },
      { latitude: 33.9, longitude: -181, reason: "coordinates_invalid" },
    ];
    for (const entry of cases) {
      const truth = buildGeoTruth(listing(entry));
      assert.equal(truth.availability, "unavailable");
      assert.equal(truth.coordinate, null);
      assert.equal(truth.exactOriginAllowed, false);
      assert.equal(truth.reason, entry.reason);
    }
  });

  it("does not promote valid coordinates with unknown precision", () => {
    const truth = buildGeoTruth(listing({ geo_precision: "unknown", geo_source: "unknown" }));
    assert.equal(truth.availability, "unavailable");
    assert.equal(truth.coordinate, null);
    assert.equal(truth.exactOriginAllowed, false);
    assert.equal(truth.reason, "precision_unknown");
  });
});

describe("ANN-L5 provider evidence and failover", () => {
  const now = new Date("2026-08-16T10:00:00.000Z");

  it("rejects missing attribution, future fetches and expired evidence", () => {
    assert.equal(hasFreshProviderEvidence({ providerId: "a", attribution: "", fetchedAt: "2026-08-16T09:00:00Z", expiresAt: null }, now), false);
    assert.equal(hasFreshProviderEvidence({ providerId: "a", attribution: "A", fetchedAt: "2026-08-16T11:00:00Z", expiresAt: null }, now), false);
    assert.equal(hasFreshProviderEvidence({ providerId: "a", attribution: "A", fetchedAt: "2026-08-16T08:00:00Z", expiresAt: "2026-08-16T09:00:00Z" }, now), false);
    assert.equal(hasFreshProviderEvidence({ providerId: "a", attribution: "A", fetchedAt: "2026-08-16T09:00:00Z", expiresAt: "2026-08-16T12:00:00Z" }, now), true);
  });

  it("fails over deterministically when evidence is invalid or a provider throws", async () => {
    const providers = [{ id: "first" }, { id: "second" }, { id: "third" }] as const;
    const result = await executeProviderFailover(providers, async (provider) => {
      if (provider.id === "first") throw new Error("upstream");
      if (provider.id === "second") {
        return {
          status: "available" as const,
          evidence: { providerId: "second", attribution: "", fetchedAt: "2026-08-16T09:00:00Z", expiresAt: null },
        };
      }
      return {
        status: "available" as const,
        evidence: { providerId: "third", attribution: "Provider Three", fetchedAt: "2026-08-16T09:00:00Z", expiresAt: null },
      };
    }, now);
    assert.equal(result.result.status, "available");
    assert.deepEqual(result.attemptedProviderIds, ["first", "second", "third"]);
    if (result.result.status === "available") assert.equal(result.result.evidence.providerId, "third");
  });

  it("returns explicit unavailable when no provider is configured", async () => {
    const result = await executeProviderFailover([], async () => {
      throw new Error("unreachable");
    }, now);
    assert.equal(result.result.status, "unavailable");
    if (result.result.status === "unavailable") assert.equal(result.result.reason, "not_configured");
    assert.deepEqual(result.attemptedProviderIds, []);
  });
});

describe("ANN-L5 architectural boundaries", () => {
  it("keeps concrete geo providers out of listing React components", () => {
    const files = [
      "components/listings/AnnouncementPageShell.tsx",
      "components/listings/PropertyDetailV2.tsx",
      "components/listings/PropertyCore.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      assert.doesNotMatch(source, /lib\/geo\/(?:providers|provider-implementations)\//);
      assert.doesNotMatch(source, /\b(?:Mapbox|GooglePlaces|GoogleRoutes|Nominatim|Overpass|OSRM|Valhalla|Mapillary)\b/);
    }
  });

  it("does not trust legacy nearby place time strings as routed evidence", () => {
    const source = readFileSync("lib/geo/geo-truth.ts", "utf8");
    assert.match(source, /legacyNearbyTimesTrusted: false/);
    assert.doesNotMatch(source, /nearby_places/);
    assert.doesNotMatch(source, /walking_minutes/);
  });
});
