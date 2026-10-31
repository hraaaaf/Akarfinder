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
  const density = read("app/search/search-premium-card-density.css");
  assert.ok(density.includes("overflow-x:auto!important;scroll-snap-type:x proximity"));
  assert.ok(!density.includes("overflow-x:hidden!important"));

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

test("mobile Search result counter gets its own visible line", () => {
  const shell = read("components/search/LightZillowSearchShell.tsx");
  assert.ok(shell.includes("data-search-results-toolbar"));
  assert.ok(shell.includes("flex flex-wrap items-center justify-between"));
  assert.ok(shell.includes("sm:flex-nowrap"));
  assert.ok(shell.includes("flex w-full min-w-0 items-center gap-2 sm:w-auto"));
  assert.ok(shell.includes("sm:w-auto sm:shrink-0 sm:justify-end"));
  assert.ok(!shell.includes('className="min-w-0 truncate text-[14px]'));
  assert.ok(visual.includes("RESULT_COUNT_TRUNCATED"));
  assert.ok(visual.includes("element.scrollWidth > element.clientWidth + 1"));
  for (const width of [360, 390, 430, 768, 1280]) assert.ok(visual.includes("width: " + width));
});

test("settled empty Search cannot advertise stale server totals or ghost pagination", () => {
  const shell = read("components/search/LightZillowSearchShell.tsx");
  assert.match(shell, /const hasAnyResults = loadedResultCount > 0/);
  assert.match(shell, /const displayedResultCount = !isSearching && !hasAnyResults \? 0 : totalResultCount/);
  assert.match(shell, /displayedResultCount\.toLocaleString\("fr-FR"\)/);
  assert.match(shell, /totalPages > 1 && hasAnyResults/);
  assert.match(shell, /!hasAnyResults && !isSearching \? <EmptyState/);
});
