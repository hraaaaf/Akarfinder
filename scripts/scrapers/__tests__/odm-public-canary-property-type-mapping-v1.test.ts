import assert from "node:assert/strict";
import test from "node:test";
import { mapOdmPageToSearchResult } from "../../../lib/odm/odm-public-canary";

function page(normalized_property_type: string) {
  return {
    results: [{
      id: `seed_${normalized_property_type}`,
      title: "Test listing",
      normalized_city: "Casablanca",
      normalized_property_type,
      normalized_intent: "sale",
      normalized_price_mad: 1000000,
      normalized_surface_m2: 100,
      price_per_m2_mad: 10000,
      quality_score: 90,
      display_eligibility_reason: "intelligence_ready",
      snippet: "Test",
      original_url: "https://example.com/listing",
      source_name: "example.com",
      source_badge: "external_indexed",
      result_origin: "search_api",
      search_result_display_mode: "thin_indexed_seed",
      can_show_result: true,
      can_show_thumbnail: false,
      production_allowed: true,
    }],
    total_count: 1,
    has_more: false,
  } as any;
}

for (const [input, expected] of [
  ["apartment", "Appartement"],
  ["land", "Terrain"],
  ["office", "Bureau"],
  ["house", "Maison"],
  ["villa", "Villa"],
] as const) {
  test(`maps canonical ODM property type ${input}`, () => {
    const result = mapOdmPageToSearchResult(page(input), { property_type: input } as any);
    assert.equal(result.listings[0]?.property_type, expected);
  });
}
