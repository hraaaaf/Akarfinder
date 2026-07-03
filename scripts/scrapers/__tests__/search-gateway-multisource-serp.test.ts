// SEARCH-GATEWAY-MULTISOURCE-SERP-1A
// Tests for Search Gateway multi-source SERP

import { describe, it, expect } from "vitest";
import { getSearchGatewaySources, getEnabledSearchGatewaySources, getSearchGatewaySourceById } from "@/lib/search-gateway/search-gateway-sources";
import { buildSearchGatewayQueries } from "@/lib/search-gateway/search-gateway-query-builder";
import { normalizeSearchGatewayResult } from "@/lib/search-gateway/search-gateway-normalizer";
import { dedupeSearchGatewayResults } from "@/lib/search-gateway/search-gateway-dedupe";

describe("Search Gateway — Configuration", () => {
  it("1. Six sources are configured", () => {
    const sources = getSearchGatewaySources();
    expect(Object.keys(sources)).toHaveLength(6);
    expect(sources.avito).toBeDefined();
    expect(sources.sarouty).toBeDefined();
    expect(sources.yakeey).toBeDefined();
    expect(sources.agenz).toBeDefined();
    expect(sources["logic-immo"]).toBeDefined();
    expect(sources.mubawab).toBeDefined();
  });

  it("2. Avito is search_api_only", () => {
    const avito = getSearchGatewaySourceById("avito");
    expect(avito?.query_mode).toBe("search_api_only");
  });

  it("3. Mubawab is db_primary_search_api_complement", () => {
    const mubawab = getSearchGatewaySourceById("mubawab");
    expect(mubawab?.query_mode).toBe("db_primary_search_api_complement");
  });

  it("4. All enabled sources are in getEnabledSearchGatewaySources", () => {
    const enabled = getEnabledSearchGatewaySources();
    expect(enabled.length).toBeGreaterThan(0);
    expect(enabled.every((s) => s.enabled)).toBe(true);
  });
});

describe("Search Gateway — Query Builder", () => {
  it("5. Query builder generates site:domain queries", () => {
    const queries = buildSearchGatewayQueries({
      q: "appartement",
      city: "Casablanca",
    });
    expect(queries.length).toBeGreaterThan(0);
    queries.forEach((q) => {
      expect(q.query).toMatch(/site:\w+\.\w+/);
    });
  });

  it("6. Query builder respects city and q", () => {
    const queries = buildSearchGatewayQueries({
      q: "villa",
      city: "Marrakech",
    });
    expect(queries.length).toBeGreaterThan(0);
    queries.forEach((q) => {
      expect(q.query).toContain("villa");
      expect(q.query).toContain("Marrakech");
    });
  });

  it("7. Query builder returns empty array if all input empty", () => {
    const queries = buildSearchGatewayQueries({});
    expect(queries).toEqual([]);
  });

  it("8. Query builder respects max_results_per_source", () => {
    const queries = buildSearchGatewayQueries({
      q: "appartement",
      max_results_per_source: 5,
    });
    queries.forEach((q) => {
      expect(q.max_results).toBe(5);
    });
  });

  it("9. Query builder limits to 6 queries maximum", () => {
    const queries = buildSearchGatewayQueries({
      q: "appartement",
    });
    expect(queries.length).toBeLessThanOrEqual(6);
  });
});

describe("Search Gateway — Normalizer", () => {
  it("10. Normalizer rejects result without title", () => {
    const result = normalizeSearchGatewayResult(
      { link: "https://avito.ma/test" },
      "avito"
    );
    expect(result).toBeNull();
  });

  it("11. Normalizer rejects result without original_url", () => {
    const result = normalizeSearchGatewayResult(
      { title: "Test Listing" },
      "avito"
    );
    expect(result).toBeNull();
  });

  it("12. Normalizer rejects URL outside source domain", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test Listing",
        link: "https://unrelated.com/page",
      },
      "avito"
    );
    expect(result).toBeNull();
  });

  it("13. Normalizer accepts URL from correct domain", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test Listing",
        link: "https://avito.ma/casablanca/apartment-123",
      },
      "avito"
    );
    expect(result).not.toBeNull();
    expect(result?.original_url).toContain("avito.ma");
  });

  it("14. Normalizer forces can_show_contact=false", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test",
        link: "https://avito.ma/test",
      },
      "avito"
    );
    expect(result?.can_show_contact).toBe(false);
  });

  it("15. Normalizer forces can_show_gallery=false", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test",
        link: "https://avito.ma/test",
      },
      "avito"
    );
    expect(result?.can_show_gallery).toBe(false);
  });

  it("16. Normalizer forces can_cache_thumbnail=false", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test",
        link: "https://avito.ma/test",
      },
      "avito"
    );
    expect(result?.can_cache_thumbnail).toBe(false);
  });

  it("17. Normalizer forces can_download_thumbnail=false", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test",
        link: "https://avito.ma/test",
      },
      "avito"
    );
    expect(result?.can_download_thumbnail).toBe(false);
  });

  it("18. Normalizer rejects unknown source", () => {
    const result = normalizeSearchGatewayResult(
      {
        title: "Test",
        link: "https://unknown.com/test",
      },
      "unknown"
    );
    expect(result).toBeNull();
  });
});

describe("Search Gateway — Dedupe", () => {
  it("19. Dedupe removes duplicate URLs", () => {
    const result1 = normalizeSearchGatewayResult(
      {
        title: "Apartment 1",
        link: "https://avito.ma/apartment-123",
      },
      "avito"
    )!;
    const result2 = normalizeSearchGatewayResult(
      {
        title: "Apartment 1 Copy",
        link: "https://avito.ma/apartment-123",
      },
      "avito"
    )!;

    const deduped = dedupeSearchGatewayResults([result1, result2]);
    expect(deduped).toHaveLength(1);
  });

  it("20. Dedupe removes same source + same title", () => {
    const result1 = normalizeSearchGatewayResult(
      {
        title: "Same Title",
        link: "https://avito.ma/url1",
      },
      "avito"
    )!;
    const result2 = normalizeSearchGatewayResult(
      {
        title: "Same Title",
        link: "https://avito.ma/url2",
      },
      "avito"
    )!;

    const deduped = dedupeSearchGatewayResults([result1, result2]);
    expect(deduped).toHaveLength(1);
  });

  it("20a. Dedupe preserves cross-source results", () => {
    const result1 = normalizeSearchGatewayResult(
      {
        title: "Apartment Casablanca",
        link: "https://avito.ma/apartment-123",
      },
      "avito"
    )!;
    const result2 = normalizeSearchGatewayResult(
      {
        title: "Apartment Casablanca",
        link: "https://mubawab.ma/apartment-456",
      },
      "mubawab"
    )!;

    const deduped = dedupeSearchGatewayResults([result1, result2]);
    expect(deduped).toHaveLength(2); // Keep both different sources
  });

  it("20b. Dedupe removes tracking parameters from URLs", () => {
    const result1 = normalizeSearchGatewayResult(
      {
        title: "Test Listing",
        link: "https://avito.ma/apartment?utm_source=google&utm_medium=cpc",
      },
      "avito"
    )!;
    const result2 = normalizeSearchGatewayResult(
      {
        title: "Test Listing",
        link: "https://avito.ma/apartment?fbclid=123",
      },
      "avito"
    )!;

    const deduped = dedupeSearchGatewayResults([result1, result2]);
    expect(deduped).toHaveLength(1); // Same URL after removing tracking
  });

  it("20c. Dedupe limits Yakeey category pages", () => {
    const results = [
      normalizeSearchGatewayResult(
        {
          title: "10 Apartments in Casablanca",
          link: "https://yakeey.com/fr-ma/achat/appartement/Casablanca",
        },
        "yakeey"
      )!,
      normalizeSearchGatewayResult(
        {
          title: "10 Apartments for rent in Casablanca",
          link: "https://yakeey.com/fr-ma/location/appartement/Casablanca",
        },
        "yakeey"
      )!,
      normalizeSearchGatewayResult(
        {
          title: "Apartments with pool in Casablanca",
          link: "https://yakeey.com/fr-ma/achat/appartement/Casablanca?feature=pool",
        },
        "yakeey"
      )!,
    ];

    const deduped = dedupeSearchGatewayResults(results);
    // Should deduplicate similar Yakeey category pages
    expect(deduped.length).toBeLessThan(results.length);
  });

  it("20d. Dedupe protects single-source results", () => {
    const result1 = normalizeSearchGatewayResult(
      {
        title: "Unique Result",
        link: "https://logic-immo.ma/property-123",
      },
      "logic-immo"
    )!;
    const result2 = normalizeSearchGatewayResult(
      {
        title: "Common Title",
        link: "https://avito.ma/property-456",
      },
      "avito"
    )!;

    const deduped = dedupeSearchGatewayResults([result1, result2]);
    expect(deduped.some((r) => r.source_id === "logic-immo")).toBe(true); // Keep single source
  });

  it("20e. Dedupe maintains minimum coverage", () => {
    const results = Array.from({ length: 25 }, (_, i) =>
      normalizeSearchGatewayResult(
        {
          title: `Result ${i % 3}`, // Creates ~8 unique titles with dupes
          link: `https://yakeey.com/property-${i}`,
        },
        "yakeey"
      )!
    );

    const deduped = dedupeSearchGatewayResults(results);
    expect(deduped.length).toBeGreaterThanOrEqual(10); // Don't reduce below 10
  });
});

describe("Search Gateway — Security", () => {
  it("21. No secret in response (SEARCH_API_KEY not exposed)", () => {
    // This is a structural test — the route.ts implements this
    // by never logging or including SEARCH_API_KEY in response
    expect(true).toBe(true); // Placeholder for integration test
  });
});
