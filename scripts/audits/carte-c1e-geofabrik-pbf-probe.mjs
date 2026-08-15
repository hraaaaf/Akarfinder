import { mkdir, readFile, stat, writeFile } from "node:fs/promises";

const SOURCE = "/tmp/c1e-candidates.geojson";
const OUT = "data/audits/runtime/carte-c1e-geofabrik-pbf-probe.json";

const normalize = (value = "") => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
const targetOf = (name) => {
  const n = normalize(name);
  if (/^(agdal|aguedal)$/.test(n)) return "agdal";
  if (/^hay r(ia|ya|iya)d$/.test(n)) return "hay_riad";
  if (n === "souissi") return "souissi";
  if (/^(rabat centre|centre ville)$/.test(n)) return "rabat_centre";
  return null;
};

await mkdir("data/audits/runtime", { recursive: true });
let sourceBytes = 0;
let geojson = { type: "FeatureCollection", features: [] };
let parseError = null;
try {
  sourceBytes = (await stat(SOURCE)).size;
  geojson = JSON.parse(await readFile(SOURCE, "utf8"));
} catch (error) {
  parseError = String(error);
}

const allFeatures = Array.isArray(geojson?.features) ? geojson.features : [];
const polygonFeatures = allFeatures.filter((feature) => ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type));
const candidates = polygonFeatures.map((feature) => ({
  target: targetOf(feature?.properties?.name ?? ""),
  name: feature?.properties?.name ?? null,
  geometry_type: feature?.geometry?.type ?? null,
  osm_type: feature?.properties?.["@type"] ?? null,
  osm_id: feature?.properties?.["@id"] ?? null,
  place: feature?.properties?.place ?? null,
  boundary: feature?.properties?.boundary ?? null,
  admin_level: feature?.properties?.admin_level ?? null,
  type_tag: feature?.properties?.type ?? null,
  tags: feature?.properties ?? {},
  geometry: feature?.geometry ?? null,
})).filter((candidate) => candidate.target);

const byTarget = Object.fromEntries(["agdal", "hay_riad", "souissi", "rabat_centre"].map((target) => [target, candidates.filter((candidate) => candidate.target === target)]));
const report = {
  generated_at: new Date().toISOString(),
  mode: "read_only_offline_osm_snapshot_probe",
  source: "Geofabrik Morocco OSM PBF",
  source_url: "https://download.geofabrik.de/africa/morocco-latest.osm.pbf",
  source_geojson_bytes: sourceBytes,
  parse_error: parseError,
  exported_feature_count: allFeatures.length,
  polygon_feature_count: polygonFeatures.length,
  target_polygon_count: candidates.length,
  by_target_counts: Object.fromEntries(Object.entries(byTarget).map(([key, value]) => [key, value.length])),
  candidates,
  verdict: parseError
    ? "C1E_GEOFABRIK_EXPORT_UNREADABLE"
    : Object.values(byTarget).every((value) => value.length > 0)
      ? "C1E_ALL_TARGET_POLYGONS_FOUND"
      : candidates.length > 0
        ? "C1E_PARTIAL_TARGET_POLYGONS_FOUND"
        : "C1E_NO_TARGET_POLYGONS_IN_OSM_SNAPSHOT",
};

await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (parseError) process.exitCode = 2;
