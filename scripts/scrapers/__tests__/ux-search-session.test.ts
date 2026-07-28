import assert from "node:assert/strict";
import test from "node:test";

import {
  listingFiltersToSearchSession,
  searchSessionFromUrl,
  searchSessionToListingState,
  searchSessionToUrl,
} from "../../../lib/ux/search-session";
import { defaultListingFilters } from "../../../lib/listings/utils";

test("URL state round-trips without changing the search contract", () => {
  const initial = new URLSearchParams(
    "q=appartement+agdal&transaction_type=buy&property_type=apartment&city=Rabat&district=Agdal&min_price=900000&max_price=1800000&min_surface=70&sort=price_asc&view=split&page=2",
  );

  const parsed = searchSessionFromUrl(initial);
  const serialized = searchSessionToUrl(parsed);
  const reparsed = searchSessionFromUrl(serialized);

  assert.deepEqual(reparsed, parsed);
  assert.equal(reparsed.view, "split");
  assert.equal(reparsed.sort, "price_asc");
  assert.equal(reparsed.city, "Rabat");
  assert.equal(reparsed.district, "Agdal");
});

test("invalid URL values fall back to safe canonical defaults", () => {
  const parsed = searchSessionFromUrl(
    new URLSearchParams("transaction_type=new&sort=random&view=grid&min_price=-1&page=0"),
  );

  assert.equal(parsed.transactionType, undefined);
  assert.equal(parsed.sort, "relevance");
  assert.equal(parsed.view, "list");
  assert.equal(parsed.minPrice, undefined);
  assert.equal(parsed.page, 1);
});

test("listing filters, sort and view produce one canonical session", () => {
  const session = listingFiltersToSearchSession(
    {
      ...defaultListingFilters,
      search: " villa tanger ",
      transactionType: "rent",
      city: "Tanger",
      neighborhood: "Malabata",
      propertyType: "villa",
      minBudget: "8000",
      maxBudget: "15000",
      minSurface: "120",
    },
    "price-desc",
    "map",
  );

  assert.deepEqual(session, {
    q: "villa tanger",
    transactionType: "rent",
    city: "Tanger",
    district: "Malabata",
    propertyType: "villa",
    minPrice: 8000,
    maxPrice: 15000,
    minSurface: 120,
    sort: "price_desc",
    view: "map",
    page: 1,
  });
});

test("canonical session restores client listing state", () => {
  const restored = searchSessionToListingState({
    q: "riad",
    transactionType: "buy",
    city: "Marrakech",
    district: "Médina",
    propertyType: "riad",
    maxPrice: 3500000,
    sort: "price_asc",
    view: "split",
  });

  assert.deepEqual(restored.filters, {
    search: "riad",
    transactionType: "buy",
    propertyType: "riad",
    city: "Marrakech",
    neighborhood: "Médina",
    minBudget: "",
    maxBudget: "3500000",
    minSurface: "",
  });
  assert.equal(restored.sortBy, "price-asc");
  assert.equal(restored.view, "split");
});
