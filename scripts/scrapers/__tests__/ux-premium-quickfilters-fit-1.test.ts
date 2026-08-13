import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-QUICKFILTERS-FIT-1 source contract", () => {
  const css = fs.readFileSync("app/search/search-premium-quickfilters-fit.css", "utf8");
  const page = fs.readFileSync("app/search/page.tsx", "utf8");
  const filters = fs.readFileSync("components/search/QuickFilters.tsx", "utf8");

  assert.match(page, /search-premium-quickfilters-fit\.css/);
  assert.match(css, /UX-PREMIUM-QUICKFILTERS-FIT-1/);
  assert.match(css, /@media\(max-width:639px\)/);
  assert.match(css, /overflow-x:hidden!important/);
  assert.match(css, /justify-content:space-between!important/);
  assert.match(css, /@media\(max-width:374px\)/);

  for (const [key, label] of [
    ["all", "Tous"],
    ["buy", "À vendre"],
    ["rent", "À louer"],
    ["price", "Prix"],
    ["filters", "Filtres"],
  ]) {
    assert.ok(filters.includes(`data-quickfilter="${key}"`), `missing ${key}`);
    assert.ok(filters.includes(`<span>${label}</span>`), `missing ${label}`);
  }
});
