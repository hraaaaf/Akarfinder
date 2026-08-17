import assert from "node:assert/strict";
import test from "node:test";

import type { Listing } from "../../../lib/listings/types";
import { buildProjectFitModel } from "../../../lib/property-detail/project-fit";
import { createEmptyDynamicSearchProfileV2 } from "../../../lib/search-profile-v2/types";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "ann-l12-1",
    title: "Appartement Hay Riad",
    city: "Rabat",
    neighborhood: "Hay Riad",
    price: 1_800_000,
    currency: "DH",
    surface_m2: 110,
    price_per_m2: 16_364,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 3,
    bathrooms: 2,
    freshness_label: "Récent",
    source_type: "Agence",
    reliability_label: "Informations complètes",
    reliability_score: 90,
    is_mre_friendly: true,
    description: "QA",
    image_url: "",
    reliability_explanation: "QA",
    garage_spaces: 1,
    premium_features: ["terrasse"],
    ...overrides,
  };
}

function explicitProfile() {
  const profile = createEmptyDynamicSearchProfileV2("2026-08-17T10:00:00.000Z");
  profile.objective = { value: "buy", source: "explicit", confidence: "high", updated_at: profile.updated_at };
  profile.location.preferred_cities = ["Rabat"];
  profile.budget.purchase_max_mad = 2_000_000;
  profile.property.property_types = ["Appartement"];
  profile.property.min_surface_m2 = 100;
  profile.property.min_bedrooms = 3;
  profile.property.required_features = ["parking", "elevator"];
  return profile;
}

test("ANN-L12 hides fit when no explicit project profile is supplied", () => {
  const model = buildProjectFitModel(null, listing());
  assert.equal(model.available, false);
  assert.equal(model.score, null);
  assert.deepEqual(model.reasons, []);
});

test("ANN-L12 scores only evaluated deterministic dimensions", () => {
  const model = buildProjectFitModel(explicitProfile(), listing());
  assert.equal(model.available, true);
  assert.equal(model.evaluatedCount, 6);
  assert.equal(model.matchedCount, 6);
  assert.equal(model.mismatchCount, 0);
  assert.equal(model.score, 100);
  assert.equal(model.reasons.find((item) => item.label === "Ascenseur")?.status, "unknown");
});

test("ANN-L12 exposes mismatch reasons instead of hiding them", () => {
  const model = buildProjectFitModel(explicitProfile(), listing({ city: "Casablanca", price: 2_300_000, surface_m2: 85, bedrooms: 2, property_type: "Villa", garage_spaces: 0 }));
  assert.equal(model.evaluatedCount, 6);
  assert.equal(model.matchedCount, 0);
  assert.equal(model.mismatchCount, 6);
  assert.equal(model.score, 0);
  assert.ok(model.reasons.some((item) => item.status === "mismatch" && item.key === "budget"));
  assert.ok(model.reasons.some((item) => item.status === "mismatch" && item.key === "surface"));
});

test("ANN-L12 does not publish a global score with fewer than two evaluable dimensions", () => {
  const profile = createEmptyDynamicSearchProfileV2();
  profile.property.required_features = ["elevator"];
  profile.property.min_surface_m2 = 100;
  const model = buildProjectFitModel(profile, listing({ surface_m2: 120 }));
  assert.equal(model.evaluatedCount, 1);
  assert.equal(model.score, null);
  assert.equal(model.reasons.find((item) => item.label === "Ascenseur")?.status, "unknown");
});

test("ANN-L12 applies only the explicit budget flexibility stored in the profile", () => {
  const profile = explicitProfile();
  profile.budget.budget_flex_pct = 10;
  const inside = buildProjectFitModel(profile, listing({ price: 2_150_000 }));
  const outside = buildProjectFitModel(profile, listing({ price: 2_250_000 }));
  assert.equal(inside.reasons.find((item) => item.key === "budget")?.status, "match");
  assert.equal(outside.reasons.find((item) => item.key === "budget")?.status, "mismatch");
});
