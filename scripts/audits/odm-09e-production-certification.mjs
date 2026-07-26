import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const BASE_URL = (process.env.AKARFINDER_PRODUCTION_URL || "https://akarfinder.vercel.app").replace(/\/$/, "");
const PAGE_LIMIT = Number(process.env.ODM09E_PAGE_LIMIT || 100);
const MAX_PAGES = Number(process.env.ODM09E_MAX_PAGES || 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.ODM09E_REQUEST_TIMEOUT_MS || 30000);
const MIN_EXPECTED_TOTAL = Number(process.env.ODM09E_MIN_EXPECTED_TOTAL || 40000);
const REPORT_PATH = process.env.ODM09E_REPORT_PATH || "odm-09e-production-report.json";

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const started = nowMs();
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent": "AkarFinder-ODM-09E-Certification/1.0",
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        ...(init.headers || {}),
      },
      redirect: "follow",
    });
    return { response, elapsed_ms: nowMs() - started };
  } finally {
    clearTimeout(timer);
  }
}

function resultKey(result) {
  return result?.original_url || result?.display_url || result?.id || null;
}

function isOpaqueCursor(cursor) {
  return typeof cursor === "string" && cursor.length >= 16 && !/^\d+$/.test(cursor);
}

async function readJson(response, url) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 300)}`);
  }
}

async function certifySearchPage() {
  const url = `${BASE_URL}/search?q=appartement%20casablanca`;
  const { response, elapsed_ms } = await fetchWithTimeout(url, { headers: { accept: "text/html" } });
  const html = await response.text();
  assert.equal(response.status, 200, `/search returned HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /text\/html/i, "/search did not return HTML");
  assert.ok(html.length > 1000, `/search HTML is unexpectedly small (${html.length} bytes)`);
  return {
    url,
    status: response.status,
    elapsed_ms,
    bytes: Buffer.byteLength(html),
    x_vercel_id: response.headers.get("x-vercel-id"),
    x_vercel_cache: response.headers.get("x-vercel-cache"),
  };
}

async function certifyGatewayTraversal() {
  const seenResultKeys = new Set();
  const seenIndexKeys = new Set();
  const seenCursors = new Set();
  const pageMetrics = [];
  const missingKeys = [];
  const missingUrls = [];
  let cursor = null;
  let totalCount = null;
  let page = 0;
  let firstPageLiveExtras = 0;

  while (page < MAX_PAGES) {
    page += 1;
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("cursor", cursor);
    const url = `${BASE_URL}/api/search/gateway?${params.toString()}`;
    const { response, elapsed_ms } = await fetchWithTimeout(url);
    const payload = await readJson(response, url);

    assert.equal(response.status, 200, `Gateway page ${page} returned HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
    assert.equal(payload.ok, true, `Gateway page ${page} is not ok`);
    assert.ok(Array.isArray(payload.results), `Gateway page ${page} results is not an array`);
    assert.equal(typeof payload.has_more, "boolean", `Gateway page ${page} has_more is not boolean`);
    assert.ok(Number.isInteger(payload.total_count), `Gateway page ${page} total_count is not an integer`);

    if (totalCount == null) {
      totalCount = payload.total_count;
      assert.ok(totalCount >= MIN_EXPECTED_TOTAL, `Expected at least ${MIN_EXPECTED_TOTAL} indexed representations, got ${totalCount}`);
    } else {
      assert.equal(payload.total_count, totalCount, `total_count changed on page ${page}`);
    }

    let pageDuplicateCount = 0;
    let indexedPageCount = 0;
    for (const result of payload.results) {
      const key = resultKey(result);
      if (!key) {
        missingKeys.push({ page, id: result?.id ?? null });
        continue;
      }
      if (seenResultKeys.has(key)) pageDuplicateCount += 1;
      seenResultKeys.add(key);

      const urlValue = result.original_url || result.display_url;
      if (!urlValue || !/^https?:\/\//i.test(urlValue)) {
        missingUrls.push({ page, key, original_url: result.original_url ?? null, display_url: result.display_url ?? null });
      }

      // Cursor pages contain only deterministic Thin Index results. The first
      // page can additionally contain live-provider results merged ahead of it.
      if (page > 1 || payload.sources_queried?.includes("thin_index")) {
        if (!seenIndexKeys.has(key)) indexedPageCount += 1;
        seenIndexKeys.add(key);
      }
    }

    pageMetrics.push({
      page,
      elapsed_ms,
      results_count: payload.results.length,
      duplicates_seen_on_page: pageDuplicateCount,
      unique_results_so_far: seenResultKeys.size,
      unique_index_keys_so_far: seenIndexKeys.size,
      has_more: payload.has_more,
      cursor_length: typeof payload.next_cursor === "string" ? payload.next_cursor.length : 0,
      sources_queried: payload.sources_queried || [],
      public_index_degraded: payload.public_index_degraded === true,
    });

    assert.equal(payload.public_index_degraded, undefined, `Production fell back to legacy capped index on page ${page}`);
    assert.equal(pageDuplicateCount, 0, `Duplicate result keys detected on page ${page}`);

    if (!payload.has_more) {
      assert.equal(payload.next_cursor, null, `Final page ${page} must expose next_cursor=null`);
      break;
    }

    assert.ok(isOpaqueCursor(payload.next_cursor), `Page ${page} returned a non-opaque cursor`);
    assert.ok(!seenCursors.has(payload.next_cursor), `Cursor loop detected on page ${page}`);
    seenCursors.add(payload.next_cursor);
    cursor = payload.next_cursor;
  }

  assert.ok(page < MAX_PAGES, `Traversal reached MAX_PAGES=${MAX_PAGES} before completion`);
  assert.equal(missingKeys.length, 0, `${missingKeys.length} results have no canonical key`);
  assert.equal(missingUrls.length, 0, `${missingUrls.length} results have no usable HTTP URL`);

  // The first page can merge a small number of live-provider results. Every
  // indexed representation must nevertheless be encountered at least once.
  firstPageLiveExtras = Math.max(0, seenResultKeys.size - totalCount);
  assert.ok(seenResultKeys.size >= totalCount, `Only ${seenResultKeys.size}/${totalCount} unique representations were traversed`);

  const elapsedValues = pageMetrics.map((item) => item.elapsed_ms);
  const totalElapsed = elapsedValues.reduce((sum, value) => sum + value, 0);
  const sortedElapsed = [...elapsedValues].sort((a, b) => a - b);
  const percentile = (p) => sortedElapsed[Math.min(sortedElapsed.length - 1, Math.floor(sortedElapsed.length * p))];

  return {
    endpoint: `${BASE_URL}/api/search/gateway`,
    total_count: totalCount,
    pages_traversed: page,
    page_limit: PAGE_LIMIT,
    unique_results_traversed: seenResultKeys.size,
    possible_live_provider_extras: firstPageLiveExtras,
    duplicate_result_keys: 0,
    cursor_loops: 0,
    missing_keys: 0,
    missing_urls: 0,
    latency_ms: {
      min: Math.min(...elapsedValues),
      average: Math.round(totalElapsed / elapsedValues.length),
      p50: percentile(0.5),
      p95: percentile(0.95),
      max: Math.max(...elapsedValues),
      total: totalElapsed,
    },
    first_page: pageMetrics[0],
    final_page: pageMetrics.at(-1),
    slowest_pages: [...pageMetrics].sort((a, b) => b.elapsed_ms - a.elapsed_ms).slice(0, 10),
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const searchPage = await certifySearchPage();
  const gateway = await certifyGatewayTraversal();
  const report = {
    certification: "ODM-09E",
    verdict: "CERTIFIED",
    production_url: BASE_URL,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    minimum_expected_total: MIN_EXPECTED_TOTAL,
    search_page: searchPage,
    gateway,
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  const failure = {
    certification: "ODM-09E",
    verdict: "FAILED",
    production_url: BASE_URL,
    completed_at: new Date().toISOString(),
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(failure, null, 2)}\n`, "utf8").catch(() => {});
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
