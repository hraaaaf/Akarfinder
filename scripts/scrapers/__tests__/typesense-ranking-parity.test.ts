import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  enrichSearchQueryWithTextIntent,
  getResidualSearchText,
} from "../../../lib/search/query-intent.js";
import { buildTypesenseSearchParams } from "../../../lib/search/typesense-client.js";

describe("Typesense Search provider parity", () => {
  it("turns appartement Casablanca into structured filters with no duplicate text query", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca" });
    assert.equal(query.city, "Casablanca");
    assert.equal(query.property_type, "Appartement");
    assert.equal(getResidualSearchText(query), undefined);

    const params = buildTypesenseSearchParams({ ...query, limit: 100, offset: 0 });
    assert.equal(params.get("q"), "*");
    assert.match(params.get("filter_by") ?? "", /city:=Casablanca/);
    assert.match(params.get("filter_by") ?? "", /property_type:=Appartement/);
    assert.equal(
      params.get("sort_by"),
      "_text_match:desc,_eval(price_mad:>0):desc,data_completeness_score:desc",
    );
  });

  it("keeps genuinely residual criteria as Typesense text relevance", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca piscine" });
    assert.equal(getResidualSearchText(query), "piscine");

    const params = buildTypesenseSearchParams({ ...query, limit: 100, offset: 0 });
    assert.equal(params.get("q"), "piscine");
    assert.equal(
      params.get("sort_by"),
      "_text_match:desc,_eval(price_mad:>0):desc,data_completeness_score:desc",
    );
  });

  it("keeps the internal 0 price sentinel behind disclosed prices in ascending price sort", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca" });
    const params = buildTypesenseSearchParams({
      ...query,
      sort: "price_asc",
      limit: 100,
      offset: 0,
    });
    assert.equal(params.get("sort_by"), "_eval(price_mad:>0):desc,price_mad:asc");
  });

  it("keeps the internal 0 price sentinel behind disclosed prices in descending price sort", () => {
    const query = enrichSearchQueryWithTextIntent({ q: "appartement Casablanca" });
    const params = buildTypesenseSearchParams({
      ...query,
      sort: "price_desc",
      limit: 100,
      offset: 0,
    });
    assert.equal(params.get("sort_by"), "_eval(price_mad:>0):desc,price_mad:desc");
  });

  it("preserves explicit filters while removing only duplicated structured terms", () => {
    const query = enrichSearchQueryWithTextIntent({
      q: "appartement Casablanca terrasse",
      city: "Rabat",
      property_type: "Villa",
    });
    assert.equal(query.city, "Rabat");
    assert.equal(query.property_type, "Villa");
    assert.equal(getResidualSearchText(query), "appartement casablanca terrasse");
  });
});
