#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import {
  buildDistrictDiscoveryResult,
  canonicalDistrictDensity,
  type GeoJsonGeometry,
} from "./landmark-factory-geo";

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) throw new Error(`Missing ${name}`);
  return process.argv[i + 1];
}

const boundaryFeature = JSON.parse(fs.readFileSync(arg("--boundary"), "utf8"));
if (boundaryFeature?.type !== "Feature") throw new Error("Boundary must be a GeoJSON Feature");
if (boundaryFeature?.properties?.geometry_valid !== true) throw new Error("Boundary lacks geometry_valid=true authoring proof");

const districtId = arg("--district-id");
const district = canonicalDistrictDensity().find((x) => x.districtId === districtId);
if (!district) throw new Error(`Unknown canonical district: ${districtId}`);

const raw = fs.readFileSync(arg("--poi-jsonl"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const minimumHeuristic = Number(process.env.LANDMARK_MIN_HEURISTIC ?? "50");
const result = buildDistrictDiscoveryResult(
  district,
  boundaryFeature.geometry as GeoJsonGeometry,
  raw,
  minimumHeuristic,
);

const output = {
  ...result,
  boundary: {
    osmType: boundaryFeature.properties?.osm_type,
    osmId: boundaryFeature.properties?.osm_id,
    name: boundaryFeature.properties?.name,
    adminLevel: boundaryFeature.properties?.admin_level,
    relationType: boundaryFeature.properties?.relation_type,
  },
  rawPoolCount: raw.length,
  minimumHeuristic,
};

const out = arg("--out");
fs.writeFileSync(out, JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  districtId: output.districtId,
  rawPoolCount: output.rawPoolCount,
  shortlisted: output.candidates.length,
  candidates: output.candidates.slice(0, 20).map((x) => ({
    name: x.name, osmType: x.osmType, osmId: x.osmId,
    lat: x.lat, lng: x.lng, heuristic: x.heuristic.total,
  })),
}, null, 2));
