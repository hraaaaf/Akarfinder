import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const source = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const switcher = source("components/search/SearchViewSwitcher.tsx");
const switcherStyles = source("components/search/SearchViewSwitcher.module.css");
const filters = source("components/search/QuickFilters.tsx");
const intelligence = source("components/search/SearchPriceExplorerDock.tsx");

test("P3 mobile exposes exactly the Liste/Carte control", () => {
  assert.match(switcher, /const MOBILE_VIEW_ORDER: readonly SearchViewMode\[\] = \["list", "map"\]/);
  assert.match(switcher, /data-search-mobile-view-select/);
  assert.match(switcher, /styles\.mobileSegmented/);
  assert.match(switcher, /data-search-mobile-view-mode-button=\{mode\}/);
  assert.match(switcherStyles, /\.mobileSegmented\s*\{[\s\S]*display: none !important/);
  assert.match(switcherStyles, /@media \(max-width: 639px\)[\s\S]*\.mobileSegmented\s*\{[\s\S]*display: flex !important/);
  assert.match(switcherStyles, /\.desktopSegmented\s*\{[\s\S]*display: none !important/);
  assert.match(switcherStyles, /\.mobileSegmented \.option\s*\{[\s\S]*min-height: 48px !important/);
});

test("P3 prevents the desktop split state from leaking into the mobile layout", () => {
  assert.match(switcher, /window\.matchMedia\("\(max-width: 639px\)"\)/);
  assert.match(switcher, /mobile\.matches && value === "split"/);
  assert.match(switcher, /onChange\("list"\)/);
});

test("P3 keeps Liste/Split/Carte available on tablet and desktop", () => {
  assert.match(switcher, /SEARCH_VIEW_ORDER\.map/);
  assert.match(switcher, /data-search-desktop-view-switcher/);
  assert.match(switcher, /styles\.desktopSegmented/);
  assert.match(switcherStyles, /\.desktopSegmented\s*\{[\s\S]*display: flex !important/);
});

test("P3 preserves certified search-control heights", () => {
  assert.match(switcherStyles, /premium-search-input[\s\S]*premium-filter-trigger[\s\S]*height: 56px !important/);
  assert.match(switcherStyles, /@media \(min-width: 1024px\)[\s\S]*height: 52px !important/);
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

test("P3 surfaces the active minimum budget and lets the user clear it", () => {
  assert.match(filters, /data-search-active-min-budget/);
  assert.match(filters, /Min \{Number\(filters\.minBudget\)\.toLocaleString\("fr-FR"\)\} DH/);
  assert.match(filters, /onChange\(\{ \.\.\.filters, minBudget: "" \}\)/);
});

test("P3 keeps neighborhood intelligence secondary to actual visible results", () => {
  assert.match(intelligence, /if \(!hasUsefulContent\) return null/);
  assert.match(intelligence, /if \(visibleListings\.length === 0\) return null/);
  assert.match(intelligence, /data-search-secondary-intelligence/);
});
