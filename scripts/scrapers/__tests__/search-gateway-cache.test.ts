import assert from "node:assert/strict";
import test from "node:test";

import { buildSearchGatewayCacheContext, buildSearchGatewayCacheKey } from "../../../lib/search-gateway-cache/cache-key.js";
import { executeSearchGatewayWithCache } from "../../../lib/search-gateway-cache/search-gateway-cache.js";
import { sanitizeSearchGatewayResponseForCache } from "../../../lib/search-gateway-cache/public-safety.js";
import { NoopSearchGatewayCacheStore } from "../../../lib/search-gateway-cache/noop-cache-store.js";
import { SupabaseSearchGatewayCacheStore } from "../../../lib/search-gateway-cache/supabase-cache-store.js";
import type {
  SearchGatewayCacheEntry,
  SearchGatewayCacheLookupResult,
  SearchGatewayCacheStore,
} from "../../../lib/search-gateway-cache/types.js";
import type { SearchGatewayRouteResponse } from "../../../lib/search-gateway/search-gateway-types.js";

function makeResponse(overrides: Partial<SearchGatewayRouteResponse> = {}): SearchGatewayRouteResponse {
  return {
    ok: true,
    degraded: false,
    provider: "serper",
    sources_queried: ["avito_serper"],
    results_count: 1,
    results: [
      {
        id: "gateway_1",
        title: "Appartement Casablanca",
        snippet:
          "Bel appartement a vendre a Casablanca avec numero 0612345678 et galerie complete a confirmer.",
        original_url: "https://avito.ma/fr/test",
        display_url: "avito.ma/fr/test",
        source_id: "avito_serper",
        source_name: "Avito",
        domain: "avito.ma",
        result_origin: "search_api",
        search_result_display_mode: "thin_indexed_result",
        source_badge: "external_indexed",
        production_allowed: true,
        can_show_result: true,
        can_show_thumbnail: true,
        can_show_contact: false,
        can_show_gallery: false,
        can_cache_thumbnail: false,
        can_download_thumbnail: false,
        primary_cta: "view_original",
        primary_cta_label: "Voir sur Avito",
        result_attribution_label: "Resultat web externe",
        thumbnail_url: "https://images.example.test/1.jpg",
        thumbnail_provider_name: "Serper",
        thumbnail_risk_accepted: true,
      },
    ],
    ...overrides,
  };
}

class MemoryCacheStore implements SearchGatewayCacheStore {
  constructor(private fresh: SearchGatewayCacheLookupResult, private stale: SearchGatewayCacheLookupResult) {}

  writes: SearchGatewayCacheEntry[] = [];
  hitRecords = 0;

  async readFresh(): Promise<SearchGatewayCacheLookupResult> {
    return this.fresh;
  }

  async readStale(): Promise<SearchGatewayCacheLookupResult> {
    return this.stale;
  }

  async write(entry: SearchGatewayCacheEntry): Promise<void> {
    this.writes.push(entry);
  }

  async recordHit(): Promise<void> {
    this.hitRecords += 1;
  }
}

function makeEntry(overrides: Partial<SearchGatewayCacheEntry> = {}): SearchGatewayCacheEntry {
  const response = sanitizeSearchGatewayResponseForCache(makeResponse());
  return {
    cache_key: "serper:v1:buy:appartement:casablanca:page1:fr-ma:appartement-casablanca",
    query: "appartement casablanca",
    provider: "serper",
    request_hash: "abc123",
    response_json: response,
    result_count: response.results_count,
    created_at: "2026-07-06T10:00:00.000Z",
    expires_at: "2026-07-06T22:00:00.000Z",
    stale_until: "2026-07-13T10:00:00.000Z",
    last_hit_at: null,
    hit_count: 0,
    ...overrides,
  };
}

test("cache key stays stable for identical query context", () => {
  const first = buildSearchGatewayCacheKey({
    provider: "serper",
    query: "Appartement   Casablanca",
    city: "Casablanca",
    property_type: "Appartement",
    transaction_type: "buy",
    page: 1,
    locale: "fr-MA",
  });
  const second = buildSearchGatewayCacheKey({
    provider: "serper",
    query: "appartement casablanca",
    city: "casablanca",
    property_type: "appartement",
    transaction_type: "buy",
    page: 1,
    locale: "fr-ma",
  });

  assert.equal(first, second);
});

test("cache key changes when transaction, type or page changes", () => {
  const base = buildSearchGatewayCacheKey({
    provider: "serper",
    query: "appartement casablanca",
    city: "Casablanca",
    property_type: "Appartement",
    transaction_type: "buy",
    page: 1,
    locale: "fr-MA",
  });

  const rent = buildSearchGatewayCacheKey({
    provider: "serper",
    query: "appartement casablanca",
    city: "Casablanca",
    property_type: "Appartement",
    transaction_type: "rent",
    page: 1,
    locale: "fr-MA",
  });

  const villa = buildSearchGatewayCacheKey({
    provider: "serper",
    query: "appartement casablanca",
    city: "Casablanca",
    property_type: "Villa",
    transaction_type: "buy",
    page: 1,
    locale: "fr-MA",
  });

  const pageTwo = buildSearchGatewayCacheKey({
    provider: "serper",
    query: "appartement casablanca",
    city: "Casablanca",
    property_type: "Appartement",
    transaction_type: "buy",
    page: 2,
    locale: "fr-MA",
  });

  assert.notEqual(base, rent);
  assert.notEqual(base, villa);
  assert.notEqual(base, pageTwo);
});

test("hit avoids provider call", async () => {
  const store = new MemoryCacheStore(
    {
      status: "hit",
      entry: makeEntry(),
      age_seconds: 120,
    },
    { status: "miss" },
  );
  let providerCalls = 0;

  const response = await executeSearchGatewayWithCache({
    cacheContext: buildSearchGatewayCacheContext({
      provider: "serper",
      query: "appartement casablanca",
    }),
    cacheStore: store,
    executeFresh: async () => {
      providerCalls += 1;
      return { response: makeResponse() };
    },
    now: new Date("2026-07-06T11:00:00.000Z"),
  });

  assert.equal(providerCalls, 0);
  assert.equal(response.cache?.status, "hit");
});

test("miss calls provider and saves fresh results", async () => {
  const store = new MemoryCacheStore({ status: "miss" }, { status: "miss" });
  let providerCalls = 0;

  const response = await executeSearchGatewayWithCache({
    cacheContext: buildSearchGatewayCacheContext({
      provider: "serper",
      query: "appartement casablanca",
      city: "Casablanca",
      property_type: "Appartement",
      transaction_type: "buy",
    }),
    cacheStore: store,
    executeFresh: async () => {
      providerCalls += 1;
      return { response: makeResponse() };
    },
    now: new Date("2026-07-06T11:00:00.000Z"),
  });

  assert.equal(providerCalls, 1);
  assert.equal(response.cache?.status, "miss");
  assert.equal(store.writes.length, 1);
});

test("zero fresh results with stale cache returns stale", async () => {
  const store = new MemoryCacheStore(
    { status: "miss" },
    {
      status: "stale",
      entry: makeEntry({
        expires_at: "2026-07-06T09:00:00.000Z",
      }),
      age_seconds: 7200,
    },
  );

  const response = await executeSearchGatewayWithCache({
    cacheContext: buildSearchGatewayCacheContext({
      provider: "serper",
      query: "appartement casablanca",
    }),
    cacheStore: store,
    executeFresh: async () => ({
      response: makeResponse({ results_count: 0, results: [] }),
      provider_issue_classification: "quota_or_auth_possible",
    }),
    now: new Date("2026-07-06T12:00:00.000Z"),
  });

  assert.equal(response.cache?.status, "stale");
  assert.equal(response.degraded, true);
  assert.equal(response.results_count, 1);
});

test("zero fresh results with no stale returns clean zero response", async () => {
  const store = new MemoryCacheStore({ status: "miss" }, { status: "miss" });

  const response = await executeSearchGatewayWithCache({
    cacheContext: buildSearchGatewayCacheContext({
      provider: "serper",
      query: "terrain fes",
    }),
    cacheStore: store,
    executeFresh: async () => ({
      response: makeResponse({ results_count: 0, results: [] }),
      provider_issue_classification: "zero_results",
    }),
    now: new Date("2026-07-06T12:00:00.000Z"),
  });

  assert.equal(response.cache?.status, "miss");
  assert.equal(response.results_count, 0);
  assert.equal(response.cache?.provider_issue_classification, "zero_results");
});

test("cache sanitization never stores contact, gallery or market price fields", () => {
  const sanitized = sanitizeSearchGatewayResponseForCache(
    makeResponse({
      results: [
        {
          ...makeResponse().results[0],
          can_show_contact: true,
          can_show_gallery: true,
        },
      ],
    }),
  );

  const cached = sanitized.results[0] as Record<string, unknown>;
  assert.equal(sanitized.results[0].can_show_contact, false);
  assert.equal(sanitized.results[0].can_show_gallery, false);
  assert.equal(sanitized.results[0].can_show_thumbnail, false);
  assert.ok(!("thumbnail_url" in cached));
  assert.ok(!("value_low" in cached));
  assert.ok(!("value_median" in cached));
  assert.ok(!("value_high" in cached));
});

test("expired cache is not returned as fresh hit", async () => {
  const store = new SupabaseSearchGatewayCacheStore({
    client: {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: makeEntry({ expires_at: "2026-07-06T09:00:00.000Z" }),
              error: null,
            };
          },
          async upsert() {
            return { error: null };
          },
          update() {
            return this;
          },
        };
      },
    },
  });

  const lookup = await store.readFresh("cache-key", new Date("2026-07-06T12:00:00.000Z"));
  assert.equal(lookup.status, "miss");
});

test("stale cache metadata never presents stale as fresh", async () => {
  const store = new MemoryCacheStore(
    { status: "miss" },
    { status: "stale", entry: makeEntry({ expires_at: "2026-07-06T09:00:00.000Z" }), age_seconds: 1000 },
  );

  const response = await executeSearchGatewayWithCache({
    cacheContext: buildSearchGatewayCacheContext({
      provider: "serper",
      query: "appartement rabat",
    }),
    cacheStore: store,
    executeFresh: async () => ({
      response: makeResponse({ results_count: 0, results: [] }),
      provider_issue_classification: "provider_error",
    }),
    now: new Date("2026-07-06T12:00:00.000Z"),
  });

  assert.equal(response.cache?.status, "stale");
  assert.notEqual(response.cache?.status, "hit");
});

test("noop cache store never crashes when table is unavailable", async () => {
  const store = new NoopSearchGatewayCacheStore("table_missing");
  const fresh = await store.readFresh("cache-key");
  const stale = await store.readStale("cache-key");

  assert.equal(fresh.status, "bypass");
  assert.equal(stale.status, "bypass");
});

test("supabase cache store handles missing table without crashing", async () => {
  const store = new SupabaseSearchGatewayCacheStore({
    client: {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          async maybeSingle() {
            return {
              data: null,
              error: { code: "42P01", message: "relation search_gateway_cache does not exist" },
            };
          },
          async upsert() {
            return { error: null };
          },
          update() {
            return this;
          },
        };
      },
    },
  });

  const fresh = await store.readFresh("cache-key");
  assert.equal(fresh.status, "bypass");
});
