import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCertifiedLocalHeatmapModel } from "../../../lib/ux/certified-local-heatmap";

test("heatmap requires a city and a supported property type", () => {
  assert.equal(buildCertifiedLocalHeatmapModel({ city: "all", propertyType: "Appartement" }).status, "unavailable");
  assert.equal(buildCertifiedLocalHeatmapModel({ city: "Casablanca", propertyType: "Terrain" }).status, "unavailable");
});

test("heatmap exposes only published benchmark zones with source and observation date", () => {
  const model = buildCertifiedLocalHeatmapModel({ city: "Casablanca", propertyType: "Appartement" });
  if (model.status === "available") {
    assert.ok(model.zones.length > 0);
    assert.ok(model.zones.every((zone) => zone.sourceUrl && zone.observedAt && zone.pricePerM2 > 0));
    assert.ok(model.zones.every((zone) => zone.relativeIndex >= 0 && zone.relativeIndex <= 1));
  }
});

test("heatmap never claims demand liquidity or future performance", () => {
  const model = buildCertifiedLocalHeatmapModel({ city: "Casablanca", propertyType: "Appartement" });
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("forte demande"));
  assert.ok(!text.includes("liquide"));
  assert.ok(!text.includes("quartier en hausse"));
  assert.ok(!text.includes("investissement recommandé"));
});

test("search explorer mounts the certified heatmap panel", () => {
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchPriceExplorerDock.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/CertifiedLocalHeatmapPanel.tsx"), "utf8");
  assert.match(dock, /CertifiedLocalHeatmapPanel/);
  assert.match(panel, /Carte thermique certifiée/);
  assert.match(panel, /Plus bas relatif/);
});
