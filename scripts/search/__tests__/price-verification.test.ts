import assert from "node:assert/strict";
import test from "node:test";
import { formatPriceMad, isPriceToVerify } from "../../../lib/search-gateway/price-verification";

test("formats a preserved MAD price for display", () => {
  assert.match(formatPriceMad(1_250_000) ?? "", /^1[\s\u202f]250[\s\u202f]000 DH$/);
});

test("marks only priced rows carrying the price_to_verify reason", () => {
  assert.equal(isPriceToVerify({ normalized_price_mad: 1_250_000, display_eligibility_reason: "external_minimal_index|price_to_verify" }), true);
  assert.equal(isPriceToVerify({ normalized_price_mad: 1_250_000, display_eligibility_reason: "external_minimal_index" }), false);
  assert.equal(isPriceToVerify({ normalized_price_mad: undefined, display_eligibility_reason: "external_minimal_index|price_to_verify" }), false);
});
