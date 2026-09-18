import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync("components/map/PremiumInteractiveMap.tsx", "utf8");

test("LOT9 national map consumes the territory visibility engine", () => {
  assert.match(source, /selectNationalCityVisibility/);
  assert.match(source, /selectStableTerritoryLabels/);
  assert.match(source, /data-national-territory-zoom/);
});

test("national city labels expose stable QA hooks and importance", () => {
  assert.match(source, /data-national-city-label=/);
  assert.match(source, /data-national-city-importance=/);
  assert.match(source, /data-national-city-label-count=/);
});

test("direct national city selection restores the canonical parent region state", () => {
  assert.match(source, /regions\.find\(\(region\) => region\.cities\.some/);
  assert.match(source, /setSelectedRegionSlug\(parentRegion\?\.slug \?\? null\)/);
});

test("national labels remain separate from region-level city markers", () => {
  assert.match(source, /level === "national" && nationalCityRenderItems\.map/);
  assert.match(source, /level !== "national" && selectedRegion && selectedRegion\.cities\.map/);
});

test("national zoom attaches only after the projected SVG exists", () => {
  assert.match(source, /if \(!projection \|\| !svgRef\.current\) return;/);
  assert.match(source, /\}, \[projection\]\);/);
});

test("Rabat keeps a dedicated national label offset to coexist with Casablanca and Fes", () => {
  assert.match(source, /city\.slug === "rabat" \? -24/);
  assert.match(source, /y: screenY \+ labelYOffset/);
});

test("national zoom uses the D3 behavior around the northern urban reading anchor", () => {
  assert.match(source, /zoomBehaviorRef\.current\.scaleBy,/);
  assert.match(source, /NATIONAL_ZOOM_ANCHOR,/);
});

test("national geometry uses the same native SVG transform model as D3", () => {
  assert.match(source, /<g transform=\{\`translate\(\$\{camera\.x\} \$\{camera\.y\}\) scale\(\$\{camera\.k\}\)\`\}>/);
  assert.doesNotMatch(source, /animate=\{\{ x: camera\.x, y: camera\.y, scale: camera\.k \}\}/);
});

test("semantic national zoom reveals secondary cities after one moderate zoom step", () => {
  assert.match(source, /const nationalTerritoryZoom = 4\.2 \+ Math\.max\(0, camera\.k - 1\) \* 6;/);
});

test("national label capacity reaches eight at one moderate zoom step", () => {
  assert.match(source, /const capacity = camera\.k < 1\.1 \? 6 : camera\.k < 1\.2 \? 7 : 8;/);
});

test("Mohammedia gets a collision offset between Casablanca and Rabat", () => {
  assert.match(source, /city\.slug === "mohammedia" \? 28 : 0/);
});

test("Kénitra keeps a dedicated top-left label offset with collision padding clearance", () => {
  assert.match(source, /city\.slug === "kenitra" \? -52/);
  assert.match(source, /city\.slug === "rabat" \|\| city\.slug === "kenitra" \? -1 : 1/);
});

test("Kénitra uses a two-axis callout instead of vertical-only nudging", () => {
  assert.match(source, /const labelXOffset = city\.slug === "kenitra" \? -34 : 0;/);
  assert.match(source, /labelCenterX = screenX \+ direction \* \(labelWidth \/ 2 \+ 17\) \+ labelXOffset/);
});

test("national zoom anchor protects northern flagship labels", () => {
  assert.match(source, /const NATIONAL_ZOOM_ANCHOR: \[number, number\] = \[MAP_WIDTH \* 0\.53, MAP_HEIGHT \* 0\.15\];/);
});
