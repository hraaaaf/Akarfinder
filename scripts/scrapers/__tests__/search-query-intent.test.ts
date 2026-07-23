import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { mockListings } from "../../../lib/listings/mock-listings.js";
import { enrichSearchQueryWithTextIntent } from "../../../lib/search/query-intent.js";
import { compareRecommendedListings, computeRankingBreakdown } from "../../../lib/search/ranking.js";
import { buildSearchPageQuery } from "../../../lib/search/search-page-query.js";

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
