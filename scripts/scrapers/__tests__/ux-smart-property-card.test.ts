import assert from "node:assert/strict";
import test from "node:test";

import type { Listing } from "../../../lib/listings/types";
import {
  buildSmartPropertyCardModel,
  smartCardInventsMarketEvidence,
} from "../../../lib/ux/smart-property-card";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Appartement lumineux",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_850_000,
    currency: "DH",
    surface_m2: 98,
    price_per_m2: 18_878,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Publié récemment",
    source_type: "Source analysée",
    reliability_label: "Informations complètes",
    reliability_score: 80,
    is_mre_friendly: false,
    description: "",
    image_url: "",
    reliability_explanation: "",
    ...overrides,
  };
}

test("smart card exposes only available factual fields", () => {
  const model = buildSmartPropertyCardModel(
    makeListing({ source_name: "Source partenaire" }),
  );

  assert.equal(model.locationLabel, "Casablanca, Maarif");
  assert.equal(model.price, 1_850_000);
  assert.equal(model.pricePerM2, 18_878);
  assert.deepEqual(model.facts, ["98 m²", "2 ch.", "2 sdb"]);
  assert.equal(model.sourceLabel, "Source partenaire");
});

test("certified duplicate group is disclosed without inventing source count", () => {
  const model = buildSmartPropertyCardModel(
    makeListing({ duplicate_group_id: "cluster-42" }),
  );

  assert.equal(model.canonicalStatus, "certified_group");
  assert.match(model.canonicalLabel, /rapprochée/i);
  assert.equal(model.sourceCount, null);
});

test("missing market evidence remains explicitly unavailable", () => {
  const model = buildSmartPropertyCardModel(makeListing());

  assert.equal(model.marketClaim, null);
  assert.equal(model.priceHistory, null);
  assert.equal(smartCardInventsMarketEvidence(model), false);
});

test("missing optional facts are omitted rather than reconstructed", () => {
  const model = buildSmartPropertyCardModel(
    makeListing({ surface_m2: 0, bedrooms: 0, bathrooms: 0, price_per_m2: null }),
  );

  assert.deepEqual(model.facts, []);
  assert.equal(model.pricePerM2, null);
});
