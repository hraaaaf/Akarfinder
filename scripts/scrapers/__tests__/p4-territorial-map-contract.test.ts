import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const RABAT_EXPERIENCE = "components/map/RabatMarketIntelligenceExperience.tsx";
const SEARCH_PANEL = "components/search/SearchMapPanel.tsx";

test("P4 applies the AkarFinder territorial basemap treatment to Rabat on initial and theme style loads", async () => {
  const source = await readFile(RABAT_EXPERIENCE, "utf8");
  assert.match(source, /applyAkarFinderBasemapTreatment\(mapInstance, initialTheme\)/);
  assert.match(source, /applyAkarFinderBasemapTreatment\(map, theme\)/);
  assert.match(source, /data-p4-basemap="territorial-muted"/);
});

test("P4 Search keeps the same territorial basemap contract", async () => {
  const source = await readFile(SEARCH_PANEL, "utf8");
  assert.match(source, /applyAkarFinderBasemapTreatment\(mapInstance, "light"\)/);
  assert.match(source, /data-p4-basemap="territorial-muted"/);
  assert.match(source, /data-p4-search-map-canvas/);
});
