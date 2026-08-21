import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CITY_TERRITORIAL_COLORS,
  CITY_TERRITORIAL_COLOR_MEANING,
  getCityTerritorialColor,
} from "../../../lib/map/city-territorial-colors";

const EXPLORER = "components/map/TerritorialExplorer.tsx";
const STYLE = "lib/map/akarfinder-territorial-style.ts";
const BOUNDARIES = "public/data/map/morocco-flagship-city-admin-boundaries.geojson";
const EXPECTED_RELATIONS: Record<string, number> = {
  casablanca: 4072985,
  rabat: 2799215,
  marrakech: 2799538,
  tanger: 2758781,
  agadir: 2529624,
  fes: 2799557,
};

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

test("committed city surfaces are six traced OSM admin-level-8 relations", async () => {
  const payload = JSON.parse(await readFile(BOUNDARIES, "utf8")) as {
    metadata?: Record<string, unknown>;
    features?: Array<{
      properties?: Record<string, unknown>;
      geometry?: { type?: string };
    }>;
  };
  const features = payload.features ?? [];
  assert.equal(features.length, 6);
  assert.equal(payload.metadata?.semantic_contract, "identity-only; administrative boundary; never price, demand, quality or inferred market geometry");

  const slugs = features.map((feature) => String(feature.properties?.slug ?? "")).sort();
  assert.deepEqual(slugs, Object.keys(EXPECTED_RELATIONS).sort());

  for (const feature of features) {
    const props = feature.properties ?? {};
    const slug = String(props.slug ?? "");
    assert.equal(props.meaning, "identity-only", slug);
    assert.equal(props.boundary_kind, "urban-commune", slug);
    assert.equal(props.admin_level, 8, slug);
    assert.equal(props.osm_type, "relation", slug);
    assert.equal(props.osm_id, EXPECTED_RELATIONS[slug], slug);
    assert.match(String(props.source_url ?? ""), new RegExp(`/relation/${EXPECTED_RELATIONS[slug]}$`), slug);
    assert.ok(feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon", slug);
  }
});

test("national MapLibre treatment mounts real surfaces but explorer never fabricates geometry", async () => {
  const [style, explorer] = await Promise.all([
    readFile(STYLE, "utf8"),
    readFile(EXPLORER, "utf8"),
  ]);

  assert.match(style, /morocco-flagship-city-admin-boundaries\.geojson/);
  assert.match(style, /AKARFINDER_CITY_ADMIN_SOURCE_ID/);
  assert.match(style, /AKARFINDER_CITY_ADMIN_FILL_LAYER_ID/);
  assert.match(style, /AKARFINDER_CITY_ADMIN_GLOW_LAYER_ID/);
  assert.match(style, /AKARFINDER_CITY_ADMIN_LINE_LAYER_ID/);
  assert.match(style, /"fill-color": \["get", "color"\]/);
  assert.match(style, /maxzoom:\s*8/);
  assert.match(style, /data-akarfinder-city-admin-surfaces/);
  assert.match(style, /data-akarfinder-city-admin-feature-count/);
  assert.match(style, /properties\.meaning === "identity-only"/);
  assert.match(style, /properties\.admin_level === 8/);

  assert.match(explorer, /\.maplibre-cluster-marker/);
  assert.match(explorer, /data-akarfinder-city-color-legend/);
  assert.match(explorer, /CITY_TERRITORIAL_COLOR_MEANING/);
  assert.match(explorer, /couleur = repère/);
  assert.doesNotMatch(explorer, /addSource\(/);
  assert.doesNotMatch(explorer, /type:\s*["']fill["']/);
});
