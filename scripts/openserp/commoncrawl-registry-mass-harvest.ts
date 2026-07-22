#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — registry-wide Common Crawl seed harvest.
// COMMONCRAWL-CDX-MIME-FIX-1
// COMMONCRAWL-FAILSOFT-CANARY-V1
//
// This is URL-index metadata only. It never downloads WARC/page content and
// never requests a source website. Domains are selected exclusively from the
// existing approved_discovery registry entries that have explicit listing URL
// patterns. Output is a local JSONL seed artifact; no DB write happens here.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSourceDomainRegistry, getListingUrlPatterns } from "@/lib/openserp-ingestion/domain-registry";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";
import {
  selectRegistryMassHarvestDomains,
  type CommonCrawlMassSeed,
} from "@/lib/acquisition-scale-v1/commoncrawl-mass-seeds";

export const MASS_CDX_INDEXES = ["CC-MAIN-2026-25", "CC-MAIN-2026-21", "CC-MAIN-2026-17"] as const;
export const MASS_CANARY_DOMAINS = ["soukimmobilier.com", "masaken.ma", "atlasimmobilier.com", "daragadir.com"] as const;
const CDX_FETCH_LIMIT = 20_000;
const REQUEST_PACING_MS = 1_000;
const MAX_ATTEMPTS = 5;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const COMMON_CRAWL_USER_AGENT = "AkarFinder-CommonCrawl-Harvester/1.0 (+https://github.com/hraaaaf/Akarfinder)";

export type MassCdxRecord = {
  url: string;
  timestamp: string;
  status?: string;
  mime?: string;
  digest?: string;
  index: string;
};

export type MassDomainCounters = {
  domain: string;
  cdx_raw_records: number;
  canonical_unique_urls: number;
  qualified_seed_urls: number;
  non_listing_rejected: number;
  malformed_rejected: number;
  no_200_html_rejected: number;
};

export type HarvestIndexFailure = {
  domain: string;
  index: string;
  error: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildCdxIndexUrl(domain: string, index: string): string {
  return `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url,timestamp,status,mime,digest&limit=${CDX_FETCH_LIMIT}`;
}

export function parseMassCdxJsonLine(line: string, index: string): MassCdxRecord | null {
  if (!line.trim()) return null;
  try {
    const parsed = JSON.parse(line) as {
      url?: string;
      timestamp?: string;
      status?: string;
      mime?: string;
      mimetype?: string;
      digest?: string;
    };
    if (!parsed.url || !parsed.timestamp) return null;
    return {
      url: parsed.url,
      timestamp: parsed.timestamp,
      status: parsed.status,
      mime: parsed.mime ?? parsed.mimetype,
      digest: parsed.digest,
      index,
    };
  } catch {
    return null;
  }
}

async function fetchCdxRecords(domain: string, index: string, fetchImpl: typeof fetch = fetch): Promise<MassCdxRecord[]> {
  const url = buildCdxIndexUrl(domain, index);
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await fetchImpl(url, {
      headers: {
        "User-Agent": COMMON_CRAWL_USER_AGENT,
        Accept: "application/json,text/plain;q=0.9,*/*;q=0.1",
      },
    });
    if (response.status === 404) return [];
    if (response.ok) break;
    if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(`Common Crawl CDX failed for ${domain}/${index}: HTTP ${response.status}`);
    }
    await sleep(1000 * 2 ** (attempt - 1));
  }

  const text = await response!.text();
  const records: MassCdxRecord[] = [];
  for (const line of text.split("\n")) {
    const record = parseMassCdxJsonLine(line, index);
    if (record) records.push(record);
  }
  return records;
}

export function processMassDomainRecords(
  domain: string,
  records: MassCdxRecord[],
): { counters: MassDomainCounters; seeds: CommonCrawlMassSeed[] } {
  const registry = loadSourceDomainRegistry();
  const patterns = getListingUrlPatterns(domain, registry);
  const grouped = new Map<string, MassCdxRecord[]>();
  let malformedRejected = 0;

  for (const record of records) {
    const actualDomain = extractDomain(record.url);
    const canonical = canonicalizeSourceUrl(record.url);
    if (!actualDomain || actualDomain !== domain || !canonical) {
      malformedRejected += 1;
      continue;
    }
    if (!grouped.has(canonical)) grouped.set(canonical, []);
    grouped.get(canonical)!.push(record);
  }

  const seeds: CommonCrawlMassSeed[] = [];
  let nonListingRejected = 0;
  let no200HtmlRejected = 0;

  for (const [canonicalUrl, observations] of grouped) {
    const pathname = new URL(canonicalUrl).pathname;
    if (!patterns.some((pattern) => pattern.test(pathname))) {
      nonListingRejected += 1;
      continue;
    }

    const hasHealthyHtmlObservation = observations.some((record) =>
      record.status === "200" && (record.mime ?? "").toLowerCase().includes("text/html"),
    );
    if (!hasHealthyHtmlObservation) {
      no200HtmlRejected += 1;
      continue;
    }

    const timestamps = observations.map((record) => record.timestamp).sort();
    seeds.push({
      canonical_url: canonicalUrl,
      source_domain: domain,
      cdx_indexes_seen: [...new Set(observations.map((record) => record.index))].sort(),
      first_cdx_timestamp: timestamps[0],
      last_cdx_timestamp: timestamps[timestamps.length - 1],
      cdx_observation_count: observations.length,
      listing_pattern_matched: true,
      status_codes_observed: [...new Set(observations.map((record) => record.status).filter((value): value is string => Boolean(value)))].sort(),
      mime_observed: [...new Set(observations.map((record) => record.mime).filter((value): value is string => Boolean(value)))].sort(),
    });
  }

  seeds.sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
  return {
    counters: {
      domain,
      cdx_raw_records: records.length,
      canonical_unique_urls: grouped.size,
      qualified_seed_urls: seeds.length,
      non_listing_rejected: nonListingRejected,
      malformed_rejected: malformedRejected,
      no_200_html_rejected: no200HtmlRejected,
    },
    seeds,
  };
}

export function selectMassHarvestDomains(allDomains: string[], mode = process.env.COMMONCRAWL_MASS_MODE ?? "all"): string[] {
  const available = new Set(allDomains);
  const canaryOrdered = MASS_CANARY_DOMAINS.filter((domain) => available.has(domain));
  const canary = new Set<string>(canaryOrdered);
  const remainder = allDomains.filter((domain) => !canary.has(domain));
  if (mode === "canary") return [...canaryOrdered];
  if (mode === "remainder") return remainder;
  return [...canaryOrdered, ...remainder];
}

async function main() {
  const registry = loadSourceDomainRegistry();
  const allDomains = selectRegistryMassHarvestDomains(registry);
  const mode = process.env.COMMONCRAWL_MASS_MODE ?? "all";
  const domains = selectMassHarvestDomains(allDomains, mode);
  const outputDirectory = join(process.cwd(), "data/audits/raw-results");
  const outputPath = join(outputDirectory, "commoncrawl-registry-mass-seeds.jsonl");
  mkdirSync(outputDirectory, { recursive: true });

  const allSeeds: CommonCrawlMassSeed[] = [];
  const counters: MassDomainCounters[] = [];
  const failures: HarvestIndexFailure[] = [];
  let successfulIndexRequests = 0;

  for (const domain of domains) {
    const records: MassCdxRecord[] = [];
    for (const index of MASS_CDX_INDEXES) {
      console.log(`[commoncrawl-mass] ${domain} <- ${index}`);
      try {
        records.push(...await fetchCdxRecords(domain, index));
        successfulIndexRequests += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ domain, index, error: message });
        console.error(`[commoncrawl-mass] fail-soft ${domain}/${index}: ${message}`);
      }
      await sleep(REQUEST_PACING_MS);
    }
    const processed = processMassDomainRecords(domain, records);
    counters.push(processed.counters);
    allSeeds.push(...processed.seeds);
    console.log(`[commoncrawl-mass] ${domain}: ${JSON.stringify(processed.counters)}`);
  }

  const deduped = [...new Map(allSeeds.map((seed) => [seed.canonical_url, seed])).values()]
    .sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
  const jsonl = deduped.map((seed) => JSON.stringify(seed)).join("\n") + (deduped.length ? "\n" : "");
  writeFileSync(outputPath, jsonl, "utf8");

  const summary = {
    generated_at: new Date().toISOString(),
    mode,
    domains,
    domain_count: domains.length,
    cdx_indexes: MASS_CDX_INDEXES,
    successful_index_requests: successfulIndexRequests,
    failed_index_requests: failures.length,
    failures,
    total_qualified_seeds: deduped.length,
    counters,
    artifact_path: outputPath,
    artifact_sha256: createHash("sha256").update(jsonl, "utf8").digest("hex"),
  };
  console.log("=== COMMON CRAWL MASS HARVEST SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));

  // Fail only if Common Crawl was completely unreachable for this phase. A
  // partial outage must never discard healthy domains or block their import.
  if (domains.length > 0 && successfulIndexRequests === 0) {
    throw new Error(`Common Crawl harvest mode=${mode} had zero successful index requests`);
  }
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
