import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const OVERPASS_ENDPOINT = process.env.ANN_L5_OVERPASS_ENDPOINT || "https://overpass-api.de/api/interpreter";
const OSRM_ENDPOINT = process.env.ANN_L5_OSRM_ENDPOINT || "https://router.project-osrm.org";
const OUTPUT_DIR = process.env.ANN_L5_OUTPUT_DIR || "artifacts/announcement-page-l5-geo";
const USER_AGENT = "AkarFinder-ANN-L5-Geo-Bakeoff/1.0 (+https://akarfinder.ma)";
const SAMPLE_PER_CITY = 8;

const CITIES = [
  { id: "rabat", label: "Rabat", aliases: ["Rabat", "الرباط"] },
  { id: "casablanca", label: "Casablanca", aliases: ["Casablanca", "الدار البيضاء"] },
  { id: "marrakech", label: "Marrakech", aliases: ["Marrakech", "Marrakesh", "مراكش"] },
  { id: "tanger", label: "Tanger", aliases: ["Tanger", "Tangier", "طنجة"] },
];

function escapeOverpassRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cityRegex(city) {
  return `^(${city.aliases.map(escapeOverpassRegex).join("|")})$`;
}

function overpassQuery(city) {
  const pattern = cityRegex(city);
  return `[out:json][timeout:40];
area["ISO3166-1"="MA"]["boundary"="administrative"]->.country;
(
  rel(area.country)["boundary"="administrative"]["name"~"${pattern}",i];
  rel(area.country)["boundary"="administrative"]["name:fr"~"${pattern}",i];
  rel(area.country)["boundary"="administrative"]["name:en"~"${pattern}",i];
);
map_to_area -> .city;
(
  nwr(area.city)["amenity"~"^(school|pharmacy|hospital|clinic|bank|cafe|restaurant|place_of_worship)$"];
  nwr(area.city)["shop"~"^(supermarket|mall)$"];
  nwr(area.city)["leisure"="park"];
  nwr(area.city)["public_transport"];
);
out center 120;`;
}

async function fetchJson(url, init = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function elementCoordinate(element) {
  const latitude = typeof element.lat === "number" ? element.lat : element.center?.lat;
  const longitude = typeof element.lon === "number" ? element.lon : element.center?.lon;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function categoryOf(tags = {}) {
  return tags.amenity || tags.shop || tags.leisure || tags.public_transport || "other";
}

function selectPoints(elements) {
  const normalized = [];
  const seen = new Set();
  for (const element of elements || []) {
    const coordinate = elementCoordinate(element);
    if (!coordinate) continue;
    const key = `${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      osmRef: `${element.type}/${element.id}`,
      name: element.tags?.name || element.tags?.["name:fr"] || element.tags?.["name:en"] || `${element.type}/${element.id}`,
      category: categoryOf(element.tags),
      coordinate,
      named: Boolean(element.tags?.name || element.tags?.["name:fr"] || element.tags?.["name:en"]),
    });
  }
  normalized.sort((a, b) => Number(b.named) - Number(a.named) || a.osmRef.localeCompare(b.osmRef));
  return normalized.slice(0, SAMPLE_PER_CITY).map(({ named, ...point }) => point);
}

async function sampleCity(city) {
  const started = performance.now();
  const body = new URLSearchParams({ data: overpassQuery(city) }).toString();
  const payload = await fetchJson(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  const latencyMs = Math.round(performance.now() - started);
  const points = selectPoints(payload.elements);
  return { points, latencyMs, sourceTimestamp: payload.osm3s?.timestamp_osm_base || null };
}

async function routeMatrix(points) {
  const coordinates = points.map((point) => `${point.coordinate.longitude},${point.coordinate.latitude}`).join(";");
  const url = `${OSRM_ENDPOINT.replace(/\/$/, "")}/table/v1/driving/${coordinates}?annotations=duration,distance`;
  const started = performance.now();
  const payload = await fetchJson(url);
  const latencyMs = Math.round(performance.now() - started);
  if (payload.code !== "Ok" || !Array.isArray(payload.durations)) {
    throw new Error(`OSRM table failed: ${payload.code || "unknown"}`);
  }
  let reachable = 0;
  let total = 0;
  for (let row = 0; row < payload.durations.length; row += 1) {
    for (let col = 0; col < payload.durations[row].length; col += 1) {
      if (row === col) continue;
      total += 1;
      if (Number.isFinite(payload.durations[row][col])) reachable += 1;
    }
  }
  return {
    latencyMs,
    reachablePairs: reachable,
    totalPairs: total,
    reachableRatio: total ? reachable / total : 0,
    dataVersion: payload.data_version || null,
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const cities = [];

  for (const city of CITIES) {
    const nearby = await sampleCity(city);
    if (nearby.points.length < SAMPLE_PER_CITY) {
      throw new Error(`${city.label}: only ${nearby.points.length}/${SAMPLE_PER_CITY} real OSM points found`);
    }
    const routing = await routeMatrix(nearby.points);
    cities.push({ city: city.label, nearby, routing });
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  const totalPoints = cities.reduce((sum, entry) => sum + entry.nearby.points.length, 0);
  const totalReachable = cities.reduce((sum, entry) => sum + entry.routing.reachablePairs, 0);
  const totalPairs = cities.reduce((sum, entry) => sum + entry.routing.totalPairs, 0);
  const routingReachableRatio = totalPairs ? totalReachable / totalPairs : 0;

  const report = {
    schema: "ANNOUNCEMENT_PAGE_L5_GEO_BAKEOFF_V1",
    generatedAt,
    scope: {
      cities: CITIES.map((city) => city.label),
      requiredPoints: CITIES.length * SAMPLE_PER_CITY,
      samplePerCity: SAMPLE_PER_CITY,
    },
    providers: {
      nearby: {
        id: "overpass-public-benchmark",
        endpoint: OVERPASS_ENDPOINT,
        attribution: "© OpenStreetMap contributors",
        productionApproved: false,
        purpose: "ANN-L5 coverage/latency benchmark only",
      },
      routing: {
        id: "osrm-project-demo-benchmark",
        endpoint: OSRM_ENDPOINT,
        attribution: "OSRM / OpenStreetMap data",
        productionApproved: false,
        purpose: "ANN-L5 routing coverage/latency benchmark only",
      },
    },
    totals: { totalPoints, totalReachable, totalPairs, routingReachableRatio },
    cities,
  };

  if (totalPoints < 32) throw new Error(`ANN-L5 requires >=32 sampled points, got ${totalPoints}`);
  if (routingReachableRatio < 0.75) {
    throw new Error(`ANN-L5 routing coverage too low: ${(routingReachableRatio * 100).toFixed(1)}%`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(`${OUTPUT_DIR}/benchmark.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const lines = [
    "# ANN-L5 Morocco Geo Bake-off",
    "",
    `Generated: ${generatedAt}`,
    `Real OSM sample points: ${totalPoints}`,
    `OSRM reachable matrix pairs: ${totalReachable}/${totalPairs} (${(routingReachableRatio * 100).toFixed(1)}%)`,
    "",
    "| City | Points | Overpass latency | OSRM latency | Reachable pairs |",
    "|---|---:|---:|---:|---:|",
    ...cities.map((entry) => `| ${entry.city} | ${entry.nearby.points.length} | ${entry.nearby.latencyMs} ms | ${entry.routing.latencyMs} ms | ${entry.routing.reachablePairs}/${entry.routing.totalPairs} |`),
    "",
    "Public Overpass and OSRM demo endpoints are benchmark-only and are not approved as AkarFinder production dependencies.",
  ];
  await writeFile(`${OUTPUT_DIR}/benchmark.md`, `${lines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify({ totalPoints, routingReachableRatio, cities: cities.map((entry) => ({ city: entry.city, points: entry.nearby.points.length, overpassMs: entry.nearby.latencyMs, osrmMs: entry.routing.latencyMs })) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
