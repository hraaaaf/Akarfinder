import assert from "node:assert/strict";
import test from "node:test";
import {
  compareThinIndexEligibility,
  isThinIndexRowDisplayEligible,
  type ThinIndexServingPolicyRow,
} from "../../../lib/search-gateway/odm-07-serving-policy";

function row(overrides: Partial<ThinIndexServingPolicyRow> = {}): ThinIndexServingPolicyRow {
  return {
    canonical_url: "https://example.ma/annonce/1",
    seed_provider: "serper_search",
    freshness_status: "fresh_confirmed",
    quality_tier: "Q2_comparable",
    display_eligibility: "eligible_primary",
    ranking_quality_boost: 0.2,
    relevance_rank: 0.5,
    updated_at: "2026-07-25T00:00:00.000Z",
    seed_id: "00000000-0000-0000-0000-000000000001",
    ...overrides,
  };
}

test("ODM-07 rejects unsupported provider and ineligible rows", () => {
  assert.equal(isThinIndexRowDisplayEligible(row()), true);
  assert.equal(isThinIndexRowDisplayEligible(row({ seed_provider: "unknown" })), false);
  assert.equal(isThinIndexRowDisplayEligible(row({ freshness_status: "rejected" })), false);
  assert.equal(isThinIndexRowDisplayEligible(row({ display_eligibility: "ineligible" })), false);
});

test("ODM-07 primary results sort before secondary results", () => {
  const secondary = row({
    display_eligibility: "eligible_secondary",
    quality_tier: "Q1_contextual",
    relevance_rank: 0.9,
  });
  const primary = row({ relevance_rank: 0.4 });
  assert.ok(compareThinIndexEligibility(primary, secondary) < 0);
});

test("ODM-07 ranking boost is bounded", () => {
  assert.equal(isThinIndexRowDisplayEligible(row({ ranking_quality_boost: -0.01 })), false);
  assert.equal(isThinIndexRowDisplayEligible(row({ ranking_quality_boost: 0.36 })), false);
});
