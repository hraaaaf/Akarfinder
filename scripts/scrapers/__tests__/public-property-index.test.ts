import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { GET as getPublicIndexSearchRoute } from "../../../app/api/internal/public-index/search/route.js";
import { createPublicPropertyIndexStore, PUBLIC_PROPERTY_INDEX_FIXTURES } from "../../../lib/public-property-index/index-store.js";
import { assertPublicPropertyIndexRecordSafety, assertPublicPropertyIndexResponseSafety } from "../../../lib/public-property-index/public-safety.js";
import { buildPublicPropertyIndexSearchPlan, clampPublicPropertyIndexLimit } from "../../../lib/public-property-index/search-query.js";
import { searchPublicPropertyIndex, trigramSimilarity } from "../../../lib/public-property-index/fts-search.js";

function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => T): T {
  const snapshot = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    snapshot.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of snapshot.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("public property index fixtures stay public-safe and in target band", () => {
  assert.equal(PUBLIC_PROPERTY_INDEX_FIXTURES.length >= 20, true);
  assert.equal(PUBLIC_PROPERTY_INDEX_FIXTURES.length <= 50, true);

  for (const record of PUBLIC_PROPERTY_INDEX_FIXTURES) {
    assertPublicPropertyIndexRecordSafety(record);
  }

  assertPublicPropertyIndexResponseSafety({
    ok: true,
    source: "public_property_index_poc",
    results_label: "Résultats publics observés",
    results: PUBLIC_PROPERTY_INDEX_FIXTURES.slice(0, 1),
  });
});

test("searchPublicPropertyIndex returns the Casablanca Maarif fixture first", () => {
  const results = searchPublicPropertyIndex(PUBLIC_PROPERTY_INDEX_FIXTURES, {
    q: "appartement casablanca maarif",
    city: "Casablanca",
    neighborhood: "Maarif",
    property_type: "Appartement",
    transaction_type: "buy",
    limit: 10,
  });

  assert.ok(results.length >= 1);
  assert.equal(results[0].id, "casablanca-maarif-1");
  assert.equal(results[0].inferred_city, "Casablanca");
  assert.equal(results[0].inferred_neighborhood, "Maarif");
});

test("searchPublicPropertyIndex tolerates maariff typos through trigram matching", () => {
  const results = searchPublicPropertyIndex(PUBLIC_PROPERTY_INDEX_FIXTURES, {
    q: "maariff appartement casablanca",
    city: "Casablanca",
    neighborhood: "maariff",
    limit: 10,
  });

  assert.ok(results.length >= 1);
  assert.equal(results[0].id, "casablanca-maarif-1");
  assert.equal(results.some((record) => record.inferred_neighborhood === "Maarif"), true);
  assert.ok(trigramSimilarity("maariff", "maarif") > 0.5);
});

test("search query plan clamps limit to 100", () => {
  const plan = buildPublicPropertyIndexSearchPlan({
    q: "appartement casablanca",
    limit: 999,
  });

  assert.equal(plan.limit, 100);
  assert.equal(clampPublicPropertyIndexLimit(999), 100);
  assert.equal(plan.fts_query, "appartement casablanca");
});

test("public property index store is noop by default when the POC is disabled", async () => {
  const store = createPublicPropertyIndexStore({
    env: {},
    seedRecords: PUBLIC_PROPERTY_INDEX_FIXTURES,
  });

  const results = await store.search({
    q: "appartement casablanca maarif",
    city: "Casablanca",
    limit: 5,
  });

  assert.deepEqual(results, []);
});

test("public property index store can search fixtures when the POC flags are enabled", async () => {
  const results = await withEnv(
    {
      PUBLIC_INDEX_POC_ENABLED: "true",
      PUBLIC_INDEX_POC_USE_FIXTURES: "true",
    },
    async () => {
      const store = createPublicPropertyIndexStore({
        env: process.env,
        seedRecords: PUBLIC_PROPERTY_INDEX_FIXTURES,
      });

      return store.search({
        q: "appartement casablanca maarif",
        city: "Casablanca",
        neighborhood: "Maarif",
        limit: 5,
      });
    },
  );

  assert.equal(results.length >= 1, true);
  assert.equal(results[0].id, "casablanca-maarif-1");
});

test("internal public index route returns the expected public-safe payload", async () => {
  const response = await withEnv(
    {
      PUBLIC_INDEX_POC_ENABLED: "true",
      PUBLIC_INDEX_POC_USE_FIXTURES: "true",
    },
    async () =>
      getPublicIndexSearchRoute({
        nextUrl: new URL(
          "https://akarfinder.vercel.app/api/internal/public-index/search?q=appartement%20casablanca%20maarif&city=Casablanca&neighborhood=Maarif&limit=5",
        ),
      } as never),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    source: string;
    results_label: string;
    results: Array<{ id: string }>;
  };

  assert.equal(payload.ok, true);
  assert.equal(payload.source, "public_property_index_poc");
  assert.equal(payload.results_label, "Résultats publics observés");
  assert.ok(payload.results.length >= 1);
  assert.equal(payload.results[0].id, "casablanca-maarif-1");
});

test("migration POC contains pg_trgm, RLS and the FTS vector indexes", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20260709193000_create_public_property_index_poc.sql",
  );
  const migration = readFileSync(migrationPath, "utf8").toLowerCase();

  assert.ok(migration.includes("create extension if not exists pg_trgm"));
  assert.ok(migration.includes("enable row level security"));
  assert.ok(migration.includes("fts_vector"));
  assert.ok(migration.includes("gin_trgm_ops"));
  assert.ok(migration.includes("public_property_index"));
});
