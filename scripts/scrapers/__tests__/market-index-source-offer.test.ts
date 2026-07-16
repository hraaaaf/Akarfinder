// AKARFINDER-MARKET-INDEX-FOUNDATION-1 — SourceOffer tests (mission section 19.B).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyPrice } from "../../../lib/market-index/market-index-price.js";
import { validateSourceOffer } from "../../../lib/market-index/market-index-validation.js";
import {
  assertOpenSerpOriginIsNeverPartnerFacing,
  isPersistedOpenSerp,
} from "../../../lib/market-index/market-index-provenance.js";
import { computeSourceOfferIdentity } from "../../../lib/market-index/market-index-identifiers.js";

describe("SourceOffer — price null preserved", () => {
  it("classifies a null price as not_disclosed, never invents a number", () => {
    const result = classifyPrice(null);
    assert.equal(result.status, "not_disclosed");
    assert.equal(result.value, null);
  });

  it("classifies undefined the same as null", () => {
    const result = classifyPrice(undefined);
    assert.equal(result.status, "not_disclosed");
  });
});

describe("SourceOffer — price 0/negative invalidated", () => {
  it("classifies 0 as invalid, not valid", () => {
    assert.equal(classifyPrice(0).status, "invalid");
  });
  it("classifies a negative number as invalid", () => {
    assert.equal(classifyPrice(-500000).status, "invalid");
  });
  it("classifies NaN/Infinity as invalid", () => {
    assert.equal(classifyPrice(Number.NaN).status, "invalid");
    assert.equal(classifyPrice(Number.POSITIVE_INFINITY).status, "invalid");
  });
  it("classifies a positive number as valid", () => {
    const result = classifyPrice(1200000);
    assert.equal(result.status, "valid");
    assert.equal(result.value, 1200000);
  });
  it("classifies a range-like string as ambiguous, not a guessed number", () => {
    assert.equal(classifyPrice("500000-600000").status, "ambiguous");
  });
});

describe("SourceOffer — external_web_result / partner_result never auto-deduced incorrectly", () => {
  it("refuses to assign a partner-facing origin_type to an OpenSERP-provider offer", () => {
    assert.throws(() => assertOpenSerpOriginIsNeverPartnerFacing(true, "partner_api"));
    assert.throws(() => assertOpenSerpOriginIsNeverPartnerFacing(true, "partner_feed"));
    assert.throws(() => assertOpenSerpOriginIsNeverPartnerFacing(true, "first_party_user"));
  });

  it("allows persisted_openserp for an OpenSERP-provider offer", () => {
    assert.doesNotThrow(() => assertOpenSerpOriginIsNeverPartnerFacing(true, "persisted_openserp"));
  });

  it("allows any origin for a non-OpenSERP offer", () => {
    assert.doesNotThrow(() => assertOpenSerpOriginIsNeverPartnerFacing(false, "partner_api"));
  });

  it("isPersistedOpenSerp() only returns true for persisted_openserp", () => {
    assert.equal(isPersistedOpenSerp("persisted_openserp"), true);
    assert.equal(isPersistedOpenSerp("partner_api"), false);
    assert.equal(isPersistedOpenSerp(null), false);
  });
});

describe("SourceOffer — stable source key", () => {
  it("computes the same identity twice for the same source_offer_key", () => {
    const a = computeSourceOfferIdentity({ sourceName: "mubawab", sourceOfferKey: "8266994", sourceUrl: "https://x" });
    const b = computeSourceOfferIdentity({ sourceName: "mubawab", sourceOfferKey: "8266994", sourceUrl: "https://y" });
    assert.equal(a.key, b.key);
    assert.equal(a.basis, "source_offer_key");
  });

  it("falls back to a canonical URL hash when no source_offer_key exists", () => {
    const a = computeSourceOfferIdentity({ sourceName: "mubawab", sourceOfferKey: null, sourceUrl: "https://mubawab.ma/a/1?utm_source=x" });
    const b = computeSourceOfferIdentity({ sourceName: "mubawab", sourceOfferKey: null, sourceUrl: "https://mubawab.ma/a/1" });
    assert.equal(a.key, b.key, "tracking params must not change the identity");
    assert.equal(a.basis, "canonical_url_hash");
  });
});

describe("SourceOffer — no grouping by text alone", () => {
  it("validateSourceOffer never accepts a valid price without a positive displayed_price", () => {
    const result = validateSourceOffer({
      source_name: "mubawab",
      listing_url: "https://mubawab.ma/a/1",
      price_status: "valid",
      displayed_price: 0,
    });
    assert.equal(result.valid, false);
  });

  it("validateSourceOffer rejects an unknown origin_type", () => {
    const result = validateSourceOffer({
      source_name: "mubawab",
      listing_url: "https://mubawab.ma/a/1",
      origin_type: "similarity_match",
    });
    assert.equal(result.valid, false);
  });
});
