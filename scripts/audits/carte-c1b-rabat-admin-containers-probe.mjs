import { mkdir, readFile, writeFile } from "node:fs/promises";

const SOURCE = "/tmp/rabat-admin.geojson";
const OUT = "data/audits/runtime/carte-c1b-rabat-admin-containers-probe.json";

await mkdir("data/audits/runtime", { recursive: true });
const geojson = JSON.parse(await readFile(SOURCE, "utf8"));
const features = Array.isArray(geojson?.features) ? geojson.features : [];

function boundsOfGeometry(geometry) {
  const coords = [];
  const walk = (value) => {
    if (!Array.isArray(value)) return;
    if (value.length === 2 && value.every((v) => typeof v === "number" && Number.isFinite(v))) {
      coords.push(value);
      return;
    }
    for (const item of value) walk(item);
  };
  walk(geometry?.coordinates);
  if (!coords.length) return null;
  return {
    west: Math.min(...coords.map(([x]) => x)),
    south: Math.min(...coords.map(([, y]) => y)),
    east: Math.max(...coords.map(([x]) => x)),
    north: Math.max(...coords.map(([, y]) => y)),
  };
}

const polygons = features
  .filter((feature) => ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type))
  .map((feature) => ({
    osm_type: feature?.properties?.["@type"] ?? null,
    osm_id: feature?.properties?.["@id"] ?? null,
    name: feature?.properties?.name ?? null,
    name_fr: feature?.properties?.["name:fr"] ?? null,
    name_ar: feature?.properties?.["name:ar"] ?? null,
    alt_name: feature?.properties?.alt_name ?? null,
    admin_level: feature?.properties?.admin_level ?? null,
    boundary: feature?.properties?.boundary ?? null,
    type: feature?.properties?.type ?? null,
    geometry_type: feature?.geometry?.type ?? null,
    bounds: boundsOfGeometry(feature?.geometry),
  }))
  .sort((a, b) => String(a.admin_level ?? "").localeCompare(String(b.admin_level ?? "")) || String(a.name ?? "").localeCompare(String(b.name ?? "")));

const relevant = polygons.filter((item) => {
  const text = [item.name, item.name_fr, item.name_ar, item.alt_name].filter(Boolean).join(" ").toLowerCase();
  return /rabat|agdal|aguedal|ryad|riad|riyad|souissi|suissi|hassan|حسان|السويسي|أكدال|الرياض/.test(text);
});

const report = {
  generated_at: new Date().toISOString(),
  mode: "read_only_offline_osm_admin_container_probe",
  source: "Geofabrik Morocco OSM PBF",
  total_admin_polygon_count: polygons.length,
  relevant_count: relevant.length,
  relevant,
  verdict: relevant.length ? "C1B_RABAT_ADMIN_CONTAINERS_FOUND" : "C1B_NO_RELEVANT_ADMIN_CONTAINERS_FOUND",
};

await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));