import { mkdir, writeFile } from "node:fs/promises";

const OUT = "data/audits/runtime/carte-c1d-osm-polygon-probe.json";
const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const bbox = "33.90,-6.95,34.05,-6.75";
const names = "Agdal|Aguedal|Hay Riad|Hay Ryad|Hay Riyad|Souissi|Rabat Centre|Centre Ville|Centre-Ville";
const query = `[out:json][timeout:45];\n(\n  way(${bbox})[name~\"${names}\",i];\n  relation(${bbox})[name~\"${names}\",i];\n);\nout tags center geom;`;

await mkdir("data/audits/runtime", { recursive: true });

const attempts = [];
let payload = null;
let endpointUsed = null;
for (const endpoint of endpoints) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await response.text();
    attempts.push({ endpoint, status: response.status, ok: response.ok, bytes: text.length });
    if (!response.ok) continue;
    payload = JSON.parse(text);
    endpointUsed = endpoint;
    break;
  } catch (error) {
    attempts.push({ endpoint, status: null, ok: false, error: String(error) });
  }
}

const raw = payload?.elements ?? [];
const candidates = raw.map((element) => {
  const geometry = Array.isArray(element.geometry) ? element.geometry : [];
  const closedWay = element.type === "way" && geometry.length >= 4 && geometry[0]?.lat === geometry.at(-1)?.lat && geometry[0]?.lon === geometry.at(-1)?.lon;
  const relationPolygon = element.type === "relation" && ["multipolygon", "boundary"].includes(element.tags?.type);
  const polygonEligible = closedWay || relationPolygon;
  return {
    type: element.type,
    id: element.id,
    name: element.tags?.name ?? null,
    tags: element.tags ?? {},
    polygon_eligible: polygonEligible,
    geometry_points: geometry.length,
    center: element.center ?? null,
    geometry: polygonEligible ? geometry : undefined,
  };
});

const polygonCandidates = candidates.filter((item) => item.polygon_eligible);
const byTarget = {
  agdal: polygonCandidates.filter((item) => /agdal|aguedal/i.test(item.name ?? "")),
  hay_riad: polygonCandidates.filter((item) => /hay\s+r(ia|ya)d/i.test(item.name ?? "")),
  souissi: polygonCandidates.filter((item) => /souissi/i.test(item.name ?? "")),
  rabat_centre: polygonCandidates.filter((item) => /rabat\s+centre|centre[-\s]?ville/i.test(item.name ?? "")),
};

const report = {
  generated_at: new Date().toISOString(),
  mode: "read_only_secondary_geometry_probe",
  source: "OpenStreetMap via Overpass",
  bbox,
  attempts,
  endpoint_used: endpointUsed,
  raw_count: raw.length,
  candidate_count: candidates.length,
  polygon_candidate_count: polygonCandidates.length,
  by_target_counts: Object.fromEntries(Object.entries(byTarget).map(([key, value]) => [key, value.length])),
  candidates,
  verdict: !payload
    ? "C1D_OVERPASS_UNREACHABLE"
    : Object.values(byTarget).every((value) => value.length > 0)
      ? "C1D_ALL_TARGET_POLYGONS_FOUND"
      : polygonCandidates.length > 0
        ? "C1D_PARTIAL_TARGET_POLYGONS_FOUND"
        : "C1D_NO_NEIGHBORHOOD_POLYGONS_FOUND",
};

await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (!payload) process.exitCode = 2;
