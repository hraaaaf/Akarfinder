import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  canonicalizeSeoIntent,
  canonicalizeSeoPropertyType,
  evaluateSeoInventoryEvidence,
  getInventoryIntentVariants,
  getInventoryPropertyTypeVariants,
  unavailableSeoInventoryDecision,
} from "../../../lib/seo/eligibility.js";

describe("SEO eligibility gate V1", () => {
  it("normalizes URL/search intent aliases into the two SEO transaction intents", () => {
    assert.equal(canonicalizeSeoIntent("acheter"), "acheter");
    assert.equal(canonicalizeSeoIntent("sale"), "acheter");
    assert.equal(canonicalizeSeoIntent("buy"), "acheter");
    assert.equal(canonicalizeSeoIntent("rent"), "louer");
    assert.equal(canonicalizeSeoIntent("location"), "louer");
    assert.equal(canonicalizeSeoIntent("new"), null);
    assert.deepEqual(getInventoryIntentVariants("acheter"), ["sale", "buy", "achat"]);
    assert.deepEqual(getInventoryIntentVariants("louer"), ["rent", "location"]);
  });

  it("normalizes property aliases before any type-level SEO decision", () => {
    assert.equal(canonicalizeSeoPropertyType("Appartement"), "apartment");
    assert.equal(canonicalizeSeoPropertyType("terrain"), "land");
    assert.equal(canonicalizeSeoPropertyType("Bureau"), "office");
    assert.equal(canonicalizeSeoPropertyType("local commercial"), "commercial");
    assert.equal(canonicalizeSeoPropertyType("riad"), "riad");
    assert.equal(canonicalizeSeoPropertyType("studio"), null);
    assert.deepEqual(getInventoryPropertyTypeVariants("apartment"), ["apartment", "appartement"]);
  });

  it("requires both the 20-listing floor and three distinct sources", () => {
    assert.deepEqual(evaluateSeoInventoryEvidence({ listingCount: 20, sourceCount: 3 }), {
      eligible: true,
      reason: "eligible",
      listingCount: 20,
      sourceCount: 3,
    });
    assert.equal(evaluateSeoInventoryEvidence({ listingCount: 19, sourceCount: 8 }).reason, "insufficient_stock");
    assert.equal(evaluateSeoInventoryEvidence({ listingCount: 200, sourceCount: 2 }).reason, "insufficient_sources");
  });

  it("fails closed for unavailable, non-finite, or invalid gate evidence", () => {
    assert.deepEqual(unavailableSeoInventoryDecision(), {
      eligible: false,
      reason: "inventory_unavailable",
      listingCount: 0,
      sourceCount: 0,
    });
    assert.equal(evaluateSeoInventoryEvidence({ listingCount: Number.NaN, sourceCount: 3 }).reason, "inventory_unavailable");
    assert.equal(evaluateSeoInventoryEvidence({ listingCount: 20, sourceCount: Number.POSITIVE_INFINITY }).reason, "inventory_unavailable");
    for (const gate of [
      { minListings: Number.NaN, minSources: 3 },
      { minListings: 0, minSources: 3 },
      { minListings: 20, minSources: 0 },
      { minListings: -1, minSources: 3 },
    ]) {
      assert.equal(
        evaluateSeoInventoryEvidence({ listingCount: 20, sourceCount: 3 }, gate).reason,
        "inventory_unavailable",
      );
    }
  });

  it("reads only the strict public representation model and performs no database writes", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/seo/eligibility-read-model.ts"), "utf8");
    assert.ok(source.includes('"public_search_representations_v1"'));
    assert.ok(source.includes('"eligible_primary"'));
    assert.ok(source.includes('"fresh_confirmed"'));
    assert.ok(source.includes('"source_domain"'));
    assert.ok(source.includes('count: "exact"'));
    assert.ok(source.includes('.order("source_domain"'));
    assert.ok(source.includes("count == null"));
    assert.equal(source.includes(".insert("), false);
    assert.equal(source.includes(".update("), false);
    assert.equal(source.includes(".upsert("), false);
    assert.equal(source.includes(".delete("), false);
  });
});
