import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSearchPageQuery } from "../../../lib/search/search-page-query.js";

describe("search page query builder", () => {
  it("maps search params to the DB search query", () => {
    const query = buildSearchPageQuery({
      q: " appartement casablanca ",
      city: "Casablanca",
      property_type: "Appartement",
      type: "achat",
    });

    assert.equal(query.q, "appartement casablanca");
    assert.equal(query.city, "Casablanca");
    assert.equal(query.property_type, "Appartement");
    assert.equal(query.transaction_type, "buy");
    assert.equal(query.limit, 100);
    assert.equal(query.offset, 0);
  });

  it("omits all sentinel values and keeps defaults", () => {
    const query = buildSearchPageQuery({
      q: "",
      city: "all",
      property_type: "all",
      transaction_type: "all",
    });

    assert.equal(query.q, undefined);
    assert.equal(query.city, undefined);
    assert.equal(query.property_type, undefined);
    assert.equal(query.transaction_type, undefined);
    assert.equal(query.limit, 100);
    assert.equal(query.offset, 0);
  });

  it("parses min_price and max_price from URL params", () => {
    const query = buildSearchPageQuery({
      city: "Rabat",
      min_price: "500000",
      max_price: "2000000",
    });

    assert.equal(query.city, "Rabat");
    assert.equal(query.min_price, 500000);
    assert.equal(query.max_price, 2000000);
  });

  it("ignores invalid price values", () => {
    const query = buildSearchPageQuery({
      min_price: "abc",
      max_price: "-1000",
      budget_min: "100000",
      budget_max: "900000",
    });

    assert.equal(query.min_price, 100000);
    assert.equal(query.max_price, 900000);
  });

  it("parses min_surface and max_surface from URL params", () => {
    const query = buildSearchPageQuery({
      city: "Casablanca",
      min_surface: "80",
      max_surface: "200",
    });

    assert.equal(query.city, "Casablanca");
    assert.equal(query.min_surface, 80);
    assert.equal(query.max_surface, 200);
  });

  it("ignores invalid surface values", () => {
    const query = buildSearchPageQuery({
      min_surface: "zero",
      max_surface: "-50",
    });

    assert.equal(query.min_surface, undefined);
    assert.equal(query.max_surface, undefined);
  });

  it("combines all filters into a complete search query", () => {
    const query = buildSearchPageQuery({
      q: "villa moderne",
      city: "Marrakech",
      property_type: "villa",
      type: "sale",
      min_price: "1000000",
      max_price: "5000000",
      min_surface: "200",
    });

    assert.equal(query.q, "villa moderne");
    assert.equal(query.city, "Marrakech");
    assert.equal(query.property_type, "villa");
    assert.equal(query.transaction_type, "buy");
    assert.equal(query.min_price, 1000000);
    assert.equal(query.max_price, 5000000);
    assert.equal(query.min_surface, 200);
  });
});
