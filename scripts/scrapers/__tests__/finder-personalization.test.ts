import assert from "node:assert/strict";
import test from "node:test";

import type { Listing } from "@/lib/listings/types";
import {
  finderProjectionFromSearchParams,
  rankListingsForFinder,
  scoreListingForFinder,
} from "@/lib/search-profile-v2/listing-personalization";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: overrides.id ?? "1",
    title: overrides.title ?? "Appartement",
    city: overrides.city ?? "Rabat",
    neighborhood: overrides.neighborhood ?? "Agdal",
    price: overrides.price ?? 1_500_000,
    currency: "DH",
    surface_m2: overrides.surface_m2 ?? 100,
    price_per_m2: overrides.price_per_m2 ?? 15_000,
    property_type: overrides.property_type ?? "Appartement",
    transaction_type: overrides.transaction_type ?? "buy",
    bedrooms: overrides.bedrooms ?? 3,
    bathrooms: overrides.bathrooms ?? 2,
    freshness_label: "Récent",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 80,
    is_mre_friendly: false,
    description: overrides.description ?? "",
    image_url: "",
    reliability_explanation: "test",
    ...overrides,
  };
}

test("Finder projection only activates for guided search", () => {
  assert.equal(finderProjectionFromSearchParams(new URLSearchParams("city=Rabat")), null);
  const projection = finderProjectionFromSearchParams(new URLSearchParams("guided=1&city=Rabat&profile_priorities=family_fit"));
  assert.ok(projection);
  assert.equal(projection.enabled, true);
  assert.deepEqual(projection.cities, ["Rabat"]);
  assert.deepEqual(projection.priorities, ["family_fit"]);
});

test("personalized=0 preserves classic order", () => {
  const params = new URLSearchParams("guided=1&city=Rabat&personalized=0");
  const input = [listing({ id: "casa", city: "Casablanca" }), listing({ id: "rabat", city: "Rabat" })];
  assert.deepEqual(rankListingsForFinder(input, params).map((item) => item.id), ["casa", "rabat"]);
});

test("recommended ranking favors explicit Finder city, type and priorities", () => {
  const params = new URLSearchParams(
    "guided=1&profile_cities=Rabat&profile_property_types=Appartement&profile_priorities=family_fit,school_access",
  );
  const family = listing({
    id: "family",
    city: "Rabat",
    property_type: "Appartement",
    description: "Résidence familiale calme proche école avec jardin",
  });
  const other = listing({ id: "other", city: "Casablanca", property_type: "Villa", description: "Villa urbaine" });
  const projection = finderProjectionFromSearchParams(params)!;
  assert.ok(scoreListingForFinder(family, projection) > scoreListingForFinder(other, projection));
  assert.deepEqual(rankListingsForFinder([other, family], params).map((item) => item.id), ["family", "other"]);
});

test("excluded neighborhoods are demoted, never filtered out", () => {
  const params = new URLSearchParams(
    "guided=1&profile_excluded_neighborhoods=Rabat%3AAgdal&profile_cities=Rabat",
  );
  const excluded = listing({ id: "excluded", neighborhood: "Agdal" });
  const allowed = listing({ id: "allowed", neighborhood: "Hay Riad" });
  const ranked = rankListingsForFinder([excluded, allowed], params);
  assert.equal(ranked.length, 2);
  assert.deepEqual(ranked.map((item) => item.id), ["allowed", "excluded"]);
});

test("sensitive context is not parsed from URL projection", () => {
  const projection = finderProjectionFromSearchParams(
    new URLSearchParams("guided=1&children_count=3&anchor=Ecole&remote_work=1&profile_priorities=greenery"),
  )!;
  assert.equal("children_count" in projection, false);
  assert.equal("anchor" in projection, false);
  assert.equal("remote_work" in projection, false);
  assert.deepEqual(projection.priorities, ["greenery"]);
});
