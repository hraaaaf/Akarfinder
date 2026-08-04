import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = (process.env.AKARFINDER_PRODUCTION_URL || "https://akarfinder.vercel.app").replace(/\/$/, "");
const DRY_RUN = process.env.AKARFINDER_CERTIFICATION_DRY_RUN === "true";
const TARGET_PERCENT = 50;
const BUCKET_LIMIT = TARGET_PERCENT * 100;
const EXPECTED_REQUESTS = 240;
const EXPECTED_CANARY = 120;
const EXPECTED_LEGACY = 120;
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 30_000;
const CANARY_P95_MAX_MS = 5_000;
const CANARY_P99_MAX_MS = 10_000;

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

function selectForLane(city, combination, expected_lane, usedKeys) {
  for (const query of candidateQueries(city, combination)) {
    const stable_key = stableKey(query);
    const selectedBucket = bucket(stable_key);
    const actualLane = selectedBucket < BUCKET_LIMIT ? "canary" : "legacy";
    if (actualLane !== expected_lane || usedKeys.has(stable_key)) continue;
    usedKeys.add(stable_key);
    return { query, stable_key, bucket: selectedBucket, expected_lane };
  }
  throw new Error(`No ${expected_lane} key for ${city}/${combination.property_type}/${combination.transaction_type}`);
}

function selectTraffic() {
  const selected = [];
  const usedKeys = new Set();
  for (const city of cities) {
    for (const combination of combinations) selected.push(selectForLane(city, combination, "canary", usedKeys));
    for (const combination of combinations) selected.push(selectForLane(city, combination, "legacy", usedKeys));
  }
  if (selected.length !== EXPECTED_REQUESTS) {
    throw new Error(`Expected ${EXPECTED_REQUESTS} requests, selected ${selected.length}`);
  }
  return selected;
}

function detectLane(body) {
  return body?.source === "database_fallback" ? "canary" : "legacy";
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

  if (item.expected_lane === "canary") {
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
  }
  return errors;
}

function validateResponse(item, body) {
  const errors = [];
  const observedLane = detectLane(body);
  if (observedLane !== item.expected_lane) errors.push(`lane:${observedLane}`);
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
      headers: { "user-agent": "AkarFinder-ODM-Canary-50-Certification/1.0" },
    });
    const body = await response.json();
    return {
      ...item,
      status: response.status,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      source: body?.source,
      returned: body?.listings?.length ?? 0,
      errors: response.status === 200 ? validateResponse(item, body) : [`http:${response.status}`],
    };
  } catch (error) {
    return {
      ...item,
      status: 0,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      source: "error",
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
      headers: { "user-agent": "AkarFinder-ODM-Canary-50-Page-Probe/1.0" },
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
      errors,
    };
  } catch (error) {
    return {
      status: 0,
      latency_ms: Number((performance.now() - startedAt).toFixed(2)),
      city: item.query.city,
      property_type: item.query.property_type,
      transaction_type: item.query.transaction_type,
      errors: [String(error)],
    };
  } finally {
    clearTimeout(timer);
  }
}

function selectVisibleCandidates(nonEmptyCanary) {
  const selected = [];
  const selectedKeys = new Set();
  for (const city of cities) {
    const candidate = nonEmptyCanary.find((item) => item.query.city === city);
    if (!candidate) continue;
    selected.push(candidate);
    selectedKeys.add(candidate.stable_key);
  }
  for (const candidate of nonEmptyCanary) {
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
  return sample.filter((query) => bucket(stableKey(query)) < BUCKET_LIMIT).length / sample.length;
}

async function main() {
  const selected = selectTraffic();
  const rate = bucketDistributionRate();

  if (DRY_RUN) {
    console.log(JSON.stringify({
      certification: "ODM_CANARY_50_PRODUCTION_CERTIFICATION_V1",
      requested: selected.length,
      expected_canary: selected.filter((item) => item.expected_lane === "canary").length,
      expected_legacy: selected.filter((item) => item.expected_lane === "legacy").length,
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
  const canary = results.filter((result) => result.expected_lane === "canary");
  const legacy = results.filter((result) => result.expected_lane === "legacy");
  const failures = results.filter((result) => result.errors.length > 0);
  const nonEmptyCanary = canary.filter((result) => result.returned > 0);
  const nonEmptyCanaryCities = new Set(nonEmptyCanary.map((result) => result.query.city));
  const pageProbes = [];
  for (const item of selectVisibleCandidates(nonEmptyCanary)) pageProbes.push(await visibleProbe(item));
  const pageProbeFailures = pageProbes.filter((probe) => probe.errors.length > 0);
  const canaryLatencies = canary.map((result) => result.latency_ms);
  const legacyLatencies = legacy.map((result) => result.latency_ms);
  const canaryP95 = percentile(canaryLatencies, 0.95);
  const canaryP99 = percentile(canaryLatencies, 0.99);

  const report = {
    certification: "ODM_CANARY_50_PRODUCTION_CERTIFICATION_V1",
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    target_percent: TARGET_PERCENT,
    requested: results.length,
    http_200: results.filter((result) => result.status === 200).length,
    expected_canary: canary.length,
    expected_legacy: legacy.length,
    observed_canary: results.filter((result) => result.source === "database_fallback").length,
    observed_legacy: results.filter((result) => result.source !== "database_fallback" && result.status === 200).length,
    non_empty_canary_requests: nonEmptyCanary.length,
    non_empty_canary_cities: [...nonEmptyCanaryCities],
    failures: failures.length,
    visible_probe_failures: pageProbeFailures.length,
    bucket_distribution_rate: rate,
    coverage: {
      cities: [...new Set(results.map((result) => result.query.city))],
      property_types: [...new Set(results.map((result) => result.query.property_type))],
      intents: [...new Set(results.map((result) => result.query.transaction_type))],
    },
    latency_ms: {
      canary_p50: percentile(canaryLatencies, 0.5),
      canary_p95: canaryP95,
      canary_p99: canaryP99,
      legacy_p50: percentile(legacyLatencies, 0.5),
      legacy_p95: percentile(legacyLatencies, 0.95),
      legacy_p99: percentile(legacyLatencies, 0.99),
      visible_p50: percentile(pageProbes.map((probe) => probe.latency_ms), 0.5),
      visible_p95: percentile(pageProbes.map((probe) => probe.latency_ms), 0.95),
    },
    gates: {
      exact_240_request_campaign: results.length === EXPECTED_REQUESTS,
      exact_120_120_lane_plan: canary.length === EXPECTED_CANARY && legacy.length === EXPECTED_LEGACY,
      all_http_200: results.every((result) => result.status === 200),
      all_ten_cities: new Set(results.map((result) => result.query.city)).size === cities.length,
      all_four_property_types: new Set(results.map((result) => result.query.property_type)).size === propertyTypes.length,
      all_three_intents: new Set(results.map((result) => result.query.transaction_type)).size === intents.length,
      deterministic_lane_match: results.every(
        (result) => (result.source === "database_fallback" ? "canary" : "legacy") === result.expected_lane,
      ),
      no_filter_contract_or_policy_leaks: failures.length === 0,
      bucket_rate_near_fifty_percent: rate >= 0.485 && rate <= 0.515,
      enough_non_empty_canary_evidence: nonEmptyCanary.length >= 50 && nonEmptyCanaryCities.size === cities.length,
      visible_page_api_lane_parity: pageProbes.length >= 10 && pageProbeFailures.length === 0,
      canary_p95_within_5s: canaryP95 != null && canaryP95 <= CANARY_P95_MAX_MS,
      canary_p99_within_10s: canaryP99 != null && canaryP99 <= CANARY_P99_MAX_MS,
    },
    visible_probes: pageProbes,
    failed_requests: failures.slice(0, 50),
  };

  await mkdir("artifacts", { recursive: true });
  await writeFile(
    "artifacts/odm-canary-50-production-certification-v1.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  const pass = Object.values(report.gates).every(Boolean);
  const summary = [
    "# ODM Canary 50% Production Certification V1",
    "",
    `- Requests: ${report.requested}`,
    `- Canary / Legacy: ${report.observed_canary} / ${report.observed_legacy}`,
    `- Non-empty Canary: ${report.non_empty_canary_requests} across ${report.non_empty_canary_cities.length} cities`,
    `- Failures: ${report.failures}`,
    `- Visible probe failures: ${report.visible_probe_failures}`,
    `- Canary p50 / p95 / p99: ${report.latency_ms.canary_p50} / ${canaryP95} / ${canaryP99} ms`,
    `- Bucket rate: ${(rate * 100).toFixed(2)}%`,
    `- Verdict: ${pass ? "PASS" : "FAIL"}`,
    "",
    "## Gates",
    ...Object.entries(report.gates).map(([name, value]) => `- ${value ? "✅" : "❌"} ${name}`),
    "",
  ].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exitCode = 1;
}

await main();
