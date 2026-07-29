import assert from "node:assert/strict";

const MAX_BUCKET = 10_000;
const CANARY_THRESHOLD = 100;
const SESSION_COOKIE = "akar_geometry_canary";

function hashStableKey(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function bucket(value: string): number {
  return hashStableKey(value) % MAX_BUCKET;
}

function findSession(predicate: (value: number) => boolean): string {
  for (let index = 0; index < 100_000; index += 1) {
    const candidate = `runtime-certification-${index}`;
    if (predicate(bucket(candidate))) return candidate;
  }
  throw new Error("Unable to materialize a deterministic canary session key");
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("TARGET_URL is required");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function requestHeaders(session: string): HeadersInit {
  const headers: Record<string, string> = {
    cookie: `${SESSION_COOKIE}=${encodeURIComponent(session)}`,
    accept: "application/json",
  };
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }
  return headers;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, { ...init, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function certifySearchRoute(baseUrl: string): Promise<void> {
  const response = await fetchWithTimeout(`${baseUrl}/search?city=casablanca`);
  assert.equal(response.status, 200, `Search route returned ${response.status}`);
}

async function certifyPreview(baseUrl: string): Promise<void> {
  const eligibleSession = findSession((value) => value < CANARY_THRESHOLD);
  const outsideSession = findSession((value) => value >= CANARY_THRESHOLD);
  const endpoint = `${baseUrl}/api/geo/casablanca-arrondissements`;

  const eligible = await fetchWithTimeout(endpoint, { headers: requestHeaders(eligibleSession) });
  assert.equal(eligible.status, 200, `Eligible Preview session returned ${eligible.status}`);
  assert.equal(eligible.headers.get("x-akarfinder-geometry-canary"), "eligible");
  assert.equal(eligible.headers.get("x-akarfinder-geometry-status"), "preview-canary-1percent");
  assert.equal(eligible.headers.get("cache-control"), "private, no-store");
  const geojson = await eligible.json() as { type?: string; features?: unknown[] };
  assert.equal(geojson.type, "FeatureCollection");
  assert.equal(geojson.features?.length, 16);

  const outside = await fetchWithTimeout(endpoint, { headers: requestHeaders(outsideSession) });
  assert.equal(outside.status, 404, `Outside-sample Preview session returned ${outside.status}`);
  assert.equal(outside.headers.get("x-akarfinder-geometry-canary"), "outside_sample");
  const outsideBody = await outside.json() as { status?: string; reason?: string };
  assert.deepEqual(outsideBody, { status: "disabled", reason: "outside_sample" });
}

async function certifyProduction(baseUrl: string): Promise<void> {
  const eligibleSession = findSession((value) => value < CANARY_THRESHOLD);
  const endpoint = `${baseUrl}/api/geo/casablanca-arrondissements`;
  const response = await fetchWithTimeout(endpoint, { headers: requestHeaders(eligibleSession) });
  assert.equal(response.status, 404, `Production geometry endpoint returned ${response.status}`);
  assert.equal(response.headers.get("x-akarfinder-geometry-canary"), "production_blocked");
  const body = await response.json() as { status?: string; reason?: string };
  assert.deepEqual(body, { status: "disabled", reason: "production_blocked" });
}

async function main(): Promise<void> {
  const baseUrl = normalizeBaseUrl(process.env.TARGET_URL ?? "");
  const expected = (process.env.EXPECTED_ENVIRONMENT ?? "").trim().toLowerCase();
  assert.ok(expected === "preview" || expected === "production", "EXPECTED_ENVIRONMENT must be preview or production");

  await certifySearchRoute(baseUrl);
  if (expected === "preview") await certifyPreview(baseUrl);
  else await certifyProduction(baseUrl);

  console.log(JSON.stringify({
    status: "passed",
    target: baseUrl,
    environment: expected,
    checks: expected === "preview"
      ? ["search_http_200", "eligible_session_200", "outside_sample_404", "geojson_16_features"]
      : ["search_http_200", "production_blocked_404"],
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
