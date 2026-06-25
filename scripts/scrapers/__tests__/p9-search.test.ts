import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { GET } from "../../../app/api/search/route.js";
import { mapListingToTypesenseDocument } from "../../../lib/search/mapping.js";
import {
  getSearchProvider,
  isTypesenseConfigured,
} from "../../../lib/search/provider.js";
import { searchListings } from "../../../lib/search/index.js";
import type { Listing } from "../../../lib/listings/types.js";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withEnvAsync<T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const envKeys = [
  "SEARCH_PROVIDER",
  "TYPESENSE_HOST",
  "TYPESENSE_PORT",
  "TYPESENSE_PROTOCOL",
  "TYPESENSE_API_KEY",
  "TYPESENSE_COLLECTION",
];

const savedEnv: Record<string, string | undefined> = {};

before(() => {
  for (const key of envKeys) savedEnv[key] = process.env[key];
});

after(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function fakeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "140",
    title: "Superbe Appartement Meuble Rte Ain Chkef",
    city: "Fes",
    neighborhood: "",
    price: 475_000,
    price_mad: 475_000,
    currency: "DH",
    surface_m2: 79,
    price_per_m2: 6013,
    property_type: "Appartement",
    transaction_type: "buy",
    bedrooms: 2,
    bathrooms: 1,
    bedrooms_count: 2,
    bathrooms_count: 1,
    freshness_label: "Mise a jour recente",
    source_type: "Source analysÃ©e",
    reliability_label: "Ã€ vÃ©rifier",
    reliability_score: 75,
    is_mre_friendly: false,
    description: "Appartement avec terrasse",
    image_url: "",
    reliability_explanation: "Score indicatif",
    data_completeness_score: 75,
    duplicate_score: 0,
    source_name: "Mubawab",
    terrace_m2: 19,
    property_age_range: "5-10 ans",
    premium_features: ["Terrasse 19 mÂ²"],
    ...overrides,
  };
}

describe("P9A - search provider", () => {
  test("database is the default search provider", () => {
    withEnv({ SEARCH_PROVIDER: undefined }, () => {
      assert.equal(getSearchProvider(), "database");
    });
  });

  test("typesense provider is selected when SEARCH_PROVIDER=typesense", () => {
    withEnv({ SEARCH_PROVIDER: "typesense" }, () => {
      assert.equal(getSearchProvider(), "typesense");
    });
  });

  test("Typesense is configured only when all server env vars are present", () => {
    withEnv(
      {
        TYPESENSE_HOST: "localhost",
        TYPESENSE_PORT: "8108",
        TYPESENSE_PROTOCOL: "http",
        TYPESENSE_API_KEY: "secret-test-key",
        TYPESENSE_COLLECTION: "listings",
      },
      () => {
        assert.equal(isTypesenseConfigured(), true);
      }
    );
  });

  test("Typesense is not configured when env is incomplete", () => {
    withEnv(
      {
        TYPESENSE_HOST: "localhost",
        TYPESENSE_PORT: undefined,
        TYPESENSE_PROTOCOL: "http",
        TYPESENSE_API_KEY: "secret-test-key",
        TYPESENSE_COLLECTION: "listings",
      },
      () => {
        assert.equal(isTypesenseConfigured(), false);
      }
    );
  });
});

describe("P9A - mapping", () => {
  test("maps Listing to Typesense document without source URL or secrets", () => {
    const doc = mapListingToTypesenseDocument(fakeListing());

    assert.equal(doc.id, "140");
    assert.equal(doc.city, "Fes");
    assert.equal(doc.price_mad, 475_000);
    assert.equal(doc.reliability_score, 75);
    assert.equal(doc.source_site, "Mubawab");
    assert.equal(doc.terrace_m2, 19);
    assert.equal(doc.property_age_range, "5-10 ans");
    assert.deepEqual(doc.premium_features, ["Terrasse 19 mÂ²"]);
    assert.equal("listing_url" in doc, false);
    assert.equal(JSON.stringify(doc).includes("secret-test-key"), false);
  });
});

describe("P9A - fallback and API payload", () => {
  test("falls back to database when SEARCH_PROVIDER=typesense but env is absent", async () => {
    const result = await withEnvAsync(
      {
        SEARCH_PROVIDER: "typesense",
        TYPESENSE_HOST: undefined,
        TYPESENSE_PORT: undefined,
        TYPESENSE_PROTOCOL: undefined,
        TYPESENSE_API_KEY: undefined,
        TYPESENSE_COLLECTION: undefined,
      },
      () => searchListings({ limit: 1 })
    );

    assert.equal(result.source, "database_fallback");
    assert.equal(Array.isArray(result.listings), true);
    assert.equal(typeof result.total, "number");
  });

  test("GET /api/search returns a stable payload and does not expose Typesense secrets", async () => {
    const response = await withEnvAsync(
      {
        SEARCH_PROVIDER: "typesense",
        TYPESENSE_HOST: undefined,
        TYPESENSE_PORT: undefined,
        TYPESENSE_PROTOCOL: undefined,
        TYPESENSE_API_KEY: "secret-test-key",
        TYPESENSE_COLLECTION: undefined,
      },
      () =>
        GET(
          {
            nextUrl: new URL(
              "http://localhost:3000/api/search?q=Fes&minReliabilityScore=50&limit=2"
            ),
          } as Parameters<typeof GET>[0]
        )
    );

    const payload = await response.json();
    const serialized = JSON.stringify(payload);
    assert.equal(Array.isArray(payload.listings), true);
    assert.equal(typeof payload.total, "number");
    assert.equal(payload.limit, 2);
    assert.equal(payload.offset, 0);
    assert.ok(["database", "database_fallback", "typesense"].includes(payload.source));
    assert.equal(typeof payload.generated_at, "string");
    assert.equal(serialized.includes("secret-test-key"), false);
  });
});

describe("P9B - /api/search query param routing", () => {
  test("sort=price_asc returns listings in non-decreasing price order", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:3000/api/search?sort=price_asc&limit=10"),
    } as Parameters<typeof GET>[0]);
    const payload = await response.json();
    assert.equal(Array.isArray(payload.listings), true);
    const prices = (payload.listings as Listing[]).map((l) => l.price);
    for (let i = 1; i < prices.length; i++) {
      assert.ok(
        prices[i] >= prices[i - 1],
        `Price[${i}]=${prices[i]} should be >= Price[${i - 1}]=${prices[i - 1]}`
      );
    }
  });

  test("transaction_type=buy returns only buy listings", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:3000/api/search?transaction_type=buy&limit=20"),
    } as Parameters<typeof GET>[0]);
    const payload = await response.json();
    assert.equal(Array.isArray(payload.listings), true);
    for (const listing of payload.listings as Listing[]) {
      assert.equal(listing.transaction_type, "buy");
    }
  });

  test("minReliabilityScore=80 returns only listings at or above threshold", async () => {
    const response = await GET({
      nextUrl: new URL("http://localhost:3000/api/search?minReliabilityScore=80&limit=20"),
    } as Parameters<typeof GET>[0]);
    const payload = await response.json();
    assert.equal(Array.isArray(payload.listings), true);
    for (const listing of payload.listings as Listing[]) {
      assert.ok(
        (listing.reliability_score ?? 0) >= 80,
        `reliability_score ${listing.reliability_score} should be >= 80`
      );
    }
  });
});
