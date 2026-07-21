import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptPartnerListing, validatePropertyPublication } from "../../../lib/property-schema/index.js";
import { FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT } from "../../../lib/partners/partner-listing-examples.js";
import type { PartnerListingStandard } from "../../../lib/partners/partner-listing-types.js";

const NOW = "2026-07-21T18:10:00.000Z";

describe("#10G partner adapter safety", () => {
  it("preserves explicit partner offer identity and price range without inventing an exact price", () => {
    const input: PartnerListingStandard = {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      price_amount: undefined,
      price_display_mode: "range",
      price_range_min: 1_200_000,
      price_range_max: 1_450_000,
    };
    const adapted = adaptPartnerListing(input, {
      property_id: "property-range",
      offer_id: "offer-range",
      source_id: "agency-1",
      external_offer_id: "AG-EXT-77",
      source_url: "https://agency.example.ma/property/77",
      now: NOW,
    });
    const offer = adapted.offers[0];
    assert.equal(offer.external_offer_id, "AG-EXT-77");
    assert.equal(offer.canonical_source_url, "https://agency.example.ma/property/77");
    assert.equal(offer.price_amount.value, null);
    assert.equal(offer.price_range_min?.value, 1_200_000);
    assert.equal(offer.price_range_max?.value, 1_450_000);
    assert.equal(offer.price_status, "ambiguous");
  });

  it("never turns a sell_request lead record into a publishable property offer", () => {
    const input: PartnerListingStandard = {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      transaction_type: "sell_request",
    };
    const adapted = adaptPartnerListing(input, {
      property_id: "property-sell-request",
      offer_id: "offer-sell-request",
      source_id: "agency-1",
      external_offer_id: "SELL-1",
      now: NOW,
    });
    const offer = adapted.offers[0];
    assert.equal(offer.transaction_type, "sale");
    assert.equal(offer.compliance_status, "restricted");
    assert.equal(offer.offer_status, "inactive");
    assert.equal(validatePropertyPublication(adapted, offer).valid, false);
  });

  it("keeps project-level partner records out of the property publication lane", () => {
    const input: PartnerListingStandard = {
      ...FICTIONAL_AGENCY_DEMO_RABAT_APARTMENT,
      property_type: "project",
      transaction_type: "new",
    };
    const adapted = adaptPartnerListing(input, {
      property_id: "project-placeholder",
      offer_id: "project-offer-placeholder",
      source_id: "promoter-1",
      external_offer_id: "PROJECT-1",
      now: NOW,
    });
    assert.equal(adapted.facts.classification.property_type.value, "unknown");
    assert.equal(adapted.facts.classification.market_segment.value, "new_build");
    assert.equal(adapted.offers[0].compliance_status, "restricted");
    assert.equal(validatePropertyPublication(adapted, adapted.offers[0]).valid, false);
  });
});
