import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RABAT_MARKET_ZONES_SHADOW,
  rabatMarketZonesAreShadowOnly,
} from "../../../lib/geo/rabat-market-zones-shadow";
import { validateMarketZoneRecord } from "../../../lib/geo/market-zone-registry";

const expectedBindings = new Map([
  ["market_zone_rabat_agdal", "district_rabat_agdal"],
  ["market_zone_rabat_hay_riad", "district_rabat_hay_riad"],
  ["market_zone_rabat_souissi", "district_rabat_souissi"],
  ["market_zone_rabat_centre", "district_rabat_hassan"],
]);

const areaRanges = new Map<string, readonly [number, number]>([
  ["market_zone_rabat_agdal", [7, 8]],
  ["market_zone_rabat_hay_riad", [14, 16]],
  ["market_zone_rabat_souissi", [55, 58]],
  ["market_zone_rabat_centre", [8, 9]],
]);

describe("Rabat AkarFinder market zones Shadow", () => {
  it("materializes exactly the four approved analytical zones", () => {
    assert.equal(RABAT_MARKET_ZONES_SHADOW.length, 4);
    assert.deepEqual(
      new Set(RABAT_MARKET_ZONES_SHADOW.map((zone) => zone.id)),
      new Set(expectedBindings.keys()),
    );
  });

  it("keeps every zone explicitly non-official and Shadow-only", () => {
    assert.equal(rabatMarketZonesAreShadowOnly(), true);
    for (const zone of RABAT_MARKET_ZONES_SHADOW) {
      assert.equal(zone.semanticType, "market_zone");
      assert.equal(zone.officialBoundary, false);
      assert.equal(zone.publicationStatus, "shadow");
      assert.equal(zone.reviewed, false);
    }
  });

  it("binds each market zone to the intended canonical AkarFinder entity", () => {
    for (const zone of RABAT_MARKET_ZONES_SHADOW) {
      assert.deepEqual(zone.canonicalNeighborhoodIds, [expectedBindings.get(zone.id)]);
    }
  });

  it("passes the market-zone contract with recomputable positive area", () => {
    for (const zone of RABAT_MARKET_ZONES_SHADOW) {
      assert.deepEqual(validateMarketZoneRecord(zone), [], zone.id);
      const range = areaRanges.get(zone.id);
      assert.ok(range, `Missing sanity range for ${zone.id}`);
      assert.ok(zone.areaKm2 >= range[0] && zone.areaKm2 <= range[1], `${zone.id}: ${zone.areaKm2} km²`);
    }
  });

  it("preserves explicit derivation provenance instead of claiming official neighborhood borders", () => {
    for (const zone of RABAT_MARKET_ZONES_SHADOW) {
      assert.ok(zone.derivationMethod.length > 0);
      assert.ok(zone.evidence.some((source) => source.sourceEntityType === "osm_relation"));
      assert.ok(zone.notes.some((note) => /non frontière administrative officielle/i.test(note)));
    }
  });
});
