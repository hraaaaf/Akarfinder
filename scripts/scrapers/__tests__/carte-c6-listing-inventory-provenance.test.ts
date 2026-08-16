import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateInventoryByZoneAndProvenance,
  classifyVerifiedInventoryProvenance,
  compareZoneMarketToOwnedInventory,
  filterInventoryByProvenance,
  type ProvenanceInventoryItem,
} from "../../../lib/map/listing-inventory-provenance";

const zone = "market_zone_rabat_agdal";

const inventory: ProvenanceInventoryItem[] = [
  { property_listing_id: 1, market_zone_id: zone, provenance: "AkarFinder-owned" },
  { property_listing_id: 2, market_zone_id: zone, provenance: "partner" },
  { property_listing_id: 3, market_zone_id: zone, provenance: "market" },
  { property_listing_id: 4, market_zone_id: null, provenance: "partner" },
];

describe("Carte C6 — listing inventory provenance", () => {
  it("uses verified ownership and the existing explicit partner authority", () => {
    assert.equal(classifyVerifiedInventoryProvenance({ ownership_verified: false }), null);
    assert.equal(classifyVerifiedInventoryProvenance({ ownership_verified: true }), "AkarFinder-owned");
    assert.equal(classifyVerifiedInventoryProvenance({
      ownership_verified: true,
      partner_authority: {
        validation_status: "validated",
        activation_status: "active",
        source_authorization_status: "confirmed",
      },
    }), "partner");
    assert.equal(classifyVerifiedInventoryProvenance({
      ownership_verified: true,
      partner_authority: {
        validation_status: "validated",
        activation_status: "active",
        source_authorization_status: "pending",
      },
    }), "AkarFinder-owned");
  });

  it("filters and aggregates the three canonical provenance labels", () => {
    assert.deepEqual(filterInventoryByProvenance(inventory, "partner").map((item) => item.property_listing_id), [2, 4]);
    assert.deepEqual(filterInventoryByProvenance(inventory, "market").map((item) => item.property_listing_id), [3]);

    const counts = aggregateInventoryByZoneAndProvenance(inventory).get(zone);
    assert.deepEqual(counts, {
      market: 1,
      "AkarFinder-owned": 1,
      partner: 1,
    });
  });

  it("keeps the C2/C3 market metric unchanged when own provenance changes", () => {
    const before = compareZoneMarketToOwnedInventory({
      market_zone_id: zone,
      market_listing_count: 120,
      inventory,
    });
    const changed = inventory.map((item) => item.property_listing_id === 1 ? { ...item, provenance: "partner" as const } : item);
    const after = compareZoneMarketToOwnedInventory({
      market_zone_id: zone,
      market_listing_count: 120,
      inventory: changed,
    });

    assert.equal(before.market_listing_count, 120);
    assert.equal(after.market_listing_count, 120);
    assert.equal(before.akarfinder_owned_count, 1);
    assert.equal(after.akarfinder_owned_count, 0);
    assert.equal(before.partner_count, 1);
    assert.equal(after.partner_count, 2);
  });

  it("never forces unresolved inventory into a market zone", () => {
    assert.equal(aggregateInventoryByZoneAndProvenance(inventory).has(""), false);
    assert.equal(compareZoneMarketToOwnedInventory({
      market_zone_id: "market_zone_rabat_hassan",
      market_listing_count: 8,
      inventory,
    }).partner_count, 0);
  });
});
