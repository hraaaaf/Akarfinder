import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { enrichSearchQueryWithTextIntent } from "../../../lib/search/query-intent.js";
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

  it("keeps the same inferred intent in database Search and client hydration", () => {
    const databaseSearch = source("lib/search/database-search.ts");
    const searchPage = source("app/search/page.tsx");
    assert.ok(databaseSearch.includes("enrichSearchQueryWithTextIntent(query)"));
    assert.ok(searchPage.includes("const resolvedQuery = buildSearchPageQuery(params)"));
    assert.ok(searchPage.includes("city = resolvedQuery.city"));
    assert.ok(searchPage.includes("propertyType = resolvedQuery.property_type"));
  });
});
