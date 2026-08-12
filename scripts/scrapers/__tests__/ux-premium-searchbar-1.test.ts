import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-SEARCHBAR-1 source contract", () => {
  const quickFilters = fs.readFileSync("components/search/QuickFilters.tsx", "utf8");
  const css = fs.readFileSync("app/search/search-controls-10of10.css", "utf8");
  assert.match(quickFilters, /data-premium-searchbar="ux-premium-searchbar-1"/);
  assert.match(quickFilters, /premium-search-input/);
  assert.match(quickFilters, /premium-filter-trigger/);
  assert.match(quickFilters, /aria-controls="advanced-search-filters"/);
  assert.match(css, /height:56px/);
  assert.match(css, /border-radius:9999px/);
  assert.match(css, /@media\(min-width:1024px\)/);
});
