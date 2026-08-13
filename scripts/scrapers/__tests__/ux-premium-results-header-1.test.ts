import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UX-PREMIUM-RESULTS-HEADER-1 source contract", () => {
  const shell = fs.readFileSync("components/search/LightZillowSearchShell.tsx", "utf8");
  const css = fs.readFileSync("app/search/search-controls-10of10.css", "utf8");
  assert.match(shell, /data-search-results-toolbar/);
  assert.match(shell, /data-search-sort-select/);
  assert.match(shell, /SearchViewSwitcher value={view}/);
  assert.match(shell, /displayedCount/);
  assert.match(css, /\[data-search-results-toolbar\]\{min-height:54px/);
  assert.match(css, /\[data-search-results-toolbar\] h1\{font-size:16px/);
  assert.match(css, /\[data-search-results-toolbar\] \[data-search-sort-select\]\{height:44px/);
  assert.match(css, /overflowX/,{ message: "placeholder" });
});
