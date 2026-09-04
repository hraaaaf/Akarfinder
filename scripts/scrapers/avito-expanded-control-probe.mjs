import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "data-ingestion/runs/avito/expanded-control";
const TARGET_UNIQUE = 100;
const MAX_PER_STRATUM = 12;
const CRAWLS = ["CC-MAIN-2026-34", "CC-MAIN-2026-30", "CC-MAIN-2026-25"];
const FETCH_TIMEOUT_MS = 10_000;
const CC_CONCURRENCY = 6;
const KAYNLY_PAUSE_MS = 250;
const USER_AGENT = "AkarFinderCoverageResearch/0.1 (+https://akarfinder.vercel.app)";

const STRATA = [
  ["casablanca", "sale", "mixed", "https://kaynly.com/vente/casablanca"],
  ["casablanca", "rent", "mixed", "https://kaynly.com/location/casablanca"],
  ["casablanca", "sale", "villa", "https://kaynly.com/vente/casablanca/villas"],
  ["casablanca", "rent", "apartment", "https://kaynly.com/location/casablanca/appartements"],
  ["rabat", "sale", "mixed", "https://kaynly.com/vente/rabat"],
  ["rabat", "rent", "mixed", "https://kaynly.com/location/rabat"],
  ["rabat", "sale", "apartment", "https://kaynly.com/vente/rabat/appartements"],
  ["rabat", "rent", "apartment", "https://kaynly.com/location/rabat/appartements"],
  ["marrakech", "sale", "mixed", "https://kaynly.com/vente/marrakech"],
  ["marrakech", "rent", "mixed", "https://kaynly.com/location/marrakech"],
  ["marrakech", "sale", "villa", "https://kaynly.com/vente/marrakech/villas"],
  ["marrakech", "rent", "apartment", "https://kaynly.com/location/marrakech/appartements"],
  ["tanger", "sale", "mixed", "https://kaynly.com/vente/tanger"],
  ["tanger", "rent", "mixed", "https://kaynly.com/location/tanger"],
  ["tanger", "sale", "apartment", "https://kaynly.com/vente/tanger/appartements"],
  ["tanger", "rent", "apartment", "https://kaynly.com/location/tanger/appartements"],
  ["agadir", "sale", "mixed", "https://kaynly.com/vente/agadir"],
  ["agadir", "rent", "mixed", "https://kaynly.com/location/agadir"],
  ["temara", "sale", "mixed", "https://kaynly.com/vente/temara"],
  ["temara", "rent", "mixed", "https://kaynly.com/location/temara"],
].map(([city, transaction, property_type, url]) => ({ city, transaction, property_type, url }));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    return {
      ok: response.ok,
      status: response.status,
      content_type: response.headers.get("content-type"),
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      content_type: null,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeHref(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/");
}

function extractAvitoUrls(html) {
  const found = [];
  const seen = new Set();
  const regex = /href=["'](https:\/\/(?:www\.)?avito\.ma\/[^"'<>\s]+)["']/gi;
  for (const match of html.matchAll(regex)) {
    const url = normalizeHref(match[1]);
    const idMatch = url.match(/_(\d+)\.htm(?:[?#].*)?$/i);
    if (!idMatch) continue;
    const source_id = idMatch[1];
    if (seen.has(source_id)) continue;
    seen.add(source_id);
    found.push({ source_id, url });
  }
  return found;
}

const sample = [];
const globalIds = new Set();
const stratumObservations = [];

for (const stratum of STRATA) {
  if (sample.length >= TARGET_UNIQUE) break;
  const response = await fetchText(stratum.url);
  const extracted = response.ok ? extractAvitoUrls(response.body) : [];
  const accepted = [];
  for (const record of extracted) {
    if (accepted.length >= MAX_PER_STRATUM || sample.length >= TARGET_UNIQUE) break;
    if (globalIds.has(record.source_id)) continue;
    globalIds.add(record.source_id);
    const enriched = {
      ...record,
      city: stratum.city,
      transaction: stratum.transaction,
      property_type: stratum.property_type,
      control_page: stratum.url,
    };
    accepted.push(enriched);
    sample.push(enriched);
  }
  stratumObservations.push({
    ...stratum,
    http_status: response.status,
    ok: response.ok,
    content_type: response.content_type,
    avito_links_extracted: extracted.length,
    unique_ids_accepted: accepted.length,
    error: response.error ?? null,
  });
  await sleep(KAYNLY_PAUSE_MS);
}

async function queryCommonCrawl(record, crawl) {
  const endpoint = new URL(`https://index.commoncrawl.org/${crawl}-index`);
  endpoint.searchParams.set("url", record.url);
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.set("filter", "status:200");
  endpoint.searchParams.set("limit", "3");
  const result = await fetchText(endpoint.toString());
  const captures = [];
  if (result.body) {
    for (const line of result.body.split(/\r?\n/).filter(Boolean)) {
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
        // Ignore non-JSON response lines while retaining HTTP status below.
      }
    }
  }
  return {
    source_id: record.source_id,
    crawl,
    endpoint: endpoint.toString(),
    http_status: result.status,
    ok: result.ok,
    capture_count: captures.length,
    captures,
    error: result.error ?? null,
  };
}

const tasks = [];
for (const record of sample) {
  for (const crawl of CRAWLS) tasks.push({ record, crawl });
}

const taskResults = [];
for (let i = 0; i < tasks.length; i += CC_CONCURRENCY) {
  const batch = tasks.slice(i, i + CC_CONCURRENCY);
  taskResults.push(...await Promise.all(batch.map(({ record, crawl }) => queryCommonCrawl(record, crawl))));
}

const byId = new Map(sample.map((record) => [record.source_id, {
  ...record,
  found_in_any_crawl: false,
  crawl_results: [],
}]));
for (const result of taskResults) {
  const row = byId.get(result.source_id);
  if (!row) continue;
  row.crawl_results.push(result);
  if (result.capture_count > 0) row.found_in_any_crawl = true;
}

const observations = [...byId.values()];
const found = observations.filter((row) => row.found_in_any_crawl);
const missing = observations.filter((row) => !row.found_in_any_crawl);

function summarizeDimension(key) {
  const buckets = new Map();
  for (const row of observations) {
    const value = row[key] ?? "unknown";
    const bucket = buckets.get(value) ?? { total: 0, found: 0 };
    bucket.total += 1;
    if (row.found_in_any_crawl) bucket.found += 1;
    buckets.set(value, bucket);
  }
  return Object.fromEntries([...buckets.entries()].map(([value, bucket]) => [value, {
    ...bucket,
    coverage_ratio: bucket.total ? bucket.found / bucket.total : 0,
  }]));
}

const report = {
  source: "avito",
  discovery_lane: "kaynly_stratified_control_to_commoncrawl",
  generated_at: new Date().toISOString(),
  target_unique_ids: TARGET_UNIQUE,
  sampled_unique_ids: observations.length,
  kaynly_page_requests_max: STRATA.length,
  commoncrawl_indexes: CRAWLS,
  commoncrawl_requests_max: observations.length * CRAWLS.length,
  found_count: found.length,
  missing_count: missing.length,
  coverage_ratio: observations.length ? found.length / observations.length : 0,
  found_ids: found.map((row) => row.source_id),
  missing_ids: missing.map((row) => row.source_id),
  coverage_by_city: summarizeDimension("city"),
  coverage_by_transaction: summarizeDimension("transaction"),
  coverage_by_property_type: summarizeDimension("property_type"),
  stratum_observations: stratumObservations,
  observations,
  interpretation: "Kaynly is used only as a bounded public URL/ID control surface. Common Crawl is historical public-index discovery and does not prove an Avito listing is active today. No Avito listing page is requested by this probe.",
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "sample.json"), `${JSON.stringify({
  source: "avito",
  control_surface: "kaynly",
  generated_at: report.generated_at,
  target_unique_ids: TARGET_UNIQUE,
  sampled_unique_ids: sample.length,
  records: sample,
  stratum_observations: stratumObservations,
}, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  target_unique_ids: report.target_unique_ids,
  sampled_unique_ids: report.sampled_unique_ids,
  found_count: report.found_count,
  missing_count: report.missing_count,
  coverage_ratio: report.coverage_ratio,
  coverage_by_city: report.coverage_by_city,
  coverage_by_transaction: report.coverage_by_transaction,
  coverage_by_property_type: report.coverage_by_property_type,
}, null, 2));
