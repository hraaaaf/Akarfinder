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
  assert.equal((shell.match(/view === "split" \? "lg:hidden" : ""/g) ?? []).length, 2);
});

test("split simplification stays presentation-only", () => {
  const shell = source("components/search/LightZillowSearchShell.tsx");
  assert.match(shell, /const viewLayout = getSearchViewLayout\(view\)/);
  assert.match(shell, /<SearchViewSwitcher value=\{view\} onChange=\{setView\}/);
  assert.match(shell, /onMouseEnter=\{\(\) => hoverListing/);
  assert.equal((shell.match(/sortListings\(clientFiltered, sortBy\)/g) ?? []).length, 1);
  assert.doesNotMatch(shell, /view[^\n]*sortListings|sortListings[^\n]*view/);
});

test("secondary map content remains available outside desktop split", () => {
  const shell = source("components/search/LightZillowSearchShell.tsx");
  assert.match(shell, /Mon Projet AkarFinder/);
  assert.match(shell, /Ouvrir la carte complète/);
  assert.match(shell, /data-search-map-secondary="project"/);
  assert.match(shell, /data-search-map-secondary="full-map"/);
});
