import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("UI-POLISH-P3 Map exposes a truth-safe explicit market legend", () => {
  const page = fs.readFileSync("app/map/page.tsx", "utf8");
  const client = fs.readFileSync("components/map/MapNeighborhoodClient.tsx", "utf8");
  const legend = fs.readFileSync("components/map/MapLegend.tsx", "utf8");

  assert.match(page, /SiteHeader searchMode fluid/);
  assert.match(client, /<MapLegend \/>/);

  // Lot 9: the legend is driven by the observed market payload, not by the
  // old non-semantic territorial palette. Keep the truth contract explicit.
  assert.match(legend, /CityMarketIntelligencePayload/);
  assert.match(legend, /data-akarfinder-intelligence-legend/);
  assert.match(legend, /Prix, Densité et Annonces/);
  assert.match(legend, /Densité indisponible sans surface de quartier admissible/);
  assert.match(legend, /Aucun quartier ne passe encore le seuil de donnée pour ce mode/);
  assert.match(legend, /Agrégation automatique par ville \+ quartier/);
  assert.match(legend, /Aucun prix ni surface n’est interpolé lorsque la preuve manque/);
});
