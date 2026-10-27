import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("desktop split keeps the canonical three-mode contract", () => {
  const view = source("lib/ux/search-view.ts");
  assert.match(view, /SEARCH_VIEW_ORDER[^\n]*\["list", "split", "map"\]/);
  assert.match(view, /label: "Liste"/);
  assert.match(view, /label: "Mixte"/);
  assert.match(view, /label: "Carte"/);
});

test("split renders one list pane and one map pane with a balanced desktop ratio", () => {
  const shell = source("components/search/LightZillowSearchShell.tsx");
  assert.match(shell, /data-search-view-layout=\{view\}/);
  assert.match(shell, /data-search-list-pane/);
  assert.match(shell, /data-search-map-pane/);
  assert.match(shell, /lg:grid-cols-\[minmax\(0,1\.08fr\)_minmax\(440px,0\.92fr\)\]/);
  assert.equal((shell.match(/data-search-map-secondary=/g) ?? []).length, 2);
  assert.equal((shell.match(/view === "split" \? "hidden" : ""/g) ?? []).length, 2);
});

test("split simplification stays presentation-only", () => {
  const shell = source("components/search/LightZillowSearchShell.tsx");
  const card = source("components/search/SearchListingCardDark.tsx");
  assert.match(shell, /const viewLayout = getSearchViewLayout\(view\)/);
  assert.match(shell, /<SearchViewSwitcher value=\{view\} onChange=\{setView\}/);
  assert.match(card, /onMouseEnter=\{\(\) => hoverListing\(listing, "list"\)\}/);
  assert.match(card, /onFocus=\{\(\) => hoverListing\(listing, "list"\)\}/);
  assert.equal((shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? []).length, 1);
  assert.doesNotMatch(shell, /view[^\n]*sortListings|sortListings[^\n]*view/);
});

test("secondary map content remains available in dedicated map mode", () => {
  const shell = source("components/search/LightZillowSearchShell.tsx");
  assert.match(shell, /Mon Projet AkarFinder/);
  assert.match(shell, /Ouvrir la carte complète/);
  assert.match(shell, /data-search-map-secondary="project"/);
  assert.match(shell, /data-search-map-secondary="full-map"/);
  assert.equal((shell.match(/view === "split" \? "hidden" : ""/g) ?? []).length, 2);
});

test("AFTER visual checks follow the P4 map-first mobile and map-dominant desktop layout", () => {
  const c2 = source("app/search/mockup-convergence-l2.css");
  const p4 = source("app/search/p4-map-shell.css");
  const visual = source("scripts/audits/search-desktop-split-1-visual.mjs");

  assert.match(c2, /@media \(max-width: 1023px\)[\s\S]*?\[data-search-view-layout="split"\][\s\S]*?display: flex !important/);
  assert.match(c2, /\[data-search-view-layout="split"\] \[data-search-map-pane\] \{\s*order: 1/);
  assert.match(c2, /\[data-search-view-layout="split"\] \[data-search-list-pane\] \{\s*order: 2/);
  assert.match(p4, /grid-template-columns: minmax\(0, 3fr\) minmax\(360px, 2fr\) !important/);

  assert.match(visual, /mapFirstStacked/);
  assert.match(visual, /non-desktop P4 map-first stacking changed/);
  assert.match(visual, /viewport\.width \* 0\.45/);
  assert.doesNotMatch(visual, /non-desktop split stacking changed/);
});

test("AFTER waits for actual MapLibre features, not merely the map pane or style", () => {
  const map = source("components/search/SearchMapPanel.tsx");
  const visual = source("scripts/audits/search-desktop-split-1-visual.mjs");
  assert.match(map, /mapInstance\.on\("idle"/);
  assert.match(map, /mapInstance\.areTilesLoaded\(\)/);
  assert.match(map, /mapInstance\.queryRenderedFeatures\(\)\.length > 0/);
  assert.match(map, /dataset\.searchMapVisualReady = "true"/);
  assert.match(visual, /page\.waitForFunction\(/);
  assert.match(visual, /data-search-map-visual-ready="true"/);
  assert.match(visual, /timeout: 25_000/);
  assert.match(visual, /MapLibre basemap did not render within bounded visual-ready gate/);
  assert.match(visual, /map_visual_ready: split\.mapVisualReady/);
});
