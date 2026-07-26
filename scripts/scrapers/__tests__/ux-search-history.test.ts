import assert from "node:assert/strict";
import test from "node:test";

import { defaultListingFilters } from "../../../lib/listings/utils";
import {
  buildCanonicalSearchHref,
  restoreSearchHistorySnapshot,
  shouldReplaceSearchHistory,
} from "../../../lib/ux/search-history";

test("builds one shareable URL from filters, sort and view", () => {
  const href = buildCanonicalSearchHref(
    "/search",
    {
      ...defaultListingFilters,
      search: "appartement agdal",
      transactionType: "buy",
      city: "Rabat",
      neighborhood: "Agdal",
      minBudget: "900000",
      maxBudget: "1800000",
    },
    "price-asc",
    "split",
  );

  assert.equal(
    href,
    "/search?q=appartement+agdal&transaction_type=buy&city=Rabat&district=Agdal&min_price=900000&max_price=1800000&sort=price_asc&view=split",
  );
});

test("restores the client snapshot from browser search state", () => {
  const restored = restoreSearchHistorySnapshot(
    "?q=riad&transaction_type=buy&property_type=Villa&city=Marrakech&district=Medina&sort=price_desc&view=map",
  );

  assert.equal(restored.filters.search, "riad");
  assert.equal(restored.filters.city, "Marrakech");
  assert.equal(restored.filters.neighborhood, "Medina");
  assert.equal(restored.sortBy, "price-desc");
  assert.equal(restored.view, "map");
});

test("does not rewrite browser history when href is unchanged", () => {
  assert.equal(shouldReplaceSearchHistory("/search?city=Rabat", "/search?city=Rabat"), false);
  assert.equal(shouldReplaceSearchHistory("/search", "/search?city=Rabat"), true);
});
