import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildCityNeighborhoodExplorerModel,
  cityNeighborhoodExplorerChangesRanking,
} from "../../../lib/ux/city-neighborhood-explorer";

test("national explorer requires a supported property type", () => {
  const model = buildCityNeighborhoodExplorerModel({ propertyType: "terrain" });
  assert.equal(model.status, "unavailable");
  assert.equal(model.cities.length, 0);
});

test("city selection exposes only published neighborhood references", () => {
  const national = buildCityNeighborhoodExplorerModel({ propertyType: "appartement" });
  assert.equal(national.status, "available");
  assert.ok(national.cities.length > 0);

  const selected = buildCityNeighborhoodExplorerModel({
    propertyType: "appartement",
    selectedCity: national.cities[0].city,
  });
  for (const neighborhood of selected.neighborhoods) {
    assert.ok(neighborhood.pricePerM2 > 0);
    assert.ok(neighborhood.sourceUrl);
    assert.ok(neighborhood.observedAt);
  }
});

test("explorer never fabricates attractiveness or future performance", () => {
  const model = buildCityNeighborhoodExplorerModel({ propertyType: "appartement" });
  const text = JSON.stringify(model).toLowerCase();
  assert.ok(!text.includes("meilleur quartier"));
  assert.ok(!text.includes("forte demande"));
  assert.ok(!text.includes("rentable"));
  assert.ok(!text.includes("potentiel futur"));
  assert.equal(cityNeighborhoodExplorerChangesRanking(), false);
});

test("map panel mounts synchronized city neighborhood exploration and certified colors", () => {
  const map = readFileSync(resolve(process.cwd(), "components/search/SearchMapPanel.tsx"), "utf8");
  const dock = readFileSync(resolve(process.cwd(), "components/search/SearchMapNeighborhoodDock.tsx"), "utf8");
  const panel = readFileSync(resolve(process.cwd(), "components/search/CityNeighborhoodExplorerPanel.tsx"), "utf8");

  assert.match(map, /SearchMapNeighborhoodDock/);
  assert.match(dock, /CityNeighborhoodExplorerPanel/);
  assert.match(dock, /CertifiedLocalHeatmapPanel/);
  assert.match(dock, /Aucune limite de quartier n’est dessinée sans géométrie officielle ou certifiée/);
  assert.match(panel, /window\.history\.pushState/);
  assert.match(panel, /new PopStateEvent\("popstate"\)/);
  assert.match(panel, /Voir toutes les villes/);
  assert.match(panel, /Aucun quartier publiable/);
});
