import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "data-ingestion/runs/avito/expanded-control";
const TARGET_UNIQUE = 100;
const MAX_PER_STRATUM = 12;
const CRAWLS = ["CC-MAIN-2026-34", "CC-MAIN-2026-30", "CC-MAIN-2026-25"];
const FETCH_TIMEOUT_MS = 15_000;
const CC_CONCURRENCY = 2;
const CC_RETRIES = 1;
const KAYNLY_PAUSE_MS = 250;
const USER_AGENT = "AkarFinderCoverageResearch/0.2 (+https://akarfinder.vercel.app)";

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
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
  return value.replaceAll("&amp;", "&").replaceAll("&#x2F;", "/").replaceAll("&#47;", "/");
}

function sourceIdFromUrl(url) {
  return url.match(/_(\d+)\.htm(?:[?#].*)?$/i)?.[1] ?? null;
}

function extractAvitoUrls(html) {
  const found = [];
  const seen = new Set();
  const regex = /href=["'](https:\/\/(?:www\.)?avito\.ma\/[^"'<>\s]+)["']/gi;
  for (const match of html.matchAll(regex)) {
    const url = normalizeHref(match[1]);
    const source_id = sourceIdFromUrl(url);
    if (!source_id || seen.has(source_id)) continue;
    seen.add(source_id);
    found.push({ source_id, url });
  }
  return found;
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
      // Ignore Common Crawl error JSON and malformed lines.
    }
  }
  return captures;
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
    const enriched = { ...record, city: stratum.city, transaction: stratum.transaction, property_type: stratum.property_type, control_page: stratum.url };
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

async function oneCommonCrawlRequest(record, crawl) {
  const endpoint = new URL(`https://index.commoncrawl.org/${crawl}-index`);
  endpoint.searchParams.set("url", record.url);
  endpoint.searchParams.set("output", "json");
  endpoint.searchParams.set("filter", "status:200");
  endpoint.searchParams.set("limit", "3");
  const result = await fetchText(endpoint.toString());
  const captures = result.ok ? parseValidCaptures(result.body, record.source_id) : [];
  const outcome = captures.length > 0
    ? "found"
    : (result.status === 404 || result.ok ? "no_match" : "indeterminate");
  return {
    source_id: record.source_id,
    crawl,
    endpoint: endpoint.toString(),
    http_status: result.status,
    ok: result.ok,
    outcome,
    capture_count: captures.length,
    captures,
    error: result.error ?? null,
  };
}

async function queryCommonCrawl(record, crawl) {
  let last;
  for (let attempt = 0; attempt <= CC_RETRIES; attempt += 1) {
    last = await oneCommonCrawlRequest(record, crawl);
    if (last.outcome !== "indeterminate") return { ...last, attempts: attempt + 1 };
    if (attempt < CC_RETRIES) await sleep(750 * (attempt + 1));
  }
  return { ...last, attempts: CC_RETRIES + 1 };
}

const tasks = [];
for (const record of sample) {
  for (const crawl of CRAWLS) tasks.push({ record, crawl });
}
const taskResults = [];
for (let i = 0; i < tasks.length; i += CC_CONCURRENCY) {
  const batch = tasks.slice(i, i + CC_CONCURRENCY);
  taskResults.push(...await Promise.all(batch.map(({ record, crawl }) => queryCommonCrawl(record, crawl))));
  await sleep(200);
}

const byId = new Map(sample.map((record) => [record.source_id, { ...record, classification: "indeterminate", crawl_results: [] }]));
for (const result of taskResults) byId.get(result.source_id)?.crawl_results.push(result);

for (const row of byId.values()) {
  if (row.crawl_results.some((result) => result.outcome === "found")) row.classification = "found";
  else if (row.crawl_results.length === CRAWLS.length && row.crawl_results.every((result) => result.outcome === "no_match")) row.classification = "definitive_missing";
  else row.classification = "indeterminate";
}

const observations = [...byId.values()];
const found = observations.filter((row) => row.classification === "found");
const definitiveMissing = observations.filter((row) => row.classification === "definitive_missing");
const indeterminate = observations.filter((row) => row.classification === "indeterminate");
const resolvedCount = found.length + definitiveMissing.length;

function summarizeDimension(key) {
  const buckets = new Map();
  for (const row of observations) {
    const value = row[key] ?? "unknown";
    const bucket = buckets.get(value) ?? { total: 0, found: 0, definitive_missing: 0, indeterminate: 0 };
    bucket.total += 1;
    bucket[row.classification] += 1;
    buckets.set(value, bucket);
  }
  return Object.fromEntries([...buckets.entries()].map(([value, bucket]) => {
    const resolved = bucket.found + bucket.definitive_missing;
    return [value, { ...bucket, resolved, resolved_coverage_ratio: resolved ? bucket.found / resolved : null }];
  }));
}

const transport = { http_200: 0, http_404: 0, http_429: 0, http_5xx: 0, timeout_or_error: 0, other: 0 };
for (const result of taskResults) {
  if (result.http_status === 200) transport.http_200 += 1;
  else if (result.http_status === 404) transport.http_404 += 1;
  else if (result.http_status === 429) transport.http_429 += 1;
  else if (typeof result.http_status === "number" && result.http_status >= 500) transport.http_5xx += 1;
  else if (result.http_status == null) transport.timeout_or_error += 1;
  else transport.other += 1;
}

const report = {
  source: "avito",
  discovery_lane: "kaynly_stratified_control_to_commoncrawl_v2",
  generated_at: new Date().toISOString(),
  target_unique_ids: TARGET_UNIQUE,
  sampled_unique_ids: observations.length,
  kaynly_page_requests_max: STRATA.length,
  commoncrawl_indexes: CRAWLS,
  commoncrawl_logical_requests: observations.length * CRAWLS.length,
  found_count: found.length,
  definitive_missing_count: definitiveMissing.length,
  indeterminate_count: indeterminate.length,
  resolved_count: resolvedCount,
  resolved_coverage_ratio: resolvedCount ? found.length / resolvedCount : null,
  found_ids: found.map((row) => row.source_id),
  definitive_missing_ids: definitiveMissing.map((row) => row.source_id),
  indeterminate_ids: indeterminate.map((row) => row.source_id),
  transport,
  coverage_by_city: summarizeDimension("city"),
  coverage_by_transaction: summarizeDimension("transaction"),
  coverage_by_property_type: summarizeDimension("property_type"),
  stratum_observations: stratumObservations,
  observations,
  interpretation: "Only HTTP-successful CDX rows with url, status=200, and matching Avito source_id count as captures. 404/empty-success is no_match; timeout/429/5xx is indeterminate. Kaynly is only a bounded public URL/ID control surface; no Avito listing page is requested.",
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "sample.json"), `${JSON.stringify({ source: "avito", control_surface: "kaynly", generated_at: report.generated_at, target_unique_ids: TARGET_UNIQUE, sampled_unique_ids: sample.length, records: sample, stratum_observations: stratumObservations }, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  target_unique_ids: report.target_unique_ids,
  sampled_unique_ids: report.sampled_unique_ids,
  found_count: report.found_count,
  definitive_missing_count: report.definitive_missing_count,
  indeterminate_count: report.indeterminate_count,
  resolved_count: report.resolved_count,
  resolved_coverage_ratio: report.resolved_coverage_ratio,
  transport: report.transport,
}, null, 2));
