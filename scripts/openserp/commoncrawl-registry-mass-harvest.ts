#!/usr/bin/env tsx
// CASABLANCA-MASS-ACQUISITION-V1 — registry-wide Common Crawl seed harvest.
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
const CDX_FETCH_LIMIT = 20_000;
const REQUEST_PACING_MS = 350;
const MAX_ATTEMPTS = 5;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildCdxIndexUrl(domain: string, index: string): string {
  return `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url,timestamp,status,mimetype,digest&limit=${CDX_FETCH_LIMIT}`;
}

async function fetchCdxRecords(domain: string, index: string, fetchImpl: typeof fetch = fetch): Promise<MassCdxRecord[]> {
  const url = buildCdxIndexUrl(domain, index);
  let response: Response | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await fetchImpl(url);
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
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as { url?: string; timestamp?: string; status?: string; mimetype?: string; digest?: string };
      if (!parsed.url || !parsed.timestamp) continue;
      records.push({
        url: parsed.url,
        timestamp: parsed.timestamp,
        status: parsed.status,
        mime: parsed.mimetype,
        digest: parsed.digest,
        index,
      });
    } catch {
      // One malformed CDX line never aborts a domain harvest.
    }
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

async function main() {
  const registry = loadSourceDomainRegistry();
  const domains = selectRegistryMassHarvestDomains(registry);
  const outputDirectory = join(process.cwd(), "data/audits/raw-results");
  const outputPath = join(outputDirectory, "commoncrawl-registry-mass-seeds.jsonl");
  mkdirSync(outputDirectory, { recursive: true });

  const allSeeds: CommonCrawlMassSeed[] = [];
  const counters: MassDomainCounters[] = [];

  for (const domain of domains) {
    const records: MassCdxRecord[] = [];
    for (const index of MASS_CDX_INDEXES) {
      console.log(`[commoncrawl-mass] ${domain} <- ${index}`);
      records.push(...await fetchCdxRecords(domain, index));
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
    domains,
    domain_count: domains.length,
    cdx_indexes: MASS_CDX_INDEXES,
    total_qualified_seeds: deduped.length,
    counters,
    artifact_path: outputPath,
    artifact_sha256: createHash("sha256").update(jsonl, "utf8").digest("hex"),
  };
  console.log("=== COMMON CRAWL MASS HARVEST SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
