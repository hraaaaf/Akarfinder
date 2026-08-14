import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Map exposes a truth-safe explicit legend", () => {
  const page = fs.readFileSync("app/map/page.tsx", "utf8");
  const client = fs.readFileSync("components/map/MapNeighborhoodClient.tsx", "utf8");
  const legend = fs.readFileSync("components/map/MapLegend.tsx", "utf8");

  assert.match(page, /SiteHeader searchMode fluid/);
  assert.match(client, /<MapLegend \/>/);
  assert.match(legend, /AKARFINDER_TERRITORIAL_PALETTE/);
  assert.match(legend, /Prix observé quand un benchmark exact existe/);
  assert.match(legend, /Quartier sélectionné/);
  assert.match(legend, /ne représentent ni prix, ni qualité, ni niveau de confiance/);
});
