import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(path, "utf8");
const quick = read("components/search/QuickFilters.tsx");
const switcher = read("components/search/SearchViewSwitcher.tsx");
const css = read("components/search/SearchViewSwitcher.module.css");
const indexed = read("lib/ux/indexed-property-type-visual.ts");
const selector = read("components/property-types/PropertyTypeVisualSelector.tsx");
const visual = read("scripts/audits/search-onboarding-option-a-visual.mjs");

test("composed P3 filters retain 44px touch targets, active state and minimum-budget removal", () => {
  assert.ok(quick.includes('filters.transactionType !== "all"'));
  assert.ok(quick.includes('filters.neighborhood !== "all"'));
  assert.ok(quick.includes('data-search-active-min-budget'));
  assert.ok(quick.includes('onChange({ ...filters, minBudget: "" })'));
  assert.equal((quick.match(/data-quickfilter="/g) || []).length, 5);
  assert.equal((quick.match(/premium-quickfilter-chip !min-h-\[44px\]/g) || []).length, 5);
});

test("mobile has Liste/Carte, desktop retains Liste/Mixte/Carte", () => {
  assert.match(switcher, /MOBILE_VIEW_ORDER: readonly SearchViewMode\[\] = \["list", "map"\]/);
  assert.ok(switcher.includes('value === "split"'));
  assert.ok(switcher.includes('onChange("list")'));
  assert.ok(switcher.includes("SEARCH_VIEW_ORDER.map"));
  assert.match(css, /\.mobileSegmented/);
  assert.match(css, /\.desktopSegmented/);
});

test("Search only uses TARGET art; seller keeps Option A", () => {
  assert.ok(quick.includes('visualVariant="search-target"'));
  assert.ok(selector.includes('visualVariant = "option-a"'));
  assert.ok(selector.includes('getIndexedPropertyTypeVisual'));
  for (const asset of ["apartment.svg", "villa.svg", "land.svg", "office.svg", "commercial.svg", "riad.png"]) {
    assert.ok(indexed.includes('/visuals/property-types/target/' + asset), asset);
  }
  const seller = read("components/vendre/SellerPropertyDraftForm.tsx");
  assert.ok(!seller.includes('visualVariant="search-target"'));
});

test("visual proof checks the VISIBLE selector in all four viewports", () => {
  assert.match(visual, /\[aria-label="Type de bien"\]:visible/);
  assert.doesNotMatch(visual, /selectors\.last\(\)/);
  for (const width of [390, 430, 768, 1280]) assert.match(visual, new RegExp("width: " + width));
  assert.ok(visual.includes("TARGET_ASSETS_MISSING"));
  assert.ok(visual.includes("HORIZONTAL_OVERFLOW"));
  assert.ok(visual.includes("page.screenshot"));
});
