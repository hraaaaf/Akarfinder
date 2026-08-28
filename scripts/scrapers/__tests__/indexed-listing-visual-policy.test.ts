import assert from "node:assert/strict";
import test from "node:test";
import type { Listing } from "../../../lib/listings/types";
import { shouldUseIndexedTransactionArtwork } from "../../../lib/ux/indexed-listing-visual-policy";

function listing(overrides: Partial<Listing>): Listing {
  return {
    id: "listing-1",
    title: "Appartement à Casablanca",
    city: "Casablanca",
    neighborhood: "Maarif",
    price: 1_500_000,
    currency: "DH",
    surface_m2: 100,
    price_per_m2: 15_000,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: 0.5,
    is_mre_friendly: false,
    description: "",
    image_url: "",
    reliability_explanation: "",
    ...overrides,
  } as Listing;
}

test("public indexed inventory always uses the AkarFinder no-photo artwork lane", () => {
  assert.equal(
    shouldUseIndexedTransactionArtwork(
      listing({
        source_name: "Mubawab",
        source_access_level: "indexed_only",
        image_permission_status: "unknown",
      }),
    ),
    true,
  );
});

test("partner and first-party inventory keep their existing authorized image lane", () => {
  assert.equal(
    shouldUseIndexedTransactionArtwork(
      listing({
        source_type: "Promoteur",
        source_access_level: "partner_full",
        image_permission_status: "allowed",
      }),
    ),
    false,
  );

  assert.equal(
    shouldUseIndexedTransactionArtwork(
      listing({
        source_type: "Agence",
        source_access_level: "partner_full",
        image_permission_status: "allowed",
      }),
    ),
    false,
  );

  assert.equal(
    shouldUseIndexedTransactionArtwork(
      listing({
        source_name: "AkarFinder",
        acquisition_channel: "first_party_user",
        image_permission_status: "allowed",
      }),
    ),
    false,
  );
});
