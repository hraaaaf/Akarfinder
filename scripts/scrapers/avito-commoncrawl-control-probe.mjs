import fs from "node:fs/promises";
import path from "node:path";

const FIXTURE = "data-ingestion/sources/avito/evidence/kaynly-avito-sample-2026-09-04.json";
const OUT_DIR = "data-ingestion/runs/avito/commoncrawl-control-probe";
const CRAWLS = ["CC-MAIN-2026-34", "CC-MAIN-2026-30", "CC-MAIN-2026-25"];
const REQUEST_TIMEOUT_MS = 12_000;
const PAUSE_MS = 150;

const fixture = JSON.parse(await fs.readFile(FIXTURE, "utf8"));
const records = fixture.records ?? [];

async function queryExactUrl(crawl, url) {
  const endpoint = new URL(`https://index.commoncrawl.org/${crawl}-index`);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.set("filter", "status:200");
  endpoint.searchParams.set("limit", "5");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      headers: { "user-agent": "AkarFinderCoverageResearch/0.1" },
      signal: controller.signal,
    });
    const body = await response.text();
    const lines = body.split(/\r?\n/).filter(Boolean);
    const captures = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        captures.push({
          url: parsed.url ?? null,
          timestamp: parsed.timestamp ?? null,
          status: parsed.status ?? null,
          mime: parsed.mime ?? null,
          digest: parsed.digest ?? null,
        });
      } catch {
        // Keep malformed lines out of structured evidence; raw status remains below.
      }
    }
    return {
      crawl,
      endpoint: endpoint.toString(),
      http_status: response.status,
      ok: response.ok,
      capture_count: captures.length,
      captures,
    };
  } catch (error) {
    return {
      crawl,
      endpoint: endpoint.toString(),
      http_status: null,
      ok: false,
      capture_count: 0,
      captures: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const observations = [];
for (const record of records) {
  const crawl_results = [];
  for (const crawl of CRAWLS) {
    crawl_results.push(await queryExactUrl(crawl, record.url));
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }
  observations.push({
    source_id: record.source_id,
    avito_url: record.url,
    found_in_any_crawl: crawl_results.some((result) => result.capture_count > 0),
    crawl_results,
  });
}

const found = observations.filter((item) => item.found_in_any_crawl);
const report = {
  source: "avito",
  discovery_lane: "commoncrawl_exact_url_control",
  generated_at: new Date().toISOString(),
  fixture: FIXTURE,
  control_sample_size: observations.length,
  crawls: CRAWLS,
  requests_max: observations.length * CRAWLS.length,
  found_ids: found.map((item) => item.source_id),
  found_count: found.length,
  coverage_ratio: observations.length ? found.length / observations.length : 0,
  observations,
  interpretation: "Historical public-index discovery only; a Common Crawl capture is not proof that an Avito listing is active today.",
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  control_sample_size: report.control_sample_size,
  crawls: report.crawls,
  requests_max: report.requests_max,
  found_count: report.found_count,
  coverage_ratio: report.coverage_ratio,
  found_ids: report.found_ids,
}, null, 2));
