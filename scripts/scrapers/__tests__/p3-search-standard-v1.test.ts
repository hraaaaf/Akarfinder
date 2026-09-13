import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const switcher = source("components/search/SearchViewSwitcher.tsx");
const filters = source("components/search/QuickFilters.tsx");

test("P3 mobile exposes a real Liste/Carte control", () => {
  assert.match(switcher, /const MOBILE_VIEW_ORDER: readonly SearchViewMode\[\] = \["list", "map"\]/);
  assert.match(switcher, /data-search-mobile-view-select/);
  assert.match(switcher, /flex min-w-0 rounded-full[^\n]+sm:hidden/);
  assert.match(switcher, /data-search-mobile-view-mode-button=\{mode\}/);
  assert.doesNotMatch(switcher, /h-12 hidden sm:hidden/);
});

test("P3 prevents the desktop split state from leaking into the mobile layout", () => {
  assert.match(switcher, /window\.matchMedia\("\(max-width: 639px\)"\)/);
  assert.match(switcher, /mobile\.matches && value === "split"/);
  assert.match(switcher, /onChange\("list"\)/);
});

test("P3 keeps Liste/Split/Carte available on tablet and desktop", () => {
  assert.match(switcher, /SEARCH_VIEW_ORDER\.map/);
  assert.match(switcher, /data-search-desktop-view-switcher/);
  assert.match(switcher, /hidden min-w-0 rounded-full[^\n]+sm:flex/);
});

test("P3 active filter count reflects every visible search dimension", () => {
  for (const expected of [
    'filters.transactionType !== "all"',
    'filters.city !== "all"',
    'filters.neighborhood !== "all"',
    "filters.minBudget",
    "filters.maxBudget",
    "filters.minSurface",
    'filters.propertyType !== "all"',
  ]) {
    assert.ok(filters.includes(expected), `missing active filter dimension: ${expected}`);
  }
});
