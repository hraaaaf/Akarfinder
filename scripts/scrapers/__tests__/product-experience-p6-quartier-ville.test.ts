import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CITY_PAGE = "app/immobilier/[city]/page.tsx";
const DISTRICT_PAGE = "app/immobilier/[city]/[district]/page.tsx";
const MAP = "components/map/TerritoryMiniMap.tsx";
const PREVIEW = "components/geo/GeoResultPreview.tsx";

function ordered(source: string, needles: string[]) {
  let cursor = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle);
    assert.ok(index > cursor, `${needle} must appear after previous canonical stage`);
    cursor = index;
  }
}

test("P6 city follows Territory → Goods → Decision and remains truth-safe", async () => {
  const source = await readFile(CITY_PAGE, "utf8");
  assert.match(source, /data-p6-experience="ville"/);
  ordered(source, ['data-p6-stage="territoire"', 'data-p6-stage="biens"', 'data-p6-stage="decision"']);
  assert.match(source, /marketNeighborhoodCount/);
  assert.match(source, /lifestyleSignals/);
  assert.match(source, /getCanonicalNeighborhoodBySlug/);
  assert.match(source, /accent="brand"/);
  assert.doesNotMatch(source, /MARKET_DATA|median_price_per_m2|bronze-500|from-bronze|to-bronze/);
  assert.match(source, /aucune moyenne implicite/i);
});

test("P6 district surfaces only existing neighborhood intelligence", async () => {
  const source = await readFile(DISTRICT_PAGE, "utf8");
  assert.match(source, /data-p6-experience="quartier"/);
  ordered(source, ['data-p6-stage="territoire"', 'data-p6-stage="biens"', 'data-p6-stage="decision"']);
  assert.match(source, /n\.intelligence\?\.priceLabel/);
  assert.match(source, /n\.intelligence\?\.pricePeriod/);
  assert.match(source, /n\.intelligence\?\.proximityHighlights/);
  assert.match(source, /getCanonicalNeighborhoodBySlug/);
  assert.match(source, /accent="brand"/);
  assert.doesNotMatch(source, /MARKET_DATA|median_price_per_m2|bronze-500|from-bronze|to-bronze/);
  assert.match(source, /Aucune position n’est inventée/);
});

test("P6 territory map keeps map attribution and no interactive mutation", async () => {
  const source = await readFile(MAP, "utf8");
  assert.match(source, /data-p6-territory-map/);
  assert.match(source, /interactive: false/);
  assert.match(source, /OpenStreetMap contributors/);
  assert.match(source, /OpenFreeMap/);
  assert.match(source, /applyAkarFinderBasemapTreatment/);
});

test("GeoResultPreview brand accent is opt-in and backward-compatible", async () => {
  const source = await readFile(PREVIEW, "utf8");
  assert.match(source, /accent\?: "default" \| "brand"/);
  assert.match(source, /accent = "default"/);
  assert.match(source, /accent === "brand" \? "text-brand-primary" : "text-bronze-500"/);
});
