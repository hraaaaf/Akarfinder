import assert from "node:assert/strict";
import test from "node:test";

import {
  ODM_PUBLIC_CANARY_MAX_PERCENT,
  mapOdmPageToSearchResult,
  readPublicCanaryPercent,
  shouldServeOdmPublicCanary,
} from "../../../lib/odm/odm-public-canary";

test("fails closed unless all approval flags are present", () => {
  assert.equal(shouldServeOdmPublicCanary("x", {}), false);
  assert.equal(shouldServeOdmPublicCanary("x", { ODM_PUBLIC_CANARY_ENABLED: "true", ODM_PUBLIC_CANARY_PERCENT: "25" }), false);
});

test("accepts the approved fifty percent ceiling and rejects values above it", () => {
  assert.equal(ODM_PUBLIC_CANARY_MAX_PERCENT, 50);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "10" }), 10);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "25" }), 25);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "50" }), 50);
  assert.equal(readPublicCanaryPercent({ ODM_PUBLIC_CANARY_PERCENT: "50.01" }), 0);
});

test("stop flag overrides approval at the fifty percent ceiling", () => {
  assert.equal(shouldServeOdmPublicCanary("x", {
    ODM_PUBLIC_CANARY_ENABLED: "true",
    ODM_PUBLIC_CANARY_APPROVED: "true",
    ODM_PUBLIC_CANARY_STOP: "true",
    ODM_PUBLIC_CANARY_PERCENT: "50",
  }), false);
});

test("ODM adapter preserves source-only publication boundaries", () => {
  const result = mapOdmPageToSearchResult({
    results_count: 1,
    total_count: 1,
    has_more: false,
    next_cursor: null,
    results: [{
      id: "r1", title: "Appartement test", original_url: "https://example.com/a",
      display_url: "example.com", source_id: "thin", source_name: "Example", domain: "example.com",
      result_origin: "public_sitemap", search_result_display_mode: "thin_indexed_result",
      source_badge: "public_indexed", production_allowed: true, can_show_result: true,
      can_show_thumbnail: false, can_show_contact: false, can_show_gallery: false,
      can_cache_thumbnail: false, can_download_thumbnail: false, primary_cta: "view_original",
      primary_cta_label: "Voir", result_attribution_label: "Source", thumbnail_risk_accepted: false,
      normalized_city: "Rabat", normalized_property_type: "appartement", normalized_intent: "sale",
      normalized_price_mad: 1000000, normalized_surface_m2: 100, quality_score: 80,
    }],
  }, { limit: 50, offset: 0 });
  assert.equal(result.listings.length, 1);
  assert.equal(result.listings[0].source_access_level, "indexed_only");
  assert.equal(result.listings[0].image_permission_status, "source_link_only");
  assert.equal(result.listings[0].can_show_contact, false);
});
