import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = process.env.BOUNDARY_OUTPUT_DIR ?? "data/audits/city-boundary-prep";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "AkarFinder-city-boundary-prep/1.0 (https://github.com/hraaaaf/Akarfinder)";
const FETCH_DELAY_MS = 1_150;

const CITIES = [
  { slug: "casablanca", name: "Casablanca", query: "Casablanca, Maroc", color: "#2563EB", center: [-7.5898, 33.5731] },
  { slug: "rabat", name: "Rabat", query: "Rabat, Maroc", color: "#0F766E", center: [-6.8416, 34.0209] },
  { slug: "marrakech", name: "Marrakech", query: "Marrakech, Maroc", color: "#C2410C", center: [-7.9811, 31.6295] },
  { slug: "tanger", name: "Tanger", query: "Tanger, Maroc", color: "#7C3AED", center: [-5.8128, 35.7595] },
  { slug: "agadir", name: "Agadir", query: "Agadir, Maroc", color: "#15803D", center: [-9.5981, 30.4278] },
  { slug: "fes", name: "Fès", query: "Fès, Maroc", color: "#BE123C", center: [-5.0033, 34.0331] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function flattenCoordinates(geometry) {
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) return [];
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  return rings.flat();
}

function boundsOf(geometry) {
  const coords = flattenCoordinates(geometry);
  if (!coords.length) throw new Error("empty geometry");
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new Error("non-finite coordinate");
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  return [minLng, minLat, maxLng, maxLat];
}

function containsCenter(bbox, center) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const [lng, lat] = center;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function getAdminLevel(props) {
  return String(props?.extratags?.admin_level ?? props?.admin_level ?? "");
}

function candidateSummary(feature) {
  const p = feature.properties ?? {};
  return {
    osm_type: p.osm_type ?? null,
    osm_id: p.osm_id ?? null,
    category: p.category ?? p.class ?? null,
    type: p.type ?? null,
    display_name: p.display_name ?? null,
    admin_level: getAdminLevel(p) || null,
    geometry_type: feature.geometry?.type ?? null,
  };
}

async function fetchBoundary(city) {
  const params = new URLSearchParams({
    q: city.query,
    format: "geojson",
    polygon_geojson: "1",
    polygon_threshold: "0.001",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
    limit: "10",
    countrycodes: "ma",
  });
  const response = await fetch(`${NOMINATIM}?${params}`, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "fr,en;q=0.8",
      Accept: "application/geo+json, application/json;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`${city.name}: Nominatim HTTP ${response.status}`);
  const payload = await response.json();
  const candidates = Array.isArray(payload.features) ? payload.features : [];

  const eligible = candidates.filter((feature) => {
    const p = feature.properties ?? {};
    const category = p.category ?? p.class;
    return p.osm_type === "relation"
      && category === "boundary"
      && p.type === "administrative"
      && getAdminLevel(p) === "8"
      && ["Polygon", "MultiPolygon"].includes(feature.geometry?.type);
  });

  const selected = eligible.find((feature) => containsCenter(boundsOf(feature.geometry), city.center)) ?? null;
  if (!selected) {
    const diagnostic = candidates.map(candidateSummary);
    throw new Error(`${city.name}: no admin_level=8 relation containing expected city center. Candidates=${JSON.stringify(diagnostic)}`);
  }

  const bbox = boundsOf(selected.geometry);
  const width = bbox[2] - bbox[0];
  const height = bbox[3] - bbox[1];
  if (width <= 0 || height <= 0 || width > 2.5 || height > 2.5) {
    throw new Error(`${city.name}: implausible boundary bbox ${JSON.stringify(bbox)}`);
  }

  const p = selected.properties ?? {};
  return {
    type: "Feature",
    properties: {
      slug: city.slug,
      name: city.name,
      color: city.color,
      meaning: "identity-only",
      boundary_kind: "urban-commune",
      admin_level: 8,
      osm_type: p.osm_type,
      osm_id: p.osm_id,
      display_name: p.display_name,
      bbox,
      source: "OpenStreetMap contributors via Nominatim",
      source_url: `https://www.openstreetmap.org/relation/${p.osm_id}`,
      license: "ODbL-1.0",
    },
    geometry: selected.geometry,
  };
}

await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const features = [];
for (let index = 0; index < CITIES.length; index += 1) {
  const city = CITIES[index];
  const feature = await fetchBoundary(city);
  features.push(feature);
  console.log(`${city.name}: OSM relation ${feature.properties.osm_id} bbox=${feature.properties.bbox.join(",")}`);
  if (index < CITIES.length - 1) await sleep(FETCH_DELAY_MS);
}

const result = {
  type: "FeatureCollection",
  name: "akarfinder-morocco-flagship-city-urban-communes",
  metadata: {
    schema: "AKARFINDER_CITY_ADMIN_BOUNDARIES_V1",
    generated_at: new Date().toISOString(),
    source: "OpenStreetMap contributors via Nominatim",
    license: "ODbL-1.0",
    semantic_contract: "identity-only; administrative boundary; never price, demand, quality or inferred market geometry",
    simplification: "Nominatim polygon_threshold=0.001 degrees",
    feature_count: features.length,
  },
  features,
};

if (features.length !== CITIES.length) throw new Error(`Expected ${CITIES.length} features, got ${features.length}`);
await fs.writeFile(path.join(OUTPUT_DIR, "city-admin-boundaries.geojson"), JSON.stringify(result));
await fs.writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify({
  featureCount: features.length,
  cities: features.map((feature) => feature.properties),
}, null, 2));
console.log(JSON.stringify({ featureCount: features.length, slugs: features.map((f) => f.properties.slug) }, null, 2));
