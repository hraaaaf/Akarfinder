import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = (process.env.AKARFINDER_PRODUCTION_URL || "https://akarfinder.vercel.app").replace(/\/$/, "");
const DRY_RUN = process.env.AKARFINDER_CERTIFICATION_DRY_RUN === "true";
const TARGET_PERCENT = 100;
const FULL_BUCKET_LIMIT = 10_000;
const HALF_BUCKET_LIMIT = 5_000;
const EXPECTED_REQUESTS = 240;
const EXPECTED_ODM = 240;
const EXPECTED_LEGACY = 0;
const EXPECTED_LOWER_HALF = 120;
const EXPECTED_UPPER_HALF = 120;
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 30_000;
const ODM_P95_MAX_MS = 5_000;
const ODM_P99_MAX_MS = 10_000;

const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès", "Oujda", "Kénitra", "Témara", "Salé"];
const propertyTypes = ["apartment", "villa", "land", "office"];
const intents = ["sale", "rent", "new"];
const combinations = propertyTypes.flatMap((property_type) =>
  intents.map((transaction_type) => ({ property_type, transaction_type })),
);
const aliases = { apartment: "appartement", villa: "villa", land: "terrain", office: "bureau" };
const limits = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
const priceBands = {
  sale: [[10_000, 50_000_000], [50_000, 30_000_000], [100_000, 20_000_000], [200_000, 15_000_000]],
  rent: [[100, 200_000], [500, 100_000], [1_000, 50_000], [2_000, 30_000]],
  new: [[10_000, 50_000_000], [50_000, 30_000_000], [100_000, 20_000_000], [200_000, 15_000_000]],
};
const surfaceBands = {
  apartment: [[1, 500], [20, 400], [30, 300], [40, 250]],
  villa: [[20, 5_000], [50, 3_000], [100, 2_500], [150, 2_000]],
  land: [[20, 50_000], [50, 30_000], [100, 20_000], [200, 10_000]],
  office: [[1, 5_000], [10, 3_000], [20, 2_000], [30, 1_500]],
};

function bucket(stableKey) {
  return createHash("sha256").update(stableKey).digest().readUInt32BE(0) % 10_000;
}

function stableKey(query) {
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

function params(query) {
  const output = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value != null) output.set(name, String(value));
  }
  return output.toString();
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function percentile(values, probability) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * probability))];
}

function candidateQueries(city, combination) {
  const candidates = [];
  for (const [min_price, max_price] of priceBands[combination.transaction_type]) {
    for (const [min_surface, max_surface] of surfaceBands[combination.property_type]) {
      for (const limit of limits) {
        candidates.push({
          q: undefined,
          city,
          ...combination,
          min_price,
          max_price,
          min_surface,
          max_surface,
          limit,
          offset: 0,
        });
      }
    }
  }
  return candidates;
}

function selectForHalf(city, combination, bucket_half, usedKeys) {
  for (const query of candidateQueries(city, combination)) {
    const stable_key = stableKey(query);
    const selectedBucket = bucket(stable_key);
    const actualHalf = selectedBucket < HALF_BUCKET_LIMIT ? "lower" : "upper";
    if (actualHalf !== bucket_half || usedKeys.has(stable_key)) continue;
    usedKeys.add(stable_key);
    return { query, stable_key, bucket: selectedBucket, bucket_half, expected_lane: "odm" };
  }
  throw new Error(`No ${bucket_half} bucket key for ${city}/${combination.property_type}/${combination.transaction_type}`);
}

function selectTraffic() {
  const selected = [];
  const usedKeys = new Set();
  for (const city of cities) {
    for (const combination of combinations) selected.push(selectForHalf(city, combination, "lower", usedKeys));
    for (const combination of combinations) selected.push(selectForHalf(city, combination, "upper", usedKeys));
  }
  if (selected.length !== EXPECTED_REQUESTS) {
    throw new Error(`Expected ${EXPECTED_REQUESTS} requests, selected ${selected.length}`);
  }
  return selected;
}

function detectLane(body) {
  return body?.source === "database_fallback" ? "odm" : "legacy";
}

function validateListing(item, listing) {
  const errors = [];
  const query = item.query;
  const expectedIntent = query.transaction_type === "sale" ? "buy" : query.transaction_type;
  const price = listing.price == null ? null : Number(listing.price);
  const surface = Number(listing.surface_m2 || 0);

  if (normalize(listing.city) !== normalize(query.city)) errors.push(`city:${listing.id}:${listing.city}`);
  if (normalize(listing.property_type) !== aliases[query.property_type]) {
    errors.push(`property_type:${listing.id}:${listing.property_type}`);
  }
  if (normalize(listing.transaction_type) !== expectedIntent) {
    errors.push(`intent:${listing.id}:${listing.transaction_type}`);
  }
  if (price == null || price < query.min_price || price > query.max_price) {
    errors.push(`price:${listing.id}:${listing.price}`);
  }
  if (surface < query.min_surface || surface > query.max_surface) {
    errors.push(`surface:${listing.id}:${listing.surface_m2}`);
  }

  if (!String(listing.id || "").startsWith("seed_")) errors.push(`id:${listing.id}`);
  if (listing.search_result_display_mode !== "thin_indexed_seed") {
    errors.push(`display_mode:${listing.id}:${listing.search_result_display_mode}`);
  }
  if (typeof listing.result_origin !== "string" || !listing.result_origin.trim()) {
    errors.push(`provenance:${listing.id}`);
  }
  if (listing.source_badge !== "external_indexed") {
    errors.push(`source_badge:${listing.id}:${listing.source_badge}`);
  }
  if (listing.production_allowed !== true || listing.can_show_result !== true) {
    errors.push(`publication:${listing.id}`);
  }
  if (listing.can_show_contact === true || listing.can_show_gallery === true || listing.can_show_thumbnail === true) {
    errors.push(`restricted_surface:${listing.id}`);
  }
  if (
    listing.original_source_required !== true
    || listing.primary_cta !== "view_original"
    || listing.source_access_level !== "indexed_only"
  ) {
    errors.push(`source_boundary:${listing.id}`);
  }
  if (["premium_partner", "authorized_source"].includes(normalize(listing.source_badge))) {
    errors.push(`partner_badge:${listing.id}:${listing.source_badge}`);
  }
  if (["promoteur", "agence"].includes(normalize(listing.source_type))) {
    errors.push(`commercial_tier_leak:${listing.id}:${listing.source_type}`);
  }
  return errors;
}

function validateResponse(item, body) {
  const errors = [];
  const observedLane = detectLane(body);
  if (observedLane !== "odm") errors.push(`lane:${observedLane}`);
  if (!Array.isArray(body?.listings)) return [...errors, "invalid_json_contract"];
  for (const listing of body.listings) errors.push(...validateListing(item, listing));
  return errors;
}

async function request(item) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/api/search?${params(item.query)}`, {
      signal: controller.signal,
      headers: { "user-agent": "AkarFinder-ODM-Full-Cutover-100-Certification/1.0" },
    });
    const body = await response.json();
    return {
      ...item,
      status: response.status,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      source: body?.source,
      observed_lane: detectLane(body),
      returned: body?.listings?.length ?? 0,
      errors: response.status === 200 ? validateResponse(item, body) : [`http:${response.status}`],
    };
  } catch (error) {
    return {
      ...item,
      status: 0,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      source: "error",
      observed_lane: "error",
      returned: 0,
      errors: [String(error)],
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runConcurrent(items) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await request(items[index]);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return output;
}

async function visibleProbe(item) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/search?${params(item.query)}`, {
      signal: controller.signal,
      headers: { "user-agent": "AkarFinder-ODM-Full-Cutover-100-Page-Probe/1.0" },
    });
    const html = await response.text();
    const errors = [];
    if (response.status !== 200) errors.push(`http:${response.status}`);
    if (!html.includes("seed_")) errors.push("missing_seed_marker");
    if (!html.includes("Annonces publiques indexées")) errors.push("missing_public_indexed_section");
    return {
      status: response.status,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      city: item.query.city,
      property_type: item.query.property_type,
      transaction_type: item.query.transaction_type,
      bucket_half: item.bucket_half,
      errors,
    };
  } catch (error) {
    return {
      status: 0,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      city: item.query.city,
      property_type: item.query.property_type,
      transaction_type: item.query.transaction_type,
      bucket_half: item.bucket_half,
      errors: [String(error)],
    };
  } finally {
    clearTimeout(timer);
  }
}

function selectVisibleCandidates(nonEmptyOdm) {
  const selected = [];
  const selectedKeys = new Set();
  for (const city of cities) {
    const candidate = nonEmptyOdm.find((item) => item.query.city === city);
    if (!candidate) continue;
    selected.push(candidate);
    selectedKeys.add(candidate.stable_key);
  }
  for (const half of ["lower", "upper"]) {
    const candidate = nonEmptyOdm.find((item) => item.bucket_half === half && !selectedKeys.has(item.stable_key));
    if (candidate) {
      selected.push(candidate);
      selectedKeys.add(candidate.stable_key);
    }
  }
  for (const candidate of nonEmptyOdm) {
    if (selected.length >= 12) break;
    if (selectedKeys.has(candidate.stable_key)) continue;
    selected.push(candidate);
    selectedKeys.add(candidate.stable_key);
  }
  return selected;
}

function bucketDistributionRate() {
  const sample = cities.flatMap((city) =>
    combinations.flatMap((combination) => candidateQueries(city, combination)),
  );
  return sample.filter((query) => bucket(stableKey(query)) < FULL_BUCKET_LIMIT).length / sample.length;
}

async function main() {
  const selected = selectTraffic();
  const rate = bucketDistributionRate();
  const lowerPlan = selected.filter((item) => item.bucket_half === "lower");
  const upperPlan = selected.filter((item) => item.bucket_half === "upper");

  if (DRY_RUN) {
    console.log(JSON.stringify({
      certification: "ODM_FULL_CUTOVER_100_PRODUCTION_CERTIFICATION_V1",
      requested: selected.length,
      expected_odm: EXPECTED_ODM,
      expected_legacy: EXPECTED_LEGACY,
      expected_lower_half: lowerPlan.length,
      expected_upper_half: upperPlan.length,
      bucket_distribution_rate: rate,
      cities: [...new Set(selected.map((item) => item.query.city))],
      property_types: [...new Set(selected.map((item) => item.query.property_type))],
      intents: [...new Set(selected.map((item) => item.query.transaction_type))],
      all_offsets_zero: selected.every((item) => item.query.offset === 0),
      all_queries_structured_only: selected.every((item) => item.query.q == null),
    }, null, 2));
    return;
  }

  const results = await runConcurrent(selected);
  const failures = results.filter((result) => result.errors.length > 0);
  const odm = results.filter((result) => result.observed_lane === "odm");
  const legacy = results.filter((result) => result.observed_lane === "legacy");
  const lower = results.filter((result) => result.bucket_half === "lower");
  const upper = results.filter((result) => result.bucket_half === "upper");
  const nonEmptyOdm = odm.filter((result) => result.returned > 0);
  const nonEmptyOdmCities = new Set(nonEmptyOdm.map((result) => result.query.city));
  const pageProbes = [];
  for (const item of selectVisibleCandidates(nonEmptyOdm)) pageProbes.push(await visibleProbe(item));
  const pageProbeFailures = pageProbes.filter((probe) => probe.errors.length > 0);
  const odmLatencies = odm.map((result) => result.latency_ms);
  const lowerLatencies = lower.map((result) => result.latency_ms);
  const upperLatencies = upper.map((result) => result.latency_ms);
  const odmP95 = percentile(odmLatencies, 0.95);
  const odmP99 = percentile(odmLatencies, 0.99);

  const gates = {
    exact_240_request_campaign: results.length === EXPECTED_REQUESTS,
    exact_120_120_bucket_half_plan: lower.length === EXPECTED_LOWER_HALF && upper.length === EXPECTED_UPPER_HALF,
    all_http_200: results.every((result) => result.status === 200),
    all_ten_cities: new Set(results.map((result) => result.query.city)).size === 10,
    all_four_property_types: new Set(results.map((result) => result.query.property_type)).size === 4,
    all_three_intents: new Set(results.map((result) => result.query.transaction_type)).size === 3,
    all_routes_odm: odm.length === EXPECTED_ODM && legacy.length === EXPECTED_LEGACY,
    lower_half_all_odm: lower.every((result) => result.observed_lane === "odm"),
    upper_half_all_odm: upper.every((result) => result.observed_lane === "odm"),
    no_filter_contract_or_policy_leaks: failures.length === 0,
    bucket_rate_full_cutover: rate === 1,
    enough_non_empty_odm_evidence: nonEmptyOdm.length >= 100 && nonEmptyOdmCities.size === 10,
    visible_page_api_lane_parity: pageProbes.length >= 10 && pageProbeFailures.length === 0,
    odm_p95_within_5s: odmP95 != null && odmP95 <= ODM_P95_MAX_MS,
    odm_p99_within_10s: odmP99 != null && odmP99 <= ODM_P99_MAX_MS,
  };

  const report = {
    certification: "ODM_FULL_CUTOVER_100_PRODUCTION_CERTIFICATION_V1",
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    target_percent: TARGET_PERCENT,
    requested: results.length,
    http_200: results.filter((result) => result.status === 200).length,
    expected_odm: EXPECTED_ODM,
    expected_legacy: EXPECTED_LEGACY,
    observed_odm: odm.length,
    observed_legacy: legacy.length,
    lower_half_requests: lower.length,
    upper_half_requests: upper.length,
    non_empty_odm_requests: nonEmptyOdm.length,
    non_empty_odm_cities: [...nonEmptyOdmCities],
    failures: failures.length,
    visible_probe_failures: pageProbeFailures.length,
    bucket_distribution_rate: rate,
    coverage: {
      cities: [...new Set(results.map((result) => result.query.city))],
      property_types: [...new Set(results.map((result) => result.query.property_type))],
      intents: [...new Set(results.map((result) => result.query.transaction_type))],
    },
    latency_ms: {
      odm_p50: percentile(odmLatencies, 0.5),
      odm_p95: odmP95,
      odm_p99: odmP99,
      lower_half_p50: percentile(lowerLatencies, 0.5),
      lower_half_p95: percentile(lowerLatencies, 0.95),
      upper_half_p50: percentile(upperLatencies, 0.5),
      upper_half_p95: percentile(upperLatencies, 0.95),
      visible_p50: percentile(pageProbes.map((probe) => probe.latency_ms), 0.5),
      visible_p95: percentile(pageProbes.map((probe) => probe.latency_ms), 0.95),
    },
    gates,
    visible_probes: pageProbes,
    failed_requests: failures,
  };

  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/odm-full-cutover-100-production-certification-v1.json",
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));

  if (!Object.values(gates).every(Boolean)) process.exitCode = 1;
}

await main();
