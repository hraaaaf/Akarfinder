#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import {
  validateNeighborhoodGeometryRecord,
  type NeighborhoodGeometry,
  type NeighborhoodGeometryRecord,
} from "../../lib/geo/neighborhood-geometry-registry";

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
}

const input = arg("--input");
const feature = JSON.parse(fs.readFileSync(input, "utf8"));
if (feature?.type !== "Feature") throw new Error("Expected GeoJSON Feature");
if (!["Polygon", "MultiPolygon"].includes(feature?.geometry?.type)) {
  throw new Error(`Unsupported geometry: ${feature?.geometry?.type}`);
}

const record: NeighborhoodGeometryRecord = {
  version: "v1",
  cityCanonicalId: arg("--city-id"),
  neighborhoodCanonicalId: arg("--neighborhood-id"),
  displayName: arg("--display-name"),
  aliases: [],
  geometry: feature.geometry as NeighborhoodGeometry,
  source: {
    provider: "OpenStreetMap contributors",
    dataset: "Geofabrik Morocco OSM PBF / OSM relation",
    sourceUrl: `https://www.openstreetmap.org/relation/${feature.properties?.osm_id}`,
    licenseId: "ODbL-1.0",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    attribution: "© OpenStreetMap contributors",
    retrievedAt: new Date().toISOString(),
  },
  publicationStatus: "shadow",
  reviewed: false,
};

const issues = validateNeighborhoodGeometryRecord(record);
const output = {
  ok: issues.length === 0,
  relation: feature.properties?.osm_id,
  geometryType: feature.geometry.type,
  publicationStatus: record.publicationStatus,
  reviewed: record.reviewed,
  issues,
};
console.log(JSON.stringify(output, null, 2));
if (issues.length) process.exit(1);
