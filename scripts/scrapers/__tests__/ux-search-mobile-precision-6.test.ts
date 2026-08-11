import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("UX-SEARCH-6 keeps the certified two-column mobile model while tightening narrow-screen rhythm", async () => {
  const css = await readFile("app/search/search-density.css", "utf8");
  assert.match(css, /UX-SEARCH-6 — Mobile Precision Pass/);
  assert.match(css, /@media \(max-width: 639px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /column-gap: 0\.625rem/);
  assert.match(css, /row-gap: 0\.875rem/);
  assert.match(css, /@media \(max-width: 379px\)[\s\S]*height: 9\.75rem/);
  assert.match(css, /\[data-card-facts\] > span[\s\S]*flex-shrink: 1/);
  assert.match(css, /text-overflow: ellipsis/);
});

test("UX-SEARCH-6 preserves critical 48px mobile controls and mobile view/sort semantics", async () => {
  const filters = await readFile("components/search/QuickFilters.tsx", "utf8");
  const switcher = await readFile("components/search/SearchViewSwitcher.tsx", "utf8");
  const shell = await readFile("components/search/LightZillowSearchShell.tsx", "utf8");

  assert.match(filters, /data-search-primary-search[\s\S]*h-12/);
  assert.match(filters, /data-search-filter-trigger[\s\S]*min-h-12/);
  assert.match(filters, /aria-label="Ouvrir les filtres"/);
  assert.match(switcher, /data-search-mobile-view-select/);
  assert.match(switcher, /className="h-12/);
  assert.match(shell, /data-search-sort-select[\s\S]*className="h-12/);
});

test("UX-SEARCH-6 does not reopen the canonical card information architecture", async () => {
  const card = await readFile("components/search/SearchListingCardDark.tsx", "utf8");
  const price = card.indexOf("data-card-price");
  const title = card.indexOf("data-card-title");
  const location = card.indexOf("data-card-location");
  const facts = card.indexOf("data-card-facts");
  const provenance = card.indexOf("data-card-provenance");

  assert.ok(price >= 0 && title > price && location > title && facts > location && provenance > facts);
  assert.match(card, /smartCard\.facts\.slice\(0, 3\)/);
  assert.match(card, /data-public-attribution/);
  assert.match(card, /data-mobile-compact-card/);
});
