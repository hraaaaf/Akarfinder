import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  clampVerifiedListingInventoryLimit,
  resolveVerifiedListingMarketZone,
} from "../../../lib/professional/verified-listing-inventory-repository";

const source = readFileSync(
  join(process.cwd(), "lib/professional/verified-listing-inventory-repository.ts"),
  "utf8",
);

describe("Carte C6 — verified professional listing inventory", () => {
  it("bounds reads deterministically", () => {
    assert.equal(clampVerifiedListingInventoryLimit(-5), 1);
    assert.equal(clampVerifiedListingInventoryLimit(0), 1);
    assert.equal(clampVerifiedListingInventoryLimit(25.9), 25);
    assert.equal(clampVerifiedListingInventoryLimit(500), 100);
    assert.equal(clampVerifiedListingInventoryLimit(Number.NaN), 50);
  });

  it("projects only neighborhoods resolved by the existing listing geo authority", () => {
    assert.deepEqual(resolveVerifiedListingMarketZone("Rabat", "Agdal"), {
      market_zone_id: "market_zone_rabat_agdal",
      geo_precision: "neighborhood_centroid",
    });
    assert.deepEqual(resolveVerifiedListingMarketZone("Rabat", "Hay Riad"), {
      market_zone_id: "market_zone_rabat_hay_riad",
      geo_precision: "neighborhood_centroid",
    });
    assert.deepEqual(resolveVerifiedListingMarketZone("Rabat", "Hassan"), {
      market_zone_id: "market_zone_rabat_centre",
      geo_precision: "neighborhood_centroid",
    });
  });

  it("fails closed for unresolved, including Souissi until listing geo authority resolves it", () => {
    assert.deepEqual(resolveVerifiedListingMarketZone("Rabat", "Souissi"), {
      market_zone_id: null,
      geo_precision: "city_centroid",
    });
    assert.equal(resolveVerifiedListingMarketZone("Rabat", "Quartier inconnu").market_zone_id, null);
    assert.equal(resolveVerifiedListingMarketZone("Casablanca", "Maârif").market_zone_id, null);
    assert.equal(resolveVerifiedListingMarketZone(null, null).market_zone_id, null);
  });

  it("reads verified ownership only and remains read-only", () => {
    assert.ok(source.includes('.from("professional_listing_ownership")'));
    assert.ok(source.includes('.eq("status", "verified")'));
    assert.ok(source.includes('.eq("organization_id", organizationId)'));
    assert.ok(source.includes('.limit(boundedLimit)'));
    assert.ok(source.includes('.from("property_listings")'));
    assert.ok(source.includes('resolveListingGeo(city, district)'));

    for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete("]) {
      assert.equal(source.includes(forbidden), false, `unexpected write path: ${forbidden}`);
    }
  });
});
