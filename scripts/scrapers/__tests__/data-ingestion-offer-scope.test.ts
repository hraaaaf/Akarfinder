import test from "node:test";
import assert from "node:assert/strict";

import { adaptCollectionListing, inferCollectionOfferScope, type CollectionListing } from "../../../data-ingestion/collection-adapter";

function listing(overrides: Partial<CollectionListing> = {}): CollectionListing {
  return {
    akar_id: null,
    source: {
      name: "mubawab",
      source_id: "8322103",
      url: "https://www.mubawab.ma/fr/a/8322103/test",
      first_seen_at: "2026-09-04T00:00:00.000Z",
      last_seen_at: "2026-09-04T00:00:00.000Z",
      scraped_at: "2026-09-04T00:00:00.000Z",
      content_hash: "hash",
    },
    status: "active",
    transaction: "rent",
    property_type: "apartment",
    title: "Chambre meublée de 25 m² pour fille",
    description: "Chambre en colocation dans un appartement de 98 m² et 3 chambres.",
    price: { amount: 2000, currency: "MAD", period: "month", on_request: false },
    surface: { total_m2: 98, habitable_m2: null, built_m2: null, land_m2: null },
    rooms: 3,
    bedrooms: 3,
    bathrooms: 1,
    floor: null,
    location: {
      country: "Morocco",
      region: null,
      city: "Casablanca",
      district: "Roches Noires",
      address_text: "Roches Noires, Casablanca",
      latitude: null,
      longitude: null,
      precision: "neighborhood_centroid",
    },
    features: ["furnished"],
    images: [],
    seller: { name: null, type: "owner", source_profile_url: null },
    provenance: {
      source_type: "portal",
      source_listing_url: "https://www.mubawab.ma/fr/a/8322103/test",
      retrieval_method: "crawl",
    },
    quality: { score: 90, warnings: [] },
    raw: {},
    ...overrides,
  };
}

test("human decision A maps a room rental to apartment property + room offer scope", () => {
  const input = listing();
  assert.equal(inferCollectionOfferScope(input), "room");

  const canonical = adaptCollectionListing(input);
  assert.equal(canonical.facts.classification.property_type.value, "apartment");
  assert.equal(canonical.offers[0].transaction_type, "rent");
  assert.equal(canonical.offers[0].offer_scope, "room");
});

test("ordinary apartment rental remains a whole-property offer", () => {
  const input = listing({
    title: "Appartement meublé à louer à Casablanca",
    description: "Appartement entier de 98 m² avec 3 chambres.",
  });
  assert.equal(inferCollectionOfferScope(input), "whole_property");
  assert.equal(adaptCollectionListing(input).offers[0].offer_scope, "whole_property");
});

test("explicit upstream offer scope overrides text inference", () => {
  const input = listing({ offer_scope: "whole_property" });
  assert.equal(inferCollectionOfferScope(input), "whole_property");
});
