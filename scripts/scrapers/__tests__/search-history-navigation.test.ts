import assert from "node:assert/strict";
import test from "node:test";
import {
  applySearchContinuityContext,
  getSearchHistoryMutation,
  restoreSearchHistorySnapshot,
} from "../../../lib/ux/search-history";
import {
  buildListingDetailHref,
  sanitizeReturnHref,
} from "../../../lib/ux/navigation-continuity";

test("search history keeps hydration silent and user changes navigable", () => {
  assert.equal(getSearchHistoryMutation("/search?city=Rabat", "/search?city=Rabat", true), "none");
  assert.equal(getSearchHistoryMutation("/search?city=rabat", "/search?city=Rabat", false), "replace");
  assert.equal(getSearchHistoryMutation("/search?city=Rabat", "/search?city=Rabat&sort=price_asc", true), "push");
});

test("search continuity preserves MRE and project context", () => {
  assert.equal(
    applySearchContinuityContext(
      "/search?city=Rabat&sort=price_desc",
      "?city=Rabat&mre=true&project_id=project-42",
      true,
    ),
    "/search?city=Rabat&sort=price_desc&mre=true&project_id=project-42",
  );
});

test("popstate snapshot restores canonical search controls", () => {
  const snapshot = restoreSearchHistorySnapshot(
    "?city=Rabat&transaction_type=buy&sort=price_desc&view=split&mre=true",
  );
  assert.equal(snapshot.filters.city, "Rabat");
  assert.equal(snapshot.filters.transactionType, "buy");
  assert.equal(snapshot.filters.mreOnly, true);
  assert.equal(snapshot.sortBy, "price-desc");
  assert.equal(snapshot.view, "split");
});

test("listing return target keeps exact filtered result state and rejects external returns", () => {
  const returnHref = "/search?city=Rabat&sort=price_desc&view=split";
  const detailHref = buildListingDetailHref("/listings/listing-1", returnHref, "project-42");
  const parsed = new URL(detailHref, "https://akarfinder.local");
  assert.equal(parsed.searchParams.get("return_to"), returnHref);
  assert.equal(parsed.searchParams.get("project_id"), "project-42");
  assert.equal(sanitizeReturnHref("https://evil.example/search"), null);
});
