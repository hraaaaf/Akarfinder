import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("app/search/mockup-convergence-l2.css", "utf8");
const mapPanel = readFileSync("components/search/SearchMapPanel.tsx", "utf8");

test("C2 split desktop gives the map the dominant column", () => {
  assert.match(css, /grid-template-columns:\s*minmax\(350px, 0\.68fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\[data-search-list-pane\][\s\S]*overflow-y:\s*auto/);
});

test("C2 split mobile and tablet are map-first with docked results", () => {
  assert.match(css, /\[data-search-map-pane\][\s\S]*order:\s*1/);
  assert.match(css, /\[data-search-list-pane\][\s\S]*order:\s*2/);
  assert.match(css, /margin-top:\s*-22px/);
  assert.match(css, /border-radius:\s*24px 24px 0 0/);
});

test("C2 split result cards become one-column horizontal decision rows", () => {
  assert.match(css, /data-search-continuous-flow[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /data-mobile-compact-card[\s\S]*grid-template-columns:\s*118px minmax\(0, 1fr\)/);
});

test("C2 preserves phone modal lock but releases inline filters from 640px", () => {
  assert.match(css, /@media \(min-width: 640px\)[\s\S]*body:has\(\[data-search-advanced-filters\]\.sm\\:block\)[\s\S]*overflow:\s*auto !important/);
});

test("C2 Search uses the real MapLibre renderer and removes the legacy Morocco SVG", () => {
  assert.match(mapPanel, /data-search-map-renderer="maplibre"/);
  assert.match(mapPanel, /import\("maplibre-gl"\)/);
  assert.match(mapPanel, /tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(mapPanel, /applyAkarFinderBasemapTreatment/);
  assert.match(mapPanel, /hasCertifiedExactCoordinates/);
  assert.match(mapPanel, /setLngLat\(\[listing\.longitude!, listing\.latitude!\]\)/);
  assert.doesNotMatch(mapPanel, /MOROCCO_PATH|MOROCCO_VIEWBOX/);
});
