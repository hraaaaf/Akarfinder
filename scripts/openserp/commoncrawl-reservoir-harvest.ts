#!/usr/bin/env tsx
// AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#10/10) -- National Backfill
// reservoir measurement. Generalizes the 4-domain bulk seed harvester
// (commoncrawl-bulk-seed-harvest.ts) to EVERY registered approved_discovery
// domain that has listing_url_patterns, across N Common Crawl indexes, and
// measures the deduplicated unique-canonical-URL reservoir the authorized
// sources can yield. Offline metadata only (CDX index API) -- no WARC, no
// page fetch, no DB write. This is a CAPACITY MEASUREMENT: it proves how
// close the authorized reservoirs get to the 100k goal WITHOUT requiring the
// source_offer_seeds Production migration (still pending a safe apply path).
//
// Reuses canonicalizeSourceUrl + getListingUrlPatterns unmodified, and the
// SAME strict registry-pattern-only filtering (no textual-signals lane) as
// #4/10.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";
import { getListingUrlPatterns, loadSourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";

// Index list is expandable per mandate 10.2 (3 -> 6 -> 12 -> historical).
// Start with 6 recent indexes; a CLI arg can widen it.
const DEFAULT_INDEXES = [
  "CC-MAIN-2026-25", "CC-MAIN-2026-21", "CC-MAIN-2026-17",
  "CC-MAIN-2026-13", "CC-MAIN-2026-09", "CC-MAIN-2026-05",
];

const CDX_FETCH_LIMIT = 150_000; // large portals (avito/mubawab) can have many URLs
const CDX_REQUEST_PACING_MS = 400;
const CDX_RETRYABLE = new Set([429, 500, 502, 503, 504]);
const CDX_MAX_ATTEMPTS = 5;

type PerDomain = {
  domain: string;
  cdx_raw_records: number;
  canonical_unique_urls: number;
  listing_pattern_matches: number;
  malformed_rejected: number;
};

async function fetchCdx(domain: string, index: string): Promise<string[]> {
  const url = `https://index.commoncrawl.org/${index}-index?url=${encodeURIComponent(domain)}&matchType=domain&output=json&fl=url&limit=${CDX_FETCH_LIMIT}`;
  let resp: Response | undefined;
  for (let attempt = 1; attempt <= CDX_MAX_ATTEMPTS; attempt++) {
    resp = await fetch(url);
    if (resp.status === 404) return [];
    if (resp.ok) break;
    if (!CDX_RETRYABLE.has(resp.status) || attempt === CDX_MAX_ATTEMPTS) {
      throw new Error(`CDX ${domain}/${index}: HTTP ${resp.status}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
  }
  const text = await resp!.text();
  if (!text.trim()) return [];
  const urls: string[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line) as { url?: string };
      if (p.url) urls.push(p.url);
    } catch { /* skip malformed line */ }
  }
  return urls;
}

async function main() {
  const indexes = process.argv[2] ? process.argv[2].split(",") : DEFAULT_INDEXES;
  const registry = loadSourceDomainRegistry();
  const domains = registry.domains
    .filter((d) => d.status === "approved_discovery" && d.listing_url_patterns && d.listing_url_patterns.length > 0)
    .map((d) => d.domain);

  const globalCanonical = new Set<string>();
  const perDomain: PerDomain[] = [];

  for (const domain of domains) {
    const patterns = getListingUrlPatterns(domain, registry);
    if (patterns.length === 0) continue;

    const rawUrls = new Set<string>();
    let rawRecords = 0;
    for (const index of indexes) {
      try {
        const urls = await fetchCdx(domain, index);
        rawRecords += urls.length;
        for (const u of urls) rawUrls.add(u);
      } catch (e) {
        console.error(`[reservoir] ${domain}/${index} failed (isolated, continuing): ${e instanceof Error ? e.message : String(e)}`);
      }
      await new Promise((r) => setTimeout(r, CDX_REQUEST_PACING_MS));
    }

    let malformed = 0;
    const domainCanonical = new Set<string>();
    for (const rawUrl of rawUrls) {
      const host = extractDomain(rawUrl);
      if (!host || host !== domain) { malformed++; continue; }
      const canonical = canonicalizeSourceUrl(rawUrl);
      if (!canonical) { malformed++; continue; }
      let pathname: string;
      try { pathname = new URL(canonical).pathname; } catch { continue; }
      if (!patterns.some((p) => p.test(pathname))) continue; // strict registry pattern only
      domainCanonical.add(canonical);
      globalCanonical.add(canonical);
    }

    perDomain.push({
      domain,
      cdx_raw_records: rawRecords,
      canonical_unique_urls: rawUrls.size,
      listing_pattern_matches: domainCanonical.size,
      malformed_rejected: malformed,
    });
    console.log(`[reservoir] ${domain}: raw=${rawRecords} uniqueRaw=${rawUrls.size} listingMatches=${domainCanonical.size}`);
  }

  const outDir = join(process.cwd(), "data/audits/raw-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "commoncrawl-reservoir-canonical-urls.txt");
  const sorted = [...globalCanonical].sort();
  writeFileSync(outPath, sorted.join("\n") + "\n", "utf8");
  const hash = createHash("sha256").update(sorted.join("\n"), "utf8").digest("hex");

  const totalListingMatches = perDomain.reduce((s, d) => s + d.listing_pattern_matches, 0);
  const summary = {
    mission: "AKARFINDER-100K-ROADMAP-AUTONOMOUS-GOAL-1 (#10/10) reservoir measurement",
    generated_at_utc: new Date().toISOString(),
    indexes,
    domains_measured: domains.length,
    per_domain: perDomain.sort((a, b) => b.listing_pattern_matches - a.listing_pattern_matches),
    sum_of_per_domain_listing_matches: totalListingMatches,
    global_unique_canonical_listing_urls: globalCanonical.size,
    cross_domain_overlap: totalListingMatches - globalCanonical.size,
    goal: 100000,
    reached_goal: globalCanonical.size >= 100000,
    artifact_path: outPath,
    artifact_sha256: hash,
  };
  console.log("\n=== RESERVOIR SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error("Fatal:", e instanceof Error ? e.stack : String(e)); process.exit(1); });
}
