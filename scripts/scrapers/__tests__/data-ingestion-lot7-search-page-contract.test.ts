import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { supportsOdmPublicSearchQuery } from "../../../lib/odm/odm-public-routing.js";
import {
  buildRawSearchPageQuery,
  buildSearchPageQuery,
} from "../../../lib/search/search-page-query.js";

function withPage(params: Record<string, string>, page: number) {
  return {
    ...params,
    limit: "24",
    offset: String((page - 1) * 24),
  };
}

describe("Lot 7 Search page SSR contract", () => {
  it("keeps page-1 structured filters ODM-capable and preserves canonical UI filters", () => {
    const params = withPage({
      city: "Casablanca",
      property_type: "Villa",
      transaction_type: "sale",
      min_price: "1000000",
      max_price: "5000000",
      min_surface: "120",
      max_surface: "500",
    }, 1);

    const raw = buildRawSearchPageQuery(params);
    const resolved = buildSearchPageQuery(params);

    assert.equal(raw.offset, 0);
    assert.equal(resolved.city, "Casablanca");
    assert.equal(resolved.property_type, "Villa");
    assert.equal(resolved.transaction_type, "sale");
    assert.equal(resolved.min_price, 1_000_000);
    assert.equal(resolved.max_price, 5_000_000);
    assert.equal(resolved.min_surface, 120);
    assert.equal(resolved.max_surface, 500);
    assert.equal(resolved.limit, 24);
    assert.equal(resolved.offset, 0);
    assert.equal(supportsOdmPublicSearchQuery(raw), true);
  });

  it("keeps numbered page 2 on legacy until cursor pagination owns it end-to-end", () => {
    const params = withPage({
      city: "Rabat",
      property_type: "Appartement",
      transaction_type: "rent",
    }, 2);

    const raw = buildRawSearchPageQuery(params);
    const resolved = buildSearchPageQuery(params);

    assert.equal(raw.offset, 24);
    assert.equal(resolved.offset, 24);
    assert.equal(resolved.limit, 24);
    assert.equal(resolved.city, "Rabat");
    assert.equal(resolved.property_type, "Appartement");
    assert.equal(resolved.transaction_type, "rent");
    assert.equal(supportsOdmPublicSearchQuery(raw), false);
  });
});
