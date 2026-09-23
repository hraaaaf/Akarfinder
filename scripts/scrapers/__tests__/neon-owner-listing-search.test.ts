import assert from "node:assert/strict";
import test from "node:test";

import {
  queryNeonOwnerListings,
  type NeonOwnerSearchRow,
} from "../../../lib/seller/neon-owner-listing-search.js";
import type { NeonQueryExecutor } from "../../../lib/db/neon-client.js";

function row(): NeonOwnerSearchRow {
  return {
    representation_id: "00000000-0000-0000-0000-000000000001",
    title: "Appartement · Agdal",
    snippet: "Annonce structurée, vérifiée puis publiée par son propriétaire.",
    normalized_city: "Rabat",
    normalized_property_type: "Appartement",
    normalized_intent: "sale",
    normalized_price_mad: 1200000,
    normalized_surface_m2: 90,
    price_per_m2_mad: 13333.33,
    quality_tier: "Q3_intelligence_ready",
    quality_score: 92,
    display_eligibility: "eligible_primary",
    display_eligibility_reason: "owner_listing_high_quality",
    ranking_quality_boost: 20,
    updated_at: "2026-09-23T00:00:00.000Z",
    total_count: 4,
  };
}

test("Neon owner Search preserves publication eligibility and structured filters", async () => {
  let sql = "";
  let params: readonly unknown[] = [];
  const executor: NeonQueryExecutor = {
    async query<T>(text: string, values: readonly unknown[] = []): Promise<T[]> {
      sql = text;
      params = values;
      return [row()] as unknown as T[];
    },
  };

  const rows = await queryNeonOwnerListings(
    {
      q: "Agdal",
      city: "Rabat",
      propertyType: "Appartement",
      intent: "sale",
      minPrice: 500000,
      maxPrice: 2000000,
      minSurface: 60,
      maxSurface: 140,
      limit: 20,
    },
    executor,
  );

  assert.equal(rows.length, 1);
  assert.deepEqual(params, [
    "Agdal",
    "Rabat",
    "Appartement",
    "sale",
    500000,
    2000000,
    60,
    140,
    20,
  ]);

  for (const token of [
    "r.lifecycle_status = 'live'",
    "r.freshness_status = 'fresh_confirmed'",
    "r.display_eligibility in ('eligible_primary','eligible_secondary')",
    "r.normalized_price_mad >= $5::numeric",
    "r.normalized_surface_m2 >= $7::numeric",
    "e.quality_score desc",
    "e.updated_at desc",
  ]) {
    assert.ok(sql.includes(token), `missing owner Search parity token: ${token}`);
  }
});

test("Neon owner Search normalizes numeric driver values", async () => {
  const executor: NeonQueryExecutor = {
    async query<T>(): Promise<T[]> {
      return [{
        ...row(),
        normalized_price_mad: "1200000",
        normalized_surface_m2: "90",
        price_per_m2_mad: "13333.33",
        quality_score: "92",
        ranking_quality_boost: "20",
        total_count: "4",
      }] as unknown as T[];
    },
  };

  const [result] = await queryNeonOwnerListings({ limit: 20 }, executor);
  assert.equal(result.normalized_price_mad, 1200000);
  assert.equal(result.normalized_surface_m2, 90);
  assert.equal(result.price_per_m2_mad, 13333.33);
  assert.equal(result.quality_score, 92);
  assert.equal(result.ranking_quality_boost, 20);
  assert.equal(result.total_count, 4);
});
