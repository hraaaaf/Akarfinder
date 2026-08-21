import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CITY_TERRITORIAL_COLORS,
  CITY_TERRITORIAL_COLOR_MEANING,
  getCityTerritorialColor,
} from "../../../lib/map/city-territorial-colors";

const EXPLORER = "components/map/TerritorialExplorer.tsx";

test("city color overview exposes exactly the six flagship identity colors", () => {
  assert.equal(CITY_TERRITORIAL_COLOR_MEANING, "identity-only");
  assert.equal(CITY_TERRITORIAL_COLORS.length, 6);
  assert.deepEqual(
    CITY_TERRITORIAL_COLORS.map((entry) => entry.slug),
    ["casablanca", "rabat", "marrakech", "tanger", "agadir", "fes"],
  );
  assert.equal(new Set(CITY_TERRITORIAL_COLORS.map((entry) => entry.color)).size, 6);
  assert.equal(getCityTerritorialColor("Fès")?.slug, "fes");
  assert.equal(getCityTerritorialColor("fes")?.displayName, "Fès");
  assert.equal(getCityTerritorialColor("Kénitra"), null);
  assert.equal(getCityTerritorialColor("Mohammedia"), null);
});

test("national colors decorate existing centroid markers and never fabricate boundary geometry", async () => {
  const source = await readFile(EXPLORER, "utf8");
  assert.match(source, /\.maplibre-cluster-marker/);
  assert.match(source, /data-akarfinder-city-color-legend/);
  assert.match(source, /CITY_TERRITORIAL_COLOR_MEANING/);
  assert.match(source, /couleur = repère/);
  assert.doesNotMatch(source, /addSource\(/);
  assert.doesNotMatch(source, /type:\s*["']fill["']/);
  assert.doesNotMatch(source, /Polygon/);
});
