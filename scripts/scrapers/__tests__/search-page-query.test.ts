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
});
