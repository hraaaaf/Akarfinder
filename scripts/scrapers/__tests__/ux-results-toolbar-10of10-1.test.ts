import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("components/search/LightZillowSearchShell.tsx", "utf8");
const switcher = readFileSync("components/search/SearchViewSwitcher.tsx", "utf8");
const styles = readFileSync("components/search/SearchViewSwitcher.module.css", "utf8");

test("results toolbar keeps the canonical result count, sort and three search views", () => {
  assert.match(shell, /data-search-results-toolbar/);
  assert.match(shell, /\$\{displayedCount\} résultat/);
  assert.match(shell, /data-search-sort-select/);
  assert.match(shell, /<option value="recommended">Recommandé<\/option>/);
  assert.match(shell, /<option value="price-asc">Prix croissant<\/option>/);
  assert.match(shell, /<option value="price-desc">Prix décroissant<\/option>/);
  assert.match(shell, /<SearchViewSwitcher value=\{view\} onChange=\{setView\}/);
  assert.match(switcher, /SEARCH_VIEW_ORDER\.map/);
  assert.match(switcher, /data-search-desktop-view-switcher/);
  assert.match(switcher, /aria-pressed=\{active\}/);
});

test("mobile exposes the visible segmented view control instead of compressing the count", () => {
  assert.match(switcher, /SearchViewSwitcher\.module\.css/);
  assert.match(switcher, /data-results-toolbar-view-control/);
  assert.match(styles, /@media \(max-width: 639px\)/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /grid-template-columns: minmax\(176px, 1fr\) 136px/);
  assert.match(styles, /min-height: 48px/);
  assert.match(styles, /height: 48px !important/);
  assert.match(styles, /\.mobileSelect\s*\{[\s\S]*display: none !important/);
});

test("toolbar is forced to the AkarFinder light palette with blue selection and no bronze styling", () => {
  assert.match(styles, /background: rgb\(255 255 255\) !important/);
  assert.match(styles, /color: rgb\(11 31 58\) !important/);
  assert.match(styles, /background: rgb\(11 99 206\) !important/);
  assert.match(styles, /border-color: rgb\(221 231 242\) !important/);
  assert.doesNotMatch(styles, /bronze|orange/i);
});

test("toolbar styling stays encapsulated away from frozen header and Search controls", () => {
  assert.doesNotMatch(styles, /data-search-global-header/);
  assert.doesNotMatch(styles, /data-search-controls-section/);
  assert.doesNotMatch(styles, /data-search-primary-filter-row/);
  assert.doesNotMatch(switcher, /QuickFilters|SiteHeader/);
});
