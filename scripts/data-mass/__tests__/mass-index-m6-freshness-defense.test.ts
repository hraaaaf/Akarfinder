import test from "node:test";
import assert from "node:assert/strict";
import { isThinIndexRowDisplayEligible, type ThinIndexServingPolicyRow } from "../../../lib/search-gateway/odm-07-serving-policy";

function row(freshness_status: string): ThinIndexServingPolicyRow {
  return {
    canonical_url: "https://example.ma/annonce/123",
    seed_provider: "public_sitemap",
    freshness_status,
    quality_tier: "A",
    display_eligibility: "eligible_primary",
    ranking_quality_boost: 0.1,
    relevance_rank: 1,
    updated_at: "2026-08-23T00:00:00Z",
    seed_id: "00000000-0000-0000-0000-000000000001",
  };
}

test("M6-C Node serving policy accepts fresh_confirmed", () => {
  assert.equal(isThinIndexRowDisplayEligible(row("fresh_confirmed")), true);
});

test("M6-C Node serving policy rejects seed_only", () => {
  assert.equal(isThinIndexRowDisplayEligible(row("seed_only")), false);
});

test("M6-C Node serving policy rejects non-approved providers", () => {
  assert.equal(isThinIndexRowDisplayEligible({ ...row("fresh_confirmed"), seed_provider: "openserp" }), false);
});
