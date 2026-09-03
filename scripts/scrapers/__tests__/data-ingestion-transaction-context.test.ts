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

  it("never infers when the numeric price is missing", () => {
    assert.equal(
      inferContextualTransaction({
        discovery_transactions: ["sale"],
        price_amount: null,
        price_on_request: true,
        property_type: "apartment",
      }).transaction,
      null,
    );
  });

  it("does not infer contextual transactions for uncalibrated property types", () => {
    assert.deepEqual(
      inferContextualTransaction({
        discovery_transactions: ["sale"],
        price_amount: 3_500_000,
        price_on_request: false,
        property_type: "villa",
      }),
      { transaction: null, confidence: "missing", reason: "unsupported_property_type_for_contextual_inference" },
    );
  });

  it("flags Moroccan price wording in millions for local centime normalization review", () => {
    assert.equal(hasMoroccanCentimeMillionPriceLanguage("le prix est de 180 millions négociable, prix actuel 170 millions"), true);
    assert.equal(hasMoroccanCentimeMillionPriceLanguage("Appartement de 180 m²"), false);
  });
});
