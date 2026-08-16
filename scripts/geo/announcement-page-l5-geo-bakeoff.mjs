import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const OVERPASS_ENDPOINTS = (
  process.env.ANN_L5_OVERPASS_ENDPOINTS ||
  process.env.ANN_L5_OVERPASS_ENDPOINT ||
  DEFAULT_OVERPASS_ENDPOINTS.join(",")
).split(",").map((value) => value.trim()).filter(Boolean);
const NOMINATIM_ENDPOINT = process.env.ANN_L5_NOMINATIM_ENDPOINT || "https://nominatim.openstreetmap.org";
const OSRM_ENDPOINT = process.env.ANN_L5_OSRM_ENDPOINT || "https://router.project-osrm.org";
const OUTPUT_DIR = process.env.ANN_L5_OUTPUT_DIR || "artifacts/announcement-page-l5-geo";
const USER_AGENT = "AkarFinder-ANN-L5-Geo-Bakeoff/1.0 (+https://akarfinder.ma)";
const SAMPLE_PER_CITY = 8;
const SEARCH_RADIUS_METERS = 5_000;
const CATEGORY_QUERIES = [
  ["amenity", "school", "school"],
  ["amenity", "pharmacy", "pharmacy"],
  ["amenity", "hospital", "hospital"],
  ["amenity", "clinic", "clinic"],
  ["shop", "supermarket", "supermarket"],
  ["amenity", "bank", "bank"],
  ["leisure", "park", "park"],
  ["amenity", "cafe", "cafe"],
  ["amenity", "restaurant", "restaurant"],
  ["amenity", "place_of_worship", "place_of_worship"],
  ["shop", "mall", "mall"],
  ["public_transport", "platform", "public_transport"],
];
const PREFERRED_CATEGORIES = CATEGORY_QUERIES.map((entry) => entry[2]);
const CITIES = ["Rabat", "Casablanca", "Marrakech", "Tanger"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, init = {}, attempts = 2, timeoutMs = 30_000) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...(init.headers || {}),
        },
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1_500 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function geocodeCity(city) {
  const url = new URL("/search", NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "ma");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", `${city}, Morocco`);
  const started = performance.now();
  const payload = await fetchJson(url, {}, 2, 20_000);
  const latencyMs = Math.round(performance.now() - started);
  const hit = Array.isArray(payload) ? payload[0] : null;
  const latitude = Number(hit?.lat);
  const longitude = Number(hit?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`${city}: Nominatim returned no usable Morocco coordinate`);
  }
  return {
    coordinate: { latitude, longitude },
    displayName: hit.display_name || city,
    osmType: hit.osm_type || null,
    osmId: hit.osm_id || null,
    latencyMs,
  };
}

function overpassQuery({ latitude, longitude }) {
  const statements = CATEGORY_QUERIES.map(([key, value]) =>
    `node(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})["${key}"="${value}"];out 2;`,
  );
  return `[out:json][timeout:20];\n${statements.join("\n")}`;
}

async function fetchOverpass(query) {
  const body = new URLSearchParams({ data: query }).toString();
  let lastError;
  const attempts = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const started = performance.now();
    try {
      const payload = await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body,
      }, 1, 30_000);
      attempts.push({ endpoint, ok: true, latencyMs: Math.round(performance.now() - started) });
      return { payload, endpoint, attempts };
    } catch (error) {
      lastError = error;
      attempts.push({ endpoint, ok: false, latencyMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) });
    }
  }
  const error = lastError ?? new Error("No Overpass endpoint configured");
  error.overpassAttempts = attempts;
  throw error;
}

function categoryOf(tags = {}) {
  for (const [key, value, category] of CATEGORY_QUERIES) {
    if (tags[key] === value) return category;
  }
  return "other";
}

function selectPoints(elements) {
  const normalized = [];
  const seenCoordinates = new Set();
  for (const element of elements || []) {
    if (!Number.isFinite(element.lat) || !Number.isFinite(element.lon)) continue;
    const key = `${element.lat.toFixed(6)},${element.lon.toFixed(6)}`;
    if (seenCoordinates.has(key)) continue;
    seenCoordinates.add(key);
    normalized.push({
      osmRef: `${element.type}/${element.id}`,
      name: element.tags?.name || element.tags?.["name:fr"] || element.tags?.["name:en"] || `${element.type}/${element.id}`,
      category: categoryOf(element.tags),
      coordinate: { latitude: element.lat, longitude: element.lon },
      named: Boolean(element.tags?.name || element.tags?.["name:fr"] || element.tags?.["name:en"]),
    });
  }
  normalized.sort((a, b) => Number(b.named) - Number(a.named) || a.osmRef.localeCompare(b.osmRef));
  const selected = [];
  const selectedRefs = new Set();
  for (const category of PREFERRED_CATEGORIES) {
    const point = normalized.find((candidate) => candidate.category === category && !selectedRefs.has(candidate.osmRef));
    if (!point) continue;
    selected.push(point);
    selectedRefs.add(point.osmRef);
    if (selected.length >= SAMPLE_PER_CITY) break;
  }
  for (const point of normalized) {
    if (selected.length >= SAMPLE_PER_CITY) break;
    if (selectedRefs.has(point.osmRef)) continue;
    selected.push(point);
    selectedRefs.add(point.osmRef);
  }
  return selected.map(({ named, ...point }) => point);
}

async function sampleCity(city) {
  const geocode = await geocodeCity(city);
  const started = performance.now();
  const { payload, endpoint, attempts } = await fetchOverpass(overpassQuery(geocode.coordinate));
  const points = selectPoints(payload.elements);
  return {
    geocode,
    points,
    categoryCount: new Set(points.map((point) => point.category)).size,
    latencyMs: Math.round(performance.now() - started),
    endpoint,
    endpointAttempts: attempts,
    sourceTimestamp: payload.osm3s?.timestamp_osm_base || null,
  };
}

async function routeMatrix(points) {
  const coordinates = points.map((point) => `${point.coordinate.longitude},${point.coordinate.latitude}`).join(";");
  const url = `${OSRM_ENDPOINT.replace(/\/$/, "")}/table/v1/driving/${coordinates}?annotations=duration,distance`;
  const started = performance.now();
  const payload = await fetchJson(url, {}, 2, 25_000);
  const latencyMs = Math.round(performance.now() - started);
  if (payload.code !== "Ok" || !Array.isArray(payload.durations)) throw new Error(`OSRM table failed: ${payload.code || "unknown"}`);
  let reachable = 0;
  let total = 0;
  for (let row = 0; row < payload.durations.length; row += 1) {
    for (let col = 0; col < payload.durations[row].length; col += 1) {
      if (row === col) continue;
      total += 1;
      if (Number.isFinite(payload.durations[row][col])) reachable += 1;
    }
  }
  return { latencyMs, reachablePairs: reachable, totalPairs: total, reachableRatio: total ? reachable / total : 0 };
}

async function writeReport(report) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(`${OUTPUT_DIR}/benchmark.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  if (OVERPASS_ENDPOINTS.length === 0) throw new Error("No Overpass endpoint configured");
  await mkdir(OUTPUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const cities = [];
  try {
    for (const city of CITIES) {
      const nearby = await sampleCity(city);
      if (nearby.points.length < SAMPLE_PER_CITY) throw new Error(`${city}: only ${nearby.points.length}/${SAMPLE_PER_CITY} real OSM points found`);
      if (nearby.categoryCount < 4) throw new Error(`${city}: category diversity too low (${nearby.categoryCount}/4 required)`);
      const routing = await routeMatrix(nearby.points);
      cities.push({ city, nearby, routing });
      await writeReport({ schema: "ANNOUNCEMENT_PAGE_L5_GEO_BAKEOFF_PROGRESS_V2", generatedAt, status: "running", cities });
      await sleep(1_100);
    }
  } catch (error) {
    await writeReport({ schema: "ANNOUNCEMENT_PAGE_L5_GEO_BAKEOFF_FAILURE_V2", generatedAt, status: "failed", error: error instanceof Error ? error.message : String(error), overpassAttempts: error?.overpassAttempts || null, cities });
    throw error;
  }

  const totalPoints = cities.reduce((sum, entry) => sum + entry.nearby.points.length, 0);
  const totalReachable = cities.reduce((sum, entry) => sum + entry.routing.reachablePairs, 0);
  const totalPairs = cities.reduce((sum, entry) => sum + entry.routing.totalPairs, 0);
  const routingReachableRatio = totalPairs ? totalReachable / totalPairs : 0;
  if (totalPoints < 32) throw new Error(`ANN-L5 requires >=32 sampled points, got ${totalPoints}`);
  if (routingReachableRatio < 0.75) throw new Error(`ANN-L5 routing coverage too low: ${(routingReachableRatio * 100).toFixed(1)}%`);

  const report = {
    schema: "ANNOUNCEMENT_PAGE_L5_GEO_BAKEOFF_V3",
    generatedAt,
    status: "success",
    scope: { cities: CITIES, requiredPoints: 32, samplePerCity: SAMPLE_PER_CITY, minimumCategoriesPerCity: 4, searchRadiusMeters: SEARCH_RADIUS_METERS, maxCandidatesPerCategory: 2 },
    providers: {
      geocoding: { id: "nominatim-public-benchmark", endpoint: NOMINATIM_ENDPOINT, productionApproved: false },
      nearby: { id: "overpass-public-benchmark", endpoints: OVERPASS_ENDPOINTS, attribution: "© OpenStreetMap contributors", productionApproved: false },
      routing: { id: "osrm-project-demo-benchmark", endpoint: OSRM_ENDPOINT, attribution: "OSRM / OpenStreetMap data", productionApproved: false },
    },
    totals: { totalPoints, totalReachable, totalPairs, routingReachableRatio },
    cities,
  };
  await writeReport(report);

  const lines = [
    "# ANN-L5 Morocco Geo Bake-off", "", `Generated: ${generatedAt}`,
    `Real OSM sample points: ${totalPoints}`,
    `OSRM reachable matrix pairs: ${totalReachable}/${totalPairs} (${(routingReachableRatio * 100).toFixed(1)}%)`, "",
    "| City | Points | Categories | Geocode | Overpass | OSRM | Reachable |",
    "|---|---:|---:|---:|---:|---:|---:|",
    ...cities.map((entry) => `| ${entry.city} | ${entry.nearby.points.length} | ${entry.nearby.categoryCount} | ${entry.nearby.geocode.latencyMs} ms | ${entry.nearby.latencyMs} ms | ${entry.routing.latencyMs} ms | ${entry.routing.reachablePairs}/${entry.routing.totalPairs} |`),
    "", "Nominatim, public Overpass and OSRM demo endpoints are benchmark-only and are not approved as AkarFinder production dependencies.",
  ];
  await writeFile(`${OUTPUT_DIR}/benchmark.md`, `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ totalPoints, routingReachableRatio, cities: cities.map((entry) => ({ city: entry.city, points: entry.nearby.points.length, categories: entry.nearby.categoryCount, overpassHost: new URL(entry.nearby.endpoint).host })) }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1; });
