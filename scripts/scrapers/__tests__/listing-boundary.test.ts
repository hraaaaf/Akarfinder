// REAL-VISUALS-AND-LISTING-BOUNDARY-1
// Unit tests for the partner vs. third-party-indexed listing boundary.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  canHaveInternalDetail,
  isPartnerAuthorized,
  canShowContactActions,
} from "../../../lib/listings/listing-boundary.js";
import type { Listing } from "../../../lib/listings/types.js";

function baseListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "1",
    title: "Appartement test",
    city: "Casablanca",
    neighborhood: "",
    price: 900000,
    currency: "DH",
    surface_m2: 70,
    price_per_m2: 12857,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    freshness_label: "Mise à jour récente",
    source_type: "Source analysée",
    reliability_label: "À vérifier",
    reliability_score: 70,
    is_mre_friendly: false,
    description: "",
    image_url: "",
    reliability_explanation: "",
    ...overrides,
  } as Listing;
}

describe("canHaveInternalDetail", () => {
  it("returns false for display_depth=limited_preview (Mubawab/Agenz/LogicImmo)", () => {
    assert.equal(canHaveInternalDetail(baseListing({ display_depth: "limited_preview" })), false);
  });

  it("returns false for display_depth=market_signal_only (Avito)", () => {
    assert.equal(canHaveInternalDetail(baseListing({ display_depth: "market_signal_only" })), false);
  });

  it("returns true for display_depth=full", () => {
    assert.equal(canHaveInternalDetail(baseListing({ display_depth: "full" })), true);
  });

  it("returns true when display_depth is absent (partner / own inventory / unknown source — no regression)", () => {
    assert.equal(canHaveInternalDetail(baseListing({ display_depth: undefined })), true);
  });

  it("isPartnerAuthorized mirrors canHaveInternalDetail", () => {
    const l1 = baseListing({ display_depth: "limited_preview" });
    const l2 = baseListing({ display_depth: undefined });
    assert.equal(isPartnerAuthorized(l1), canHaveInternalDetail(l1));
    assert.equal(isPartnerAuthorized(l2), canHaveInternalDetail(l2));
  });
});

describe("canShowContactActions", () => {
  it("returns false when can_show_contact is explicitly false (Mubawab, Avito)", () => {
    assert.equal(canShowContactActions(baseListing({ can_show_contact: false })), false);
  });

  it("returns true when can_show_contact is explicitly true (default/partner path)", () => {
    assert.equal(canShowContactActions(baseListing({ can_show_contact: true })), true);
  });

  it("returns true when can_show_contact is absent (mock listings — no regression)", () => {
    assert.equal(canShowContactActions(baseListing({ can_show_contact: undefined })), true);
  });
});
