import assert from "node:assert/strict";
import test from "node:test";

import {
  queryNeonListings,
  queryNeonStructuredDistrictTotal,
  type NeonQueryExecutor,
} from "../../../lib/db/neon-listings.js";

function sampleRow(originType = "public") {
  return {
    id: 42,
    canonical_fingerprint: "fp-42",
    title: "Appartement test",
    price_mad: 1250000,
    city: "Rabat",
    district: "Agdal",
    property_type: "apartment",
    transaction_type: "sale",
    surface_m2: 90,
    rooms_count: 3,
    bedrooms_count: 2,
    bathrooms_count: 2,
    description_snippet: "Test",
    images_count: 5,
    thumbnail_url: "https://example.com/image.jpg",
    seller_name: "Seller",
    data_completeness_score: 88,
    field_confidence: { price: 0.9 },
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-20T00:00:00Z",
    duplicate_group_id: null,
    duplicate_score: null,
    reliability_score: 91,
    reliability_badge: "high",
    reliability_reasons: ["source"],
    built_surface_m2: 88,
    plot_surface_m2: null,
    condition: "good",
    property_age_range: null,
    orientation: null,
    floor_type: null,
    floors_count: null,
    garden_m2: null,
    terrace_m2: 8,
    garage_spaces: 1,
    has_pool: false,
    has_concierge: true,
    has_moroccan_living_room: false,
    has_european_living_room: true,
    has_equipped_kitchen: true,
    premium_features: ["terrace"],
    listing_sources: [
      {
        id: 7,
        origin_type: originType,
        source_name: "source",
        listing_url: "https://example.com/listing/42",
        source_url: "https://example.com",
        is_active: true,
        first_seen_at: "2026-09-01T00:00:00Z",
      },
    ],
  };
}

test("Neon listing read path parameterizes filters and normalizes Postgres values", async () => {
  const previousFlag = process.env.MARKET_INDEX_READ_ENABLED;
  delete process.env.MARKET_INDEX_READ_ENABLED;

  const calls: Array<{ text: string; params: readonly unknown[] }> = [];
  let call = 0;

  const executor: NeonQueryExecutor = {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      calls.push({ text, params });
      call += 1;
      if (call === 1) return [{ total: 1 }] as unknown as T[];
      return [sampleRow()] as unknown as T[];
    },
  };

  try {
    const result = await queryNeonListings(
      {
        city: "Rabat",
        property_type: "Appartement",
        transaction_type: "achat",
        min_price: 1000000,
        bedrooms: 2,
        limit: 25,
        offset: 5,
      },
      executor,
    );

    assert.equal(result.total, 1);
    assert.equal(result.listings.length, 1);
    assert.equal(result.listings[0].field_confidence, JSON.stringify({ price: 0.9 }));
    assert.equal(result.listings[0].reliability_reasons, JSON.stringify(["source"]));
    assert.equal(result.listings[0].premium_features, JSON.stringify(["terrace"]));
    assert.equal(result.listings[0].has_concierge, 1);
    assert.equal(result.listings[0].has_pool, 0);
    assert.equal(result.listings[0].source_name, "source");

    assert.match(calls[0].text, /pl\.city = \$1/);
    assert.match(calls[0].text, /pl\.property_type = \$2/);
    assert.match(calls[0].text, /pl\.transaction_type = \$3/);
    assert.deepEqual(calls[0].params, ["Rabat", "apartment", "sale", 1000000, 2]);

    assert.match(calls[1].text, /jsonb_agg/);
    assert.match(calls[1].text, /LIMIT \$6 OFFSET \$7/);
    assert.deepEqual(calls[1].params, [
      "Rabat",
      "apartment",
      "sale",
      1000000,
      2,
      25,
      5,
    ]);
  } finally {
    if (previousFlag == null) delete process.env.MARKET_INDEX_READ_ENABLED;
    else process.env.MARKET_INDEX_READ_ENABLED = previousFlag;
  }
});

test("Neon listing read path preserves verified Market Index source resolution", async () => {
  const previousFlag = process.env.MARKET_INDEX_READ_ENABLED;
  process.env.MARKET_INDEX_READ_ENABLED = "true";

  const clusterId = "00000000-0000-4000-8000-000000000042";
  const calls: string[] = [];

  const executor: NeonQueryExecutor = {
    async query<T>(text: string): Promise<T[]> {
      calls.push(text);
      if (text.includes("COUNT(*)::int")) {
        return [{ total: 1 }] as unknown as T[];
      }
      if (text.includes("FROM property_clusters")) {
        return [{
          id: clusterId,
          cluster_origin: "legacy_one_to_one_projection",
          legacy_property_listing_id: 42,
        }] as unknown as T[];
      }
      if (text.includes("FROM property_cluster_members")) {
        return [{
          property_cluster_id: clusterId,
          source_offer_id: 7,
        }] as unknown as T[];
      }
      if (text.includes("FROM property_listings pl")) {
        return [sampleRow("persisted_openserp")] as unknown as T[];
      }
      throw new Error(`unexpected query: ${text}`);
    },
  };

  try {
    const result = await queryNeonListings({ limit: 1 }, executor);
    assert.equal(result.listings[0].source_name, "source");
    assert.equal(result.listings[0].origin_type, "persisted_openserp");
    assert.ok(calls.some((text) => text.includes("FROM property_clusters")));
    assert.ok(calls.some((text) => text.includes("FROM property_cluster_members")));
  } finally {
    if (previousFlag == null) delete process.env.MARKET_INDEX_READ_ENABLED;
    else process.env.MARKET_INDEX_READ_ENABLED = previousFlag;
  }
});

test("Neon district total preserves structured filters and city aliases", async () => {
  const calls: Array<{ text: string; params: readonly unknown[] }> = [];
  const executor: NeonQueryExecutor = {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<T[]> {
      calls.push({ text, params });
      return [{ total: 7 }] as unknown as T[];
    },
  };

  const total = await queryNeonStructuredDistrictTotal(
    {
      cityVariants: ["Temara", "Témara"],
      district: "Harhoura",
      property_type: "Appartement",
      transaction_type: "achat",
      min_price: 500000,
      max_surface: 150,
    },
    executor,
  );

  assert.equal(total, 7);
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /pl\.district = \$1/);
  assert.match(calls[0].text, /pl\.city = ANY\(\$2::text\[\]\)/);
  assert.match(calls[0].text, /pl\.property_type = \$3/);
  assert.match(calls[0].text, /pl\.transaction_type = \$4/);
  assert.match(calls[0].text, /pl\.price_mad >= \$5/);
  assert.match(calls[0].text, /pl\.surface_m2 <= \$6/);
  assert.deepEqual(calls[0].params, [
    "Harhoura",
    ["Temara", "Témara"],
    "apartment",
    "sale",
    500000,
    150,
  ]);
});
