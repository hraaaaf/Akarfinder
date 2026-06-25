import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addCompareId,
  clearCompareIds,
  parseCompareIds,
  readCompareIds,
  removeCompareId,
  toggleCompareId,
} from "../../../lib/compare/compare-storage.js";
import {
  buildCompareListingInsights,
  buildCompareSummary,
  containsForbiddenCompareWording,
} from "../../../lib/compare/compare-summary.js";
import type { Listing } from "../../../lib/listings/types.js";

function createMemoryStorage(seed?: string[]) {
  const data = new Map<string, string>();
  if (seed) {
    data.set("akarfinder:compare:listings", JSON.stringify(seed));
  }
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Appartement centre ville",
    city: "Rabat",
    neighborhood: "Hay Riad",
    price: 1450000,
    currency: "DH",
    surface_m2: 92,
    price_per_m2: 15761,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Mise à jour récente",
    source_type: "Source analysée",
    reliability_label: "Fiabilité élevée",
    reliability_score: 84,
    is_mre_friendly: false,
    description: "Annonce analysée",
    image_url: "",
    reliability_explanation: "Score indicatif disponible",
    data_completeness_score: 82,
    ...overrides,
  };
}

describe("P15A compare storage", () => {
  test("adds one listing to compare storage", () => {
    const storage = createMemoryStorage();
    const result = addCompareId("1", storage);
    assert.equal(result.ok, true);
    assert.deepEqual(readCompareIds(storage), ["1"]);
  });

  test("enforces a maximum of 4 listings", () => {
    const storage = createMemoryStorage(["1", "2", "3", "4"]);
    const result = addCompareId("5", storage);
    assert.equal(result.ok, false);
    assert.equal(result.status, "limit_reached");
    assert.deepEqual(readCompareIds(storage), ["1", "2", "3", "4"]);
  });

  test("removes and clears compared listings", () => {
    const storage = createMemoryStorage(["1", "2"]);
    removeCompareId("1", storage);
    assert.deepEqual(readCompareIds(storage), ["2"]);
    clearCompareIds(storage);
    assert.deepEqual(readCompareIds(storage), []);
  });

  test("toggles stored ids and parses invalid payloads safely", () => {
    const storage = createMemoryStorage(["1"]);
    toggleCompareId("1", storage);
    assert.deepEqual(readCompareIds(storage), []);
    toggleCompareId("2", storage);
    assert.deepEqual(readCompareIds(storage), ["2"]);
    assert.deepEqual(parseCompareIds("{invalid"), []);
  });
});

describe("P15A compare summary", () => {
  test("builds empty-state safe summary wording", () => {
    const insights = [
      buildCompareListingInsights(makeListing()),
      buildCompareListingInsights(
        makeListing({
          id: "listing-2",
          title: "Appartement second",
          price_per_m2: 14900,
          reliability_score: 72,
          data_completeness_score: 70,
        })
      ),
    ];

    const summary = buildCompareSummary(insights);
    assert.ok(summary.cards.length >= 2);
    assert.equal(
      containsForbiddenCompareWording(
        `${summary.disclaimer} ${summary.cards.map((card) => card.detail).join(" ")}`
      ),
      false
    );
  });

  test("flags points to verify when duplicate or missing signals exist", () => {
    const insights = [
      buildCompareListingInsights(
        makeListing({
          duplicate_score: 0.82,
          reliability_score: 48,
          data_completeness_score: 38,
        })
      ),
      buildCompareListingInsights(
        makeListing({
          id: "listing-2",
          title: "Villa à vérifier",
          city: "Ville inconnue",
          neighborhood: "",
          property_type: "Villa",
          price_per_m2: 13000,
        })
      ),
    ];

    const summary = buildCompareSummary(insights);
    assert.ok(summary.pointsToVerify.length >= 1);
  });
});
