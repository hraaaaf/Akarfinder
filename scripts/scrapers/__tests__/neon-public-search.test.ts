import assert from "node:assert/strict";
import test from "node:test";

import {
  queryNeonPublicSearch,
  type NeonPublicSearchRow,
} from "../../../lib/search-gateway/neon-public-search.js";
import type { NeonQueryExecutor } from "../../../lib/db/neon-client.js";

function sampleRow(): NeonPublicSearchRow {
  return {
    representation_id: "00000000-0000-0000-0000-000000000001",
    canonical_url: "https://example.com/listing/1",
    source_domain: "example.com",
    seed_provider: "public_sitemap",
    freshness_status: "fresh_confirmed",
    title: "Annonce immobilière · Appartement · Rabat",
    snippet: null,
    normalized_city: "Rabat",
    normalized_property_type: "apartment",
    normalized_intent: "sale",
    normalized_price_mad: null,
    normalized_surface_m2: null,
    price_per_m2_mad: null,
    quality_tier: null,
    quality_score: null,
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "external_minimal_index",
    ranking_quality_boost: 0,
    updated_at: "2026-09-23T00:00:00.000Z",
    lane_weight: 3,
    ranking_score: 0.175,
    total_count: 12,
  };
}

test("Neon ODM query preserves current M7 policy and serving gates", async () => {
  let sql = "";
  let params: readonly unknown[] = [];
  const executor: NeonQueryExecutor = {
    async query<T>(text: string, values: readonly unknown[] = []): Promise<T[]> {
      sql = text;
      params = values;
      return [sampleRow()] as unknown as T[];
    },
  };

  const rows = await queryNeonPublicSearch(
    {
      q: "appartement rabat",
      city: "Rabat",
      propertyType: "Appartement",
      intent: "achat",
      minPrice: 700000,
      maxPrice: 2000000,
      minSurface: 60,
      maxSurface: 180,
      limit: 51,
      afterLane: 1,
      afterRank: 0.4,
      afterUpdatedAt: "2026-09-22T10:00:00.000Z",
      afterRepresentationId: "00000000-0000-0000-0000-000000000099",
    },
    executor,
  );

  assert.equal(rows.length, 1);
  assert.deepEqual(params, [
    "appartement rabat",
    "Rabat",
    "apartment",
    "sale",
    700000,
    2000000,
    60,
    180,
    51,
    1,
    0.4,
    "2026-09-22T10:00:00.000Z",
    "00000000-0000-0000-0000-000000000099",
  ]);

  for (const token of [
    "d.document_kind = 'LISTING'",
    "d.freshness_status = 'fresh_confirmed'",
    "pol.authorization_status = 'authorized_partner'",
    "pol.display_policy = 'canonical_link_only'",
    "pol.policy_effective_at <= now()",
    "pol.policy_expires_at > now()",
    "public.professional_listing_ownership",
    "public.search_business_entitlements",
    "partition by lower(b.canonical_url)",
    "partition by d.business_lane, d.source_domain",
    "c.business_lane > $10::smallint",
    "c.final_score < $11::real",
    "c.updated_at < $12::timestamptz",
    "c.seed_id < $13::uuid",
  ]) {
    assert.ok(sql.includes(token), `missing ODM parity token: ${token}`);
  }
});

test("Neon ODM normalization mirrors portable ODM04 aliases", async () => {
  let params: readonly unknown[] = [];
  const executor: NeonQueryExecutor = {
    async query<T>(_text: string, values: readonly unknown[] = []): Promise<T[]> {
      params = values;
      return [] as T[];
    },
  };

  await queryNeonPublicSearch(
    {
      city: "Témara",
      propertyType: "terrain",
      intent: "vente",
      limit: 10,
    },
    executor,
  );

  assert.equal(params[1], "Témara");
  assert.equal(params[2], "land");
  assert.equal(params[3], "sale");
});

test("Neon ODM numeric result fields are normalized for the existing cursor contract", async () => {
  const executor: NeonQueryExecutor = {
    async query<T>(): Promise<T[]> {
      return [{
        ...sampleRow(),
        ranking_quality_boost: "0.02",
        lane_weight: "2",
        ranking_score: "0.25",
        total_count: "123",
      }] as unknown as T[];
    },
  };

  const [row] = await queryNeonPublicSearch({ limit: 10 }, executor);
  assert.equal(row.ranking_quality_boost, 0.02);
  assert.equal(row.lane_weight, 2);
  assert.equal(row.ranking_score, 0.25);
  assert.equal(row.total_count, 123);
});
