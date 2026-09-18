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
  assert.match(source, /const labelYOffset = city\.slug === "rabat" \? -24 : 0;/);
  assert.match(source, /y: screenY \+ labelYOffset/);
});

test("national zoom stays centered around the map viewport", () => {
  assert.match(source, /const nextK = Math\.min\(7\.4, Math\.max\(1, camera\.k \* factor\)\);/);
  assert.match(source, /const nextX = centerX - \(centerX - camera\.x\) \* scale;/);
  assert.match(source, /const nextY = centerY - \(centerY - camera\.y\) \* scale;/);
  assert.match(source, /applyCamera\(zoomIdentity\.translate\(nextX, nextY\)\.scale\(nextK\)\);/);
});
