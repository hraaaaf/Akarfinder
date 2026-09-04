import fs from "node:fs/promises";
import path from "node:path";

const FIXTURE = "data-ingestion/sources/avito/evidence/kaynly-avito-sample-2026-09-04.json";
const OUT_DIR = "data-ingestion/runs/avito/commoncrawl-control-probe";
const CRAWLS = ["CC-MAIN-2026-34", "CC-MAIN-2026-30", "CC-MAIN-2026-25"];
const REQUEST_TIMEOUT_MS = 20_000;
const PAUSE_MS = 300;
const RETRIES = 1;

const fixture = JSON.parse(await fs.readFile(FIXTURE, "utf8"));
const records = fixture.records ?? [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceIdFromUrl(url) {
  return url.match(/_(\d+)\.htm(?:[?#].*)?$/i)?.[1] ?? null;
}

function parseValidCaptures(body, expectedSourceId) {
  const captures = [];
  for (const line of body.split(/\r?\n/).filter(Boolean)) {
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed.url !== "string") continue;
      if (String(parsed.status) !== "200") continue;
      if (sourceIdFromUrl(parsed.url) !== expectedSourceId) continue;
      captures.push({
        url: parsed.url,
        timestamp: parsed.timestamp ?? null,
        status: parsed.status,
        mime: parsed.mime ?? null,
        digest: parsed.digest ?? null,
      });
    } catch {
      // Ignore non-CDX JSON/error payloads.
    }
  }
  return captures;
}

async function oneRequest(crawl, url, sourceId) {
  const endpoint = new URL(`https://index.commoncrawl.org/${crawl}-index`);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.set("filter", "status:200");
  endpoint.searchParams.set("limit", "5");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      headers: { "user-agent": "AkarFinderCoverageResearch/0.2" },
      signal: controller.signal,
    });
    const body = await response.text();
    const captures = response.ok ? parseValidCaptures(body, sourceId) : [];
    const outcome = captures.length > 0
      ? "found"
      : (response.status === 404 || response.ok ? "no_match" : "indeterminate");
    return {
      crawl,
      endpoint: endpoint.toString(),
      http_status: response.status,
      ok: response.ok,
      outcome,
      capture_count: captures.length,
      captures,
    };
  } catch (error) {
    return {
      crawl,
      endpoint: endpoint.toString(),
      http_status: null,
      ok: false,
      outcome: "indeterminate",
      capture_count: 0,
      captures: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function queryExactUrl(crawl, url, sourceId) {
  let last;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    last = await oneRequest(crawl, url, sourceId);
    if (last.outcome !== "indeterminate") return { ...last, attempts: attempt + 1 };
    if (attempt < RETRIES) await sleep(750 * (attempt + 1));
  }
  return { ...last, attempts: RETRIES + 1 };
}

const observations = [];
for (const record of records) {
  const sourceId = record.source_id ?? sourceIdFromUrl(record.url);
  const crawl_results = [];
  for (const crawl of CRAWLS) {
    crawl_results.push(await queryExactUrl(crawl, record.url, sourceId));
    await sleep(PAUSE_MS);
  }
  const found = crawl_results.some((result) => result.outcome === "found");
  const definitiveMissing = !found && crawl_results.every((result) => result.outcome === "no_match");
  observations.push({
    source_id: sourceId,
    avito_url: record.url,
    classification: found ? "found" : (definitiveMissing ? "definitive_missing" : "indeterminate"),
    crawl_results,
  });
}

const found = observations.filter((item) => item.classification === "found");
const definitiveMissing = observations.filter((item) => item.classification === "definitive_missing");
const indeterminate = observations.filter((item) => item.classification === "indeterminate");
const resolvedCount = found.length + definitiveMissing.length;

const report = {
  source: "avito",
  discovery_lane: "commoncrawl_exact_url_control_v2",
  generated_at: new Date().toISOString(),
  fixture: FIXTURE,
  control_sample_size: observations.length,
  crawls: CRAWLS,
  requests_max: observations.length * CRAWLS.length * (RETRIES + 1),
  found_ids: found.map((item) => item.source_id),
  found_count: found.length,
  definitive_missing_count: definitiveMissing.length,
  indeterminate_count: indeterminate.length,
  resolved_count: resolvedCount,
  resolved_coverage_ratio: resolvedCount ? found.length / resolvedCount : null,
  observations,
  interpretation: "Only HTTP-successful CDX rows with url, status=200, and matching Avito source_id count as captures. 404/empty-success is no_match; timeout/429/5xx is indeterminate. Historical capture is not proof that an Avito listing is active today.",
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  control_sample_size: report.control_sample_size,
  found_count: report.found_count,
  definitive_missing_count: report.definitive_missing_count,
  indeterminate_count: report.indeterminate_count,
  resolved_count: report.resolved_count,
  resolved_coverage_ratio: report.resolved_coverage_ratio,
}, null, 2));
