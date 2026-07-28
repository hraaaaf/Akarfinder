import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = resolve(ROOT, "lib/geo/casablanca-neighborhood-geometry-shadow.ts");
const OUTPUT_PATH = resolve(ROOT, "data/geo/casablanca-arrondissements-osm.json");

const source = await readFile(REGISTRY_PATH, "utf8");
const pattern = /candidate\(\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\[([^\]]*)\]\s*\)/g;
const candidates = [];
for (const match of source.matchAll(pattern)) {
  const aliases = [...match[4].matchAll(/"([^"]+)"/g)].map((alias) => alias[1]);
  candidates.push({
    osmRelationId: Number(match[1]),
    neighborhoodCanonicalId: match[2],
    displayName: match[3],
    aliases,
  });
}

if (candidates.length !== 16) {
  throw new Error(`Expected 16 Casablanca arrondissement candidates, found ${candidates.length}.`);
}

const osmIds = candidates.map((candidate) => `R${candidate.osmRelationId}`).join(",");
const endpoint = new URL("https://nominatim.openstreetmap.org/lookup");
endpoint.searchParams.set("osm_ids", osmIds);
endpoint.searchParams.set("format", "geojson");
endpoint.searchParams.set("polygon_geojson", "1");
endpoint.searchParams.set("namedetails", "1");
endpoint.searchParams.set("extratags", "1");

const response = await fetch(endpoint, {
  headers: {
    "User-Agent": "AkarFinder-geometry-audit/1.0 (+https://github.com/hraaaaf/Akarfinder)",
    Accept: "application/geo+json, application/json",
  },
});
if (!response.ok) {
  throw new Error(`Nominatim lookup failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
  throw new Error("Nominatim response is not a GeoJSON FeatureCollection.");
}

const byRelationId = new Map();
for (const feature of payload.features) {
  const relationId = Number(feature?.properties?.osm_id);
  if (Number.isSafeInteger(relationId)) byRelationId.set(relationId, feature);
}

const retrievedAt = new Date().toISOString();
const features = candidates.map((candidate) => {
  const sourceFeature = byRelationId.get(candidate.osmRelationId);
  if (!sourceFeature) throw new Error(`Missing geometry for OSM relation ${candidate.osmRelationId}.`);
  const geometry = sourceFeature.geometry;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
    throw new Error(`Relation ${candidate.osmRelationId} has unsupported geometry type ${geometry?.type ?? "missing"}.`);
  }
  return {
    type: "Feature",
    id: `osm-relation-${candidate.osmRelationId}`,
    properties: {
      version: "v1",
      cityCanonicalId: "casablanca",
      neighborhoodCanonicalId: candidate.neighborhoodCanonicalId,
      displayName: candidate.displayName,
      aliases: candidate.aliases,
      sourceEntityType: "osm_relation",
      sourceEntityId: candidate.osmRelationId,
      sourceAdminLevel: String(sourceFeature?.properties?.extratags?.admin_level ?? "10"),
      sourceUrl: `https://www.openstreetmap.org/relation/${candidate.osmRelationId}`,
      licenseId: "ODbL-1.0",
      licenseUrl: "https://www.openstreetmap.org/copyright",
      attribution: "© OpenStreetMap contributors",
      retrievedAt,
      geometryStatus: "materialized",
      publicationStatus: "shadow",
      reviewed: false,
      upstreamDisplayName: sourceFeature?.properties?.display_name ?? null,
    },
    geometry,
  };
});

await mkdir(resolve(ROOT, "data/geo"), { recursive: true });
await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify({
    type: "FeatureCollection",
    name: "Casablanca arrondissements — OSM Shadow",
    attribution: "© OpenStreetMap contributors",
    license: "ODbL-1.0",
    generatedAt: retrievedAt,
    features,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Materialized ${features.length} Casablanca arrondissement geometries at ${OUTPUT_PATH}.`);
