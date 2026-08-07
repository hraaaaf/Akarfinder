import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { mockListings } from "../../../lib/listings/mock-listings.js";
import { enrichSearchQueryWithTextIntent } from "../../../lib/search/query-intent.js";
import { compareRecommendedListings, computeRankingBreakdown } from "../../../lib/search/ranking.js";
import { buildSearchPageQuery } from "../../../lib/search/search-page-query.js";
import {
  buildSearchRequestQuery,
  buildSearchStableKey,
} from "../../../lib/search/search-request-query.js";
import { buildTypesenseSearchParams } from "../../../lib/search/typesense-client.js";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

describe("Structured intent inferred from free-text Search", () => {
  it("interprets appartement Casablanca as structured city and property type", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca" });
    assert.equal(query.city, "Casablanca");
    assert.equal(query.property_type, "Appartement");
    assert.equal(query.transaction_type, undefined);
  });

  it("interprets villa à louer Rabat including the transaction intent", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "villa à louer Rabat" });
    assert.equal(query.city, "Rabat");
    assert.equal(query.property_type, "Villa");
    assert.equal(query.transaction_type, "rent");
  });

  it("never overrides explicit filters with inferred text intent", () => {
    const query = enrichSearchQueryWithTextIntent({
      q: "villa à louer Rabat",
      city: "Casablanca",
      property_type: "Appartement",
      transaction_type: "buy",
    });
    assert.equal(query.city, "Casablanca");
    assert.equal(query.property_type, "Appartement");
    assert.equal(query.transaction_type, "buy");
  });

  it("recognizes Salé as a city without confusing it with a sale transaction", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Salé" });
    assert.equal(query.city, "Salé");
    assert.equal(query.property_type, "Appartement");
    assert.equal(query.transaction_type, undefined);
  });

  it("enriches the SSR page query before Search execution", () => {
    const query = buildSearchPageQuery({ q: "appartement Casablanca" });
    assert.equal(query.city, "Casablanca");
    assert.equal(query.property_type, "Appartement");
    assert.equal(query.q, "appartement Casablanca");
  });

  it("does not double-count a structured city repeated in a title", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca" });
    const priced = {
      ...mockListings[0],
      id: "priced",
      city: "Casablanca",
      property_type: "Appartement" as const,
      title: "Appartement lumineux",
      description_snippet: "",
      district: "Maarif",
      price: 1_450_000,
    };
    const unpricedRepeatingCity = {
      ...mockListings[0],
      id: "unpriced-city-title",
      city: "Casablanca",
      property_type: "Appartement" as const,
      title: "Appartement Casablanca à découvrir",
      description_snippet: "",
      district: "Casablanca Finance City",
      price: null,
    };

    const pricedRank = computeRankingBreakdown(priced, query);
    const unpricedRank = computeRankingBreakdown(unpricedRepeatingCity, query);
    assert.equal(pricedRank.relevance, 60);
    assert.equal(unpricedRank.relevance, 60);
    assert.ok(
      compareRecommendedListings(priced, unpricedRepeatingCity, query) < 0,
      "repeated structured city must not outrank a disclosed price",
    );
  });

  it("keeps genuinely residual criteria ahead of price disclosure", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca piscine" });
    const relevantWithoutPrice = {
      ...mockListings[0],
      id: "pool-unpriced",
      city: "Casablanca",
      property_type: "Appartement" as const,
      title: "Appartement avec piscine",
      description_snippet: "",
      district: "Maarif",
      price: null,
    };
    const pricedWithoutCriterion = {
      ...mockListings[0],
      id: "priced-no-pool",
      city: "Casablanca",
      property_type: "Appartement" as const,
      title: "Appartement lumineux",
      description_snippet: "",
      district: "Maarif",
      price: 1_200_000,
    };

    assert.ok(
      compareRecommendedListings(relevantWithoutPrice, pricedWithoutCriterion, query) < 0,
      "a real residual criterion must remain more important than price disclosure",
    );
  });

  it("keeps the same inferred intent in database Search and client hydration", () => {
    const databaseSearch = source("lib/search/database-search.ts");
    const searchPage = source("app/search/page.tsx");
    assert.ok(databaseSearch.includes("enrichSearchQueryWithTextIntent(query)"));
    assert.ok(searchPage.includes("const resolvedQuery = buildSearchPageQuery(params)"));
    assert.ok(searchPage.includes("city = resolvedQuery.city"));
    assert.ok(searchPage.includes("propertyType = resolvedQuery.property_type"));
  });
});

describe("CARTE-QUARTIER-P1A.2 — structured district Search contract", () => {
  it("parses district independently from q and includes it in the stable key", () => {
    const values = new Map<string, string>([
      ["q", "piscine"],
      ["city", "Rabat"],
      ["district", "agdal"],
    ]);
    const query = buildSearchRequestQuery((name) => values.get(name));
    assert.equal(query.q, "piscine");
    assert.equal(query.city, "Rabat");
    assert.equal(query.district, "agdal");
    assert.equal(JSON.parse(buildSearchStableKey(query)).district, "agdal");
  });

  it("keeps district through SSR page query without folding it into free text", () => {
    const query = buildSearchPageQuery({
      q: "piscine",
      city: "Rabat",
      district: "agdal",
    });
    assert.equal(query.q, "piscine");
    assert.equal(query.city, "Rabat");
    assert.equal(query.district, "agdal");
  });

  it("canonicalizes a district alias for the Typesense exact filter", () => {
    const params = buildTypesenseSearchParams({
      city: "Casablanca",
      district: "Maarif",
      limit: 20,
      offset: 0,
    });
    const filter = params.get("filter_by") ?? "";
    assert.ok(filter.includes("city:=Casablanca"));
    assert.ok(filter.includes("district:=Maârif"));
  });

  it("enforces canonical district matching in database Search", () => {
    const databaseSearch = source("lib/search/database-search.ts");
    assert.ok(databaseSearch.includes("if (query.district)"));
    assert.ok(databaseSearch.includes("canonicalizeGeoPair(query.city ?? listing.city, query.district)"));
    assert.ok(databaseSearch.includes("canonicalizeGeoPair(\n      listing.city"));
  });

  it("preserves district through SSR hydration and client Search URLs", () => {
    const searchPage = source("app/search/page.tsx");
    const shell = source("components/search/LightZillowSearchShell.tsx");
    assert.ok(searchPage.includes("const neighborhood = resolvedQuery.district ?? \"\""));
    assert.ok(searchPage.includes("neighborhood,"));
    assert.ok(shell.includes('params.set("district", filters.neighborhood)'));
    assert.ok(shell.includes("neighborhood: initialFilters?.neighborhood ?? defaultListingFilters.neighborhood"));
  });

  it("routes district queries away from the ODM read model that cannot certify district", () => {
    const routing = source("lib/odm/odm-public-routing.ts");
    const api = source("app/api/search/route.ts");
    assert.ok(routing.includes("export function supportsOdmPublicSearchQuery"));
    assert.ok(routing.includes("return !query.district?.trim()"));
    assert.ok(routing.includes("odmCapable && shouldServeOdmPublicCanary"));
    assert.ok(api.includes("if (!supportsOdmPublicSearchQuery(query)) return"));
  });

  it("fails closed on the multi-source gateway instead of widening a district request", () => {
    const gateway = source("app/api/search/gateway/route.ts");
    assert.ok(gateway.includes('searchParams.get("district")'));
    assert.ok(gateway.includes('reason: "district_requires_structured_search"'));
    assert.ok(gateway.includes("sources_queried: []"));
  });
});
