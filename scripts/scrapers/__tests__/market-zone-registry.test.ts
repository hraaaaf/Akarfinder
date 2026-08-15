import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geometryAreaKm2 } from "../../../lib/geo/geometry-area";
import {
  type MarketZoneRecord,
  validateMarketZoneRecord,
  marketZonesChangeRanking,
} from "../../../lib/geo/market-zone-registry";

const geometry = {
  type: "Polygon" as const,
  coordinates: [[
    [-6.86, 33.99],
    [-6.85, 33.99],
    [-6.85, 34.00],
    [-6.86, 34.00],
    [-6.86, 33.99],
  ]],
};

const validRecord = (): MarketZoneRecord => ({
  version: "v1",
  id: "market_zone_rabat_agdal",
  cityCanonicalId: "rabat",
  slug: "agdal",
  displayName: "Agdal",
  aliases: [],
  semanticType: "market_zone",
  officialBoundary: false,
  canonicalNeighborhoodIds: ["district_rabat_agdal"],
  geometry,
  areaKm2: geometryAreaKm2(geometry),
  derivationMethod: "test_fixture",
  evidence: [{
    provider: "OpenStreetMap contributors",
    dataset: "OpenStreetMap",
    sourceUrl: "https://www.openstreetmap.org/",
    licenseId: "ODbL-1.0",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    attribution: "© OpenStreetMap contributors",
    retrievedAt: "2026-08-15T00:00:00.000Z",
  }],
  publicationStatus: "shadow",
  reviewed: false,
  notes: ["Fixture de contrat uniquement."],
});

describe("AkarFinder market zone registry", () => {
  it("accepts a truth-labelled Shadow market zone with recomputable area", () => {
    assert.deepEqual(validateMarketZoneRecord(validRecord()), []);
    assert.equal(marketZonesChangeRanking(), false);
  });

  it("rejects an official-boundary claim", () => {
    const record = { ...validRecord(), officialBoundary: true } as unknown as MarketZoneRecord;
    assert.ok(validateMarketZoneRecord(record).some((issue) => issue.code === "official_boundary_forbidden"));
  });

  it("rejects missing canonical binding and evidence", () => {
    const record = { ...validRecord(), canonicalNeighborhoodIds: [], evidence: [] };
    const issues = validateMarketZoneRecord(record);
    assert.ok(issues.some((issue) => issue.code === "missing_binding"));
    assert.ok(issues.some((issue) => issue.code === "missing_evidence"));
  });

  it("rejects an area value that is not derived from the geometry", () => {
    const record = { ...validRecord(), areaKm2: validRecord().areaKm2 * 1.1 };
    assert.ok(validateMarketZoneRecord(record).some((issue) => issue.code === "area_mismatch"));
  });

  it("fails closed when a zone leaves Shadow without review", () => {
    const record = { ...validRecord(), publicationStatus: "canary" as const, reviewed: false };
    assert.ok(validateMarketZoneRecord(record).some((issue) => issue.code === "production_without_review"));
  });
});
