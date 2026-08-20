import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultListingFilters } from "@/lib/listings/utils";
import {
  applySearchContinuityContext,
  buildCanonicalSearchHref,
  restoreSearchHistorySnapshot,
} from "@/lib/ux/search-history";
import {
  buildListingDetailHref,
  sanitizeReturnHref,
} from "@/lib/ux/navigation-continuity";

test("C1 canonical search keeps MRE and project context", () => {
  const canonical = buildCanonicalSearchHref(
    "/search",
    { ...defaultListingFilters, city: "Rabat", mreOnly: true },
    "recommended",
    "split",
  );
  const href = applySearchContinuityContext(
    canonical,
    "?project_id=123e4567-e89b-42d3-a456-426614174000&mre=true",
    true,
  );
  const parsed = new URL(href, "https://akarfinder.local");

  assert.equal(parsed.pathname, "/search");
  assert.equal(parsed.searchParams.get("city"), "Rabat");
  assert.equal(parsed.searchParams.get("view"), "split");
  assert.equal(parsed.searchParams.get("mre"), "true");
  assert.equal(parsed.searchParams.get("project_id"), "123e4567-e89b-42d3-a456-426614174000");
});

test("C1 history restore follows the MRE flag", () => {
  const restored = restoreSearchHistorySnapshot("?city=Rabat&mre=true&view=map");
  assert.equal(restored.filters.city, "Rabat");
  assert.equal(restored.filters.mreOnly, true);
  assert.equal(restored.view, "map");

  const withoutMre = restoreSearchHistorySnapshot("?city=Rabat");
  assert.equal(withoutMre.filters.mreOnly, false);
});

test("C1 return target is restricted to Search and Map", () => {
  assert.equal(sanitizeReturnHref("/search?city=Rabat&view=split"), "/search?city=Rabat&view=split");
  assert.equal(sanitizeReturnHref("/map?city=rabat&district=agdal&layer=price"), "/map?city=rabat&district=agdal&layer=price");
  assert.equal(sanitizeReturnHref("https://evil.example/search"), null);
  assert.equal(sanitizeReturnHref("//evil.example/search"), null);
  assert.equal(sanitizeReturnHref("/favorites"), null);
});

test("C1 listing href carries exact return session and project", () => {
  const href = buildListingDetailHref(
    "/listings/owner-42",
    "/search?city=Rabat&district=Agdal&view=split&mre=true",
    "123e4567-e89b-42d3-a456-426614174000",
  );
  const parsed = new URL(href, "https://akarfinder.local");

  assert.equal(parsed.pathname, "/listings/owner-42");
  assert.equal(
    parsed.searchParams.get("return_to"),
    "/search?city=Rabat&district=Agdal&view=split&mre=true",
  );
  assert.equal(parsed.searchParams.get("project_id"), "123e4567-e89b-42d3-a456-426614174000");
});

test("C1 integration wires Search links and Listing return", () => {
  const searchBridge = readFileSync("components/search/SearchMapNavigationBridge.tsx", "utf8");
  const listingPage = readFileSync("app/listings/[id]/page.tsx", "utf8");
  const listingShell = readFileSync("components/listings/AnnouncementPageShell.tsx", "utf8");

  assert.match(searchBridge, /buildListingDetailHref/);
  assert.match(searchBridge, /returnHref/);
  assert.match(listingPage, /sanitizeReturnHref/);
  assert.match(listingPage, /returnHref=\{returnHref\}/);
  assert.match(listingShell, /ListingReturnNavigationBridge/);
});
