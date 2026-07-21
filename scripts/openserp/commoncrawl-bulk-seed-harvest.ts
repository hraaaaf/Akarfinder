#!/usr/bin/env tsx
// OPENSERP-COMMONCRAWL-BULK-SEED-HARVEST-TOP-SOURCES-1
// Offline-only harvester: extracts, canonicalizes, and STRICTLY registry-
// pattern-filters Common Crawl CDX seed URLs for exactly 4 domains
// (soukimmobilier.com, daragadir.com, masaken.ma, atlasimmobilier.com).
//
// Produces a deterministic local JSONL artifact of QUALIFIED SEEDS only.
// A seed is NEVER proof of an active listing, never a property_listing,
// never written to any database by this script -- see the mission's own
// storage-path audit finding (reported separately): no DB write path is
// exercised here. This is index/CDX metadata only -- no WARC download, no
// page-content fetch of any kind, ever.
//
// Reuses the EXISTING canonicalizeSourceUrl (utils.ts) and
// getListingUrlPatterns (domain-registry.ts) unmodified -- no second
// canonicalization implementation, no textual-signals lane (registry
// pattern strict match only, deliberately excluding the generic
// textual_detail_signals admission path that a live ingestion run would
// also consider).

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";
import { getListingUrlPatterns, loadSourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";

export const HARVEST_DOMAINS = ["soukimmobilier.com", "daragadir.com", "masaken.ma", "atlasimmobilier.com"] as const;
export type HarvestDomain = (typeof HARVEST_DOMAINS)[number];

export const CDX_INDEXES = ["CC-MAIN-2026-25", "CC-MAIN-2026-21", "CC-MAIN-2026-17"] as const;

const CDX_FETCH_LIMIT = 20_000; // comfortably above every domain's known total (max observed ~2500)
const CDX_REQUEST_PACING_MS = 300;

export type CdxRawRecord = {
  url: string;
  timestamp: string;
  status?: string;
  mime?: string;
  digest?: string;
  index: string;
};

export type QualifiedSeed = {
  canonical_url: string;
  source_domain: HarvestDomain;
  cdx_indexes_seen: string[];
  first_cdx_timestamp: string;
  last_cdx_timestamp: string;
  cdx_observation_count: number;
  listing_pattern_matched: true;
  status_codes_observed: string[];
  mime_observed: string[];
};

export type DomainHarvestCounters = {
  domain: HarvestDomain;
  cdx_raw_records: number;
  unique_raw_urls: number;
  valid_urls: number;
  canonical_unique_urls: number;
  listing_pattern_matches: number;
  malformed_rejected: number;
  non_listing_pattern_rejected: number;
  cross_index_duplicates: number;
  already_known_discovery_candidates: number | null; // filled by a separate, read-only cross-check step
  potentially_new_seed_urls: number | null;
};

const CDX_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const CDX_MAX_ATTEMPTS = 5;
const CDX_RETRY_BASE_DELAY_MS = 1000;

async function fetchCdxRecords(domain: string, index: string, fetchImpl: typeof fetch = fetch): Promise<CdxRawRecord[]> {
  const url = `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url,timestamp,status,mimetype,digest&limit=${CDX_FETCH_LIMIT}`;

  let response: Response | undefined;
  for (let attempt = 1; attempt <= CDX_MAX_ATTEMPTS; attempt++) {
    response = await fetchImpl(url);
    if (response.status === 404) return []; // domain genuinely absent from this index -- not an error
    if (response.ok) break;
    if (!CDX_RETRYABLE_STATUSES.has(response.status) || attempt === CDX_MAX_ATTEMPTS) {
      throw new Error(`CDX fetch failed for ${domain} on ${index}: HTTP ${response.status}`);
    }
    // Common Crawl's CDX API is documented to return transient 429/5xx under
    // load -- exponential backoff, never a silent skip of the domain/index.
    const delayMs = CDX_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
    console.log(`[harvest] CDX ${domain}/${index} returned HTTP ${response.status} (attempt ${attempt}/${CDX_MAX_ATTEMPTS}), retrying in ${delayMs}ms...`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const text = await response!.text();
  if (!text.trim()) return [];
  const records: CdxRawRecord[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as { url?: string; timestamp?: string; status?: string; mimetype?: string; digest?: string };
      if (!parsed.url || !parsed.timestamp) continue;
      records.push({ url: parsed.url, timestamp: parsed.timestamp, status: parsed.status, mime: parsed.mimetype, digest: parsed.digest, index });
    } catch {
      // malformed CDX line -- skip, never crash the harvest for one bad line
    }
  }
  return records;
}

// Pure function: given all raw CDX records for one domain (already fetched,
// across every queried index), compute the qualified-seed set and exact
// counters. Kept separate from network fetching so it is independently,
// deterministically testable.
export function processDomainRecords(domain: HarvestDomain, allRecords: CdxRawRecord[]): { counters: DomainHarvestCounters; seeds: QualifiedSeed[] } {
  const cdxRawRecords = allRecords.length;

  const byRawUrl = new Map<string, CdxRawRecord[]>();
  for (const rec of allRecords) {
    if (!byRawUrl.has(rec.url)) byRawUrl.set(rec.url, []);
    byRawUrl.get(rec.url)!.push(rec);
  }
  const uniqueRawUrls = byRawUrl.size;

  let malformedRejected = 0;
  const byCanonicalUrl = new Map<string, { raw: CdxRawRecord[]; canonical: string }>();

  for (const [rawUrl, recs] of byRawUrl) {
    const hostname = extractDomain(rawUrl);
    if (!hostname || hostname !== domain) {
      malformedRejected += 1; // wrong-host / unparseable raw URL
      continue;
    }
    const canonical = canonicalizeSourceUrl(rawUrl);
    if (!canonical) {
      malformedRejected += 1;
      continue;
    }
    if (!byCanonicalUrl.has(canonical)) byCanonicalUrl.set(canonical, { raw: [], canonical });
    byCanonicalUrl.get(canonical)!.raw.push(...recs);
  }

  const validUrls = uniqueRawUrls - malformedRejected;
  const canonicalUniqueUrls = byCanonicalUrl.size;

  const patterns = getListingUrlPatterns(domain);
  const seeds: QualifiedSeed[] = [];
  let crossIndexDuplicates = 0;

  for (const [canonicalUrl, entry] of byCanonicalUrl) {
    let pathname: string;
    try {
      pathname = new URL(canonicalUrl).pathname;
    } catch {
      continue; // defensive, canonicalizeSourceUrl already guarantees a parseable URL
    }
    // STRICT registry pattern match only -- deliberately no textual-signals
    // fallback lane, per this mission's explicit instruction.
    if (!patterns.some((p) => p.test(pathname))) continue;

    const indexesSeen = [...new Set(entry.raw.map((r) => r.index))].sort();
    if (indexesSeen.length > 1) crossIndexDuplicates += 1;
    const timestamps = entry.raw.map((r) => r.timestamp).sort();
    const statusCodes = [...new Set(entry.raw.map((r) => r.status).filter((s): s is string => Boolean(s)))].sort();
    const mimes = [...new Set(entry.raw.map((r) => r.mime).filter((m): m is string => Boolean(m)))].sort();

    seeds.push({
      canonical_url: canonicalUrl,
      source_domain: domain,
      cdx_indexes_seen: indexesSeen,
      first_cdx_timestamp: timestamps[0],
      last_cdx_timestamp: timestamps[timestamps.length - 1],
      cdx_observation_count: entry.raw.length,
      listing_pattern_matched: true,
      status_codes_observed: statusCodes,
      mime_observed: mimes,
    });
  }

  // Deterministic output order.
  seeds.sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));

  const listingPatternMatches = seeds.length;
  const nonListingPatternRejected = canonicalUniqueUrls - listingPatternMatches;

  const counters: DomainHarvestCounters = {
    domain,
    cdx_raw_records: cdxRawRecords,
    unique_raw_urls: uniqueRawUrls,
    valid_urls: validUrls,
    canonical_unique_urls: canonicalUniqueUrls,
    listing_pattern_matches: listingPatternMatches,
    malformed_rejected: malformedRejected,
    non_listing_pattern_rejected: nonListingPatternRejected,
    cross_index_duplicates: crossIndexDuplicates,
    already_known_discovery_candidates: null,
    potentially_new_seed_urls: null,
  };

  return { counters, seeds };
}

export function daragadirStabilityVerdict(seeds: QualifiedSeed[]): "HIGH" | "MEDIUM" | "LOW" {
  // No strong ID exists for daragadir.com -- stability is assessed purely
  // from cross-index/timestamp behavior of the SLUG itself (the canonical
  // URL, already deduplicated), never by inventing an identifier.
  if (seeds.length === 0) return "LOW";
  const multiIndexCount = seeds.filter((s) => s.cdx_indexes_seen.length > 1).length;
  const multiIndexRate = multiIndexCount / seeds.length;
  if (multiIndexRate >= 0.5) return "HIGH";
  if (multiIndexRate >= 0.2) return "MEDIUM";
  return "LOW";
}

async function main() {
  const outDir = join(process.cwd(), "data/audits/raw-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "commoncrawl-top-sources-seeds.jsonl");

  loadSourceDomainRegistry(); // warm the module-level cache once

  const allCounters: DomainHarvestCounters[] = [];
  const allSeeds: QualifiedSeed[] = [];

  for (const domain of HARVEST_DOMAINS) {
    const records: CdxRawRecord[] = [];
    for (const index of CDX_INDEXES) {
      console.log(`[harvest] fetching ${domain} from ${index}...`);
      const recs = await fetchCdxRecords(domain, index);
      records.push(...recs);
      await new Promise((r) => setTimeout(r, CDX_REQUEST_PACING_MS));
    }
    const { counters, seeds } = processDomainRecords(domain, records);
    allCounters.push(counters);
    allSeeds.push(...seeds);
    console.log(`[harvest] ${domain}: ${JSON.stringify(counters)}`);
  }

  const jsonl = allSeeds.map((s) => JSON.stringify(s)).join("\n") + "\n";
  writeFileSync(outPath, jsonl, "utf8");
  const hash = createHash("sha256").update(jsonl, "utf8").digest("hex");

  const summary = {
    generated_at: new Date().toISOString(),
    domains: HARVEST_DOMAINS,
    cdx_indexes: CDX_INDEXES,
    counters: allCounters,
    total_qualified_seeds: allSeeds.length,
    artifact_path: outPath,
    artifact_sha256: hash,
    artifact_line_count: allSeeds.length,
  };
  console.log("\n=== HARVEST SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error("Fatal:", error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}
