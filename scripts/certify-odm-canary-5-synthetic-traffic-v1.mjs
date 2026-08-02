import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = (process.env.AKARFINDER_PRODUCTION_URL || "https://akarfinder.vercel.app").replace(/\/$/, "");
const CANARY_PERCENT = 5;
const CANARY_TARGET = 80;
const LEGACY_TARGET = 160;
const CONCURRENCY = 6;
const TIMEOUT_MS = 30_000;

function bucket(key) {
  return createHash("sha256").update(key).digest().readUInt32BE(0) % 10_000;
}

function stableSearchKey(query) {
  return JSON.stringify({
    q: query.q ?? null,
    city: query.city ?? null,
    property_type: query.property_type ?? null,
    transaction_type: query.transaction_type ?? null,
    min_price: query.min_price ?? null,
    max_price: query.max_price ?? null,
    min_surface: query.min_surface ?? null,
    max_surface: query.max_surface ?? null,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  });
}

const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès", "Oujda", "Kénitra", "Témara", "Salé"];
const propertyTypes = ["apartment", "villa", "land", "office"];
const intents = ["sale", "rent", "new"];
const priceBands = {
  sale: [[100000, 900000], [500000, 1500000], [1000000, 3500000], [2500000, 8000000]],
  rent: [[1000, 5000], [3000, 10000], [7000, 20000], [15000, 50000]],
  new: [[200000, 1000000], [700000, 2000000], [1500000, 5000000]],
};
const surfaceBands = [[20, 80], [50, 150], [100, 300], [200, 1000]];

function candidateQueries() {
  const rows = [];
  let serial = 0;
  for (const city of cities) {
    for (const property_type of propertyTypes) {
      for (const transaction_type of intents) {
        for (const [min_price, max_price] of priceBands[transaction_type]) {
          for (const [min_surface, max_surface] of surfaceBands) {
            for (let variant = 0; variant < 12; variant += 1) {
              rows.push({
                q: variant % 3 === 0 ? undefined : `${city} ${property_type} ${transaction_type}`,
                city,
                property_type,
                transaction_type,
                min_price,
                max_price,
                min_surface,
                max_surface,
                limit: 5,
                offset: serial % 97,
              });
              serial += 1;
            }
          }
        }
      }
    }
  }
  return rows;
}

function selectTraffic() {
  const canary = [];
  const legacy = [];
  for (const query of candidateQueries()) {
    const key = stableSearchKey(query);
    const b = bucket(key);
    const item = { query, stable_key: key, bucket: b };
    if (b < CANARY_PERCENT * 100 && canary.length < CANARY_TARGET) canary.push(item);
    if (b >= CANARY_PERCENT * 100 && legacy.length < LEGACY_TARGET) legacy.push(item);
    if (canary.length === CANARY_TARGET && legacy.length === LEGACY_TARGET) break;
  }
  if (canary.length !== CANARY_TARGET || legacy.length !== LEGACY_TARGET) {
    throw new Error(`Unable to build traffic set: canary=${canary.length}, legacy=${legacy.length}`);
  }
  return [...canary.map((x) => ({ ...x, expected_lane: "canary" })), ...legacy.map((x) => ({ ...x, expected_lane: "legacy" }))];
}

function qs(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  return params.toString();
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function norm(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validateListing(item, listing, lane) {
  const errors = [];
  const q = item.query;
  if (q.city && norm(listing.city) !== norm(q.city)) errors.push(`city:${listing.city}`);
  if (q.property_type && !norm(listing.property_type).includes(norm(q.property_type).replace("apartment", "appartement"))) {
    const aliases = { apartment: "appartement", land: "terrain", office: "bureau", villa: "villa" };
    if (norm(listing.property_type) !== aliases[norm(q.property_type)]) errors.push(`property_type:${listing.property_type}`);
  }
  const expectedTx = q.transaction_type === "sale" ? "buy" : q.transaction_type;
  if (q.transaction_type && norm(listing.transaction_type) !== norm(expectedTx)) errors.push(`transaction_type:${listing.transaction_type}`);
  const price = listing.price == null ? null : Number(listing.price);
  if (q.min_price != null && (price == null || price < q.min_price)) errors.push(`min_price:${listing.price}`);
  if (q.max_price != null && (price == null || price > q.max_price)) errors.push(`max_price:${listing.price}`);
  const surface = Number(listing.surface_m2 || 0);
  if (q.min_surface != null && surface < q.min_surface) errors.push(`min_surface:${listing.surface_m2}`);
  if (q.max_surface != null && surface > q.max_surface) errors.push(`max_surface:${listing.surface_m2}`);
  if (lane === "canary") {
    if (!String(listing.id || "").startsWith("seed_")) errors.push(`canary_id:${listing.id}`);
    if (listing.result_origin !== "search_api") errors.push(`result_origin:${listing.result_origin}`);
    if (listing.search_result_display_mode !== "thin_indexed_seed") errors.push(`display_mode:${listing.search_result_display_mode}`);
    if (listing.production_allowed !== true || listing.can_show_result !== true) errors.push("publication_contract");
    if (listing.can_show_contact === true || listing.can_show_gallery === true) errors.push("privacy_contract");
  }
  return errors;
}

async function execute(item) {
  const url = `${BASE_URL}/api/search?${qs(item.query)}`;
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { "user-agent": "AkarFinder-ODM-Canary-Certification/1.0" }, signal: controller.signal });
    const latency_ms = Math.round((performance.now() - started) * 100) / 100;
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    const failures = [];
    if (response.status !== 200) failures.push(`http:${response.status}`);
    if (!body || !Array.isArray(body.listings)) failures.push("invalid_json_contract");
    const actualLane = body?.source === "database_fallback" ? "canary" : "legacy";
    if (actualLane !== item.expected_lane) failures.push(`lane:${actualLane}`);
    const listingFailures = [];
    for (const listing of body?.listings || []) {
      const errors = validateListing(item, listing, item.expected_lane);
      if (errors.length) listingFailures.push({ id: listing.id, errors });
    }
    if (listingFailures.length) failures.push("filter_or_contract_leak");
    return { ...item, url, status: response.status, latency_ms, actual_lane: actualLane, source: body?.source, total: body?.total, returned: body?.listings?.length ?? null, failures, listing_failures: listingFailures };
  } catch (error) {
    return { ...item, url, status: 0, latency_ms: Math.round((performance.now() - started) * 100) / 100, actual_lane: "error", failures: [`request:${error instanceof Error ? error.message : String(error)}`], listing_failures: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function mapConcurrent(items, concurrency) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await execute(items[index]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return output;
}

const distributionSample = candidateQueries().slice(0, 10_000);
const computedCanary = distributionSample.filter((q) => bucket(stableSearchKey(q)) < CANARY_PERCENT * 100).length;
const computedRate = computedCanary / distributionSample.length;
const traffic = selectTraffic();
const results = await mapConcurrent(traffic, CONCURRENCY);
const failures = results.filter((row) => row.failures.length > 0);
const canaryRows = results.filter((row) => row.expected_lane === "canary");
const legacyRows = results.filter((row) => row.expected_lane === "legacy");
const latencies = results.map((row) => row.latency_ms);
const canaryLatencies = canaryRows.map((row) => row.latency_ms);
const legacyLatencies = legacyRows.map((row) => row.latency_ms);

const report = {
  certification: "ODM_CANARY_5_SYNTHETIC_TRAFFIC_V1",
  generated_at: new Date().toISOString(),
  base_url: BASE_URL,
  requested: results.length,
  expected_canary: canaryRows.length,
  expected_legacy: legacyRows.length,
  observed_canary: results.filter((r) => r.actual_lane === "canary").length,
  observed_legacy: results.filter((r) => r.actual_lane === "legacy").length,
  http_200: results.filter((r) => r.status === 200).length,
  failures: failures.length,
  filter_or_contract_leaks: results.filter((r) => r.failures.includes("filter_or_contract_leak")).length,
  bucket_distribution_sample: distributionSample.length,
  bucket_distribution_rate: computedRate,
  latency_ms: {
    overall_p50: percentile(latencies, 0.5), overall_p95: percentile(latencies, 0.95),
    canary_p50: percentile(canaryLatencies, 0.5), canary_p95: percentile(canaryLatencies, 0.95),
    legacy_p50: percentile(legacyLatencies, 0.5), legacy_p95: percentile(legacyLatencies, 0.95),
  },
  coverage: {
    cities: [...new Set(results.map((r) => r.query.city))],
    property_types: [...new Set(results.map((r) => r.query.property_type))],
    intents: [...new Set(results.map((r) => r.query.transaction_type))],
    price_filters: results.filter((r) => r.query.min_price != null || r.query.max_price != null).length,
    surface_filters: results.filter((r) => r.query.min_surface != null || r.query.max_surface != null).length,
  },
  gates: {
    all_http_200: results.every((r) => r.status === 200),
    deterministic_lane_match: results.every((r) => r.actual_lane === r.expected_lane),
    no_filter_or_contract_leaks: results.every((r) => !r.failures.includes("filter_or_contract_leak")),
    canary_observed: canaryRows.every((r) => r.actual_lane === "canary"),
    legacy_observed: legacyRows.every((r) => r.actual_lane === "legacy"),
    bucket_rate_near_five_percent: computedRate >= 0.04 && computedRate <= 0.06,
    runtime_failure_free: failures.length === 0,
  },
  failed_requests: failures.slice(0, 50),
};

await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/odm-canary-5-synthetic-traffic-v1.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!Object.values(report.gates).every(Boolean)) process.exitCode = 1;
