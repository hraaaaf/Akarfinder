import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasMoroccanCentimeMillionPriceLanguage,
  inferContextualTransaction,
} from "../../../data-ingestion/transaction-context.js";

describe("contextual transaction inference", () => {
  it("accepts a plausible apartment sale context", () => {
    assert.deepEqual(
      inferContextualTransaction({
        discovery_transactions: ["sale"],
        price_amount: 1_370_000,
        price_on_request: false,
        property_type: "apartment",
      }),
      { transaction: "sale", confidence: "contextual", reason: "single_context_plausible_price" },
    );
  });

  it("refuses an implausibly low apartment sale price such as 6300 MAD", () => {
    assert.deepEqual(
      inferContextualTransaction({
        discovery_transactions: ["sale"],
        price_amount: 6_300,
        price_on_request: false,
        property_type: "apartment",
      }),
      { transaction: null, confidence: "missing", reason: "implausible_sale_price" },
    );
  });

  it("accepts a plausible apartment rent context", () => {
    assert.equal(
      inferContextualTransaction({
        discovery_transactions: ["rent"],
        price_amount: 8_500,
        price_on_request: false,
        property_type: "apartment",
      }).transaction,
      "rent",
    );
  });

  it("accepts calibrated villa, house, commercial and land sale contexts", () => {
    const cases = [
      { property_type: "villa" as const, price_amount: 24_000_000 },
      { property_type: "house" as const, price_amount: 2_520_000 },
      { property_type: "commercial" as const, price_amount: 9_600_000 },
      { property_type: "land" as const, price_amount: 1_850_000 },
    ];
    for (const item of cases) {
      assert.equal(inferContextualTransaction({
        discovery_transactions: ["sale"],
        price_amount: item.price_amount,
        price_on_request: false,
        property_type: item.property_type,
      }).transaction, "sale");
    }
  });

  it("accepts calibrated villa, house and commercial rent contexts", () => {
    const cases = [
      { property_type: "villa" as const, price_amount: 45_000 },
      { property_type: "house" as const, price_amount: 18_000 },
      { property_type: "commercial" as const, price_amount: 40_000 },
    ];
    for (const item of cases) {
      assert.equal(inferContextualTransaction({
        discovery_transactions: ["rent"],
        price_amount: item.price_amount,
        price_on_request: false,
        property_type: item.property_type,
      }).transaction, "rent");
    }
  });

  it("does not infer land rent without calibration", () => {
    assert.deepEqual(
      inferContextualTransaction({
        discovery_transactions: ["rent"],
        price_amount: 20_000,
        price_on_request: false,
        property_type: "land",
      }),
      { transaction: null, confidence: "missing", reason: "unsupported_context_for_property_type" },
    );
  });

  it("never infers from contradictory sale and rent discovery contexts", () => {
    assert.deepEqual(
      inferContextualTransaction({
        discovery_transactions: ["sale", "rent"],
        price_amount: 1_500_000,
        price_on_request: false,
        property_type: "apartment",
      }),
      { transaction: null, confidence: "missing", reason: "context_conflict" },
    );
  });

  it("never infers when the numeric price is missing or on request", () => {
    assert.equal(
      inferContextualTransaction({
        discovery_transactions: ["sale"],
        price_amount: null,
        price_on_request: true,
        property_type: "villa",
      }).transaction,
      null,
    );
  });

  it("flags Moroccan price wording in millions for local centime normalization review", () => {
    assert.equal(hasMoroccanCentimeMillionPriceLanguage("le prix est de 180 millions négociable, prix actuel 170 millions"), true);
    assert.equal(hasMoroccanCentimeMillionPriceLanguage("Appartement de 180 m²"), false);
  });
});
