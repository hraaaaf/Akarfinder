#!/usr/bin/env tsx
// AkarFinder DB Recovery — robots-declared sitemap shadow harvest.
// OFFLINE OUTPUT ONLY: no DB client, no DB reads/writes, no listing-page fetches.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  parseRobotsSitemapUrls,
  parseSitemapLocs,
  qualifySitemapListingUrls,
  selectSitemapHarvestDomains,
  type SitemapSeedCandidate,
} from "@/lib/acquisition-scale-v1/sitemap-mass-seeds";
import { extractDomain } from "@/lib/openserp-ingestion/utils";

const USER_AGENT = "AkarFinder-Recovery-Sitemap-Shadow/1.0";
const REQUEST_TIMEOUT_MS = 12_000;
const REQUEST_PACING_MS = 400;
const MAX_SITEMAP_FILES_PER_DOMAIN = 80;
const MAX_URLS_PER_DOMAIN = 150_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBytes(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/xml,text/xml,text/plain,*/*;q=0.1",
      },
    });
    if (!response.ok) return null;
    const requestedDomain = extractDomain(url);
    const finalDomain = extractDomain(response.url || url);
    if (!requestedDomain || requestedDomain !== finalDomain) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeMaybeGzip(bytes: Buffer): string {
  const decoded = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
    ? gunzipSync(bytes)
    : bytes;
  return decoded.toString("utf8");
}

async function harvestDomain(domain: string): Promise<{
  domain: string;
  robots_ok: boolean;
  declared_sitemaps: number;
  sitemap_files_fetched: number;
  raw_urls_seen: number;
  qualified_urls: number;
  candidates: SitemapSeedCandidate[];
}> {
  const robotsUrl = `https://${domain}/robots.txt`;
  const robots = await fetchBytes(robotsUrl);
  if (!robots) {
    return {
      domain,
      robots_ok: false,
      declared_sitemaps: 0,
      sitemap_files_fetched: 0,
      raw_urls_seen: 0,
      qualified_urls: 0,
      candidates: [],
    };
  }

  const roots = parseRobotsSitemapUrls(robots.toString("utf8"), domain);
  if (roots.length === 0) {
    return {
      domain,
      robots_ok: true,
      declared_sitemaps: 0,
      sitemap_files_fetched: 0,
      raw_urls_seen: 0,
      qualified_urls: 0,
      candidates: [],
    };
  }

  const queue = [...roots];
  const visited = new Set<string>();
  const candidates: SitemapSeedCandidate[] = [];
  let rawUrlsSeen = 0;

  while (
    queue.length > 0
    && visited.size < MAX_SITEMAP_FILES_PER_DOMAIN
    && rawUrlsSeen < MAX_URLS_PER_DOMAIN
  ) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl) || extractDomain(sitemapUrl) !== domain) continue;
    visited.add(sitemapUrl);

    const bytes = await fetchBytes(sitemapUrl);
    await sleep(REQUEST_PACING_MS);
    if (!bytes) continue;

    let xml = "";
    try {
      xml = decodeMaybeGzip(bytes);
    } catch {
      continue;
    }

    const parsed = parseSitemapLocs(xml);
    if (parsed.kind === "index") {
      for (const loc of parsed.locs) {
        if (
          extractDomain(loc) === domain
          && !visited.has(loc)
          && queue.length + visited.size < MAX_SITEMAP_FILES_PER_DOMAIN
        ) {
          queue.push(loc);
        }
      }
      continue;
    }

    if (parsed.kind !== "urlset") continue;
    rawUrlsSeen += parsed.locs.length;
    candidates.push(...qualifySitemapListingUrls(domain, sitemapUrl, parsed.locs));
  }

  const deduped = [...new Map(candidates.map((row) => [row.canonical_url, row])).values()]
    .sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));

  return {
    domain,
    robots_ok: true,
    declared_sitemaps: roots.length,
    sitemap_files_fetched: visited.size,
    raw_urls_seen: rawUrlsSeen,
    qualified_urls: deduped.length,
    candidates: deduped,
  };
}

async function main() {
  const domains = selectSitemapHarvestDomains();
  const outputDir = join(process.cwd(), "data/audits/raw-results");
  const outputPath = join(outputDir, "recovery-sitemap-shadow-candidates.jsonl");
  const summaryPath = join(outputDir, "recovery-sitemap-shadow-summary.json");
  mkdirSync(dirname(outputPath), { recursive: true });

  const byUrl = new Map<string, SitemapSeedCandidate>();
  const perDomain: Array<Record<string, unknown>> = [];

  for (const domain of domains) {
    const result = await harvestDomain(domain);
    perDomain.push({
      domain: result.domain,
      robots_ok: result.robots_ok,
      declared_sitemaps: result.declared_sitemaps,
      sitemap_files_fetched: result.sitemap_files_fetched,
      raw_urls_seen: result.raw_urls_seen,
      qualified_urls: result.qualified_urls,
    });
    for (const row of result.candidates) byUrl.set(row.canonical_url, row);
    console.log(
      `[recovery-sitemap-shadow] ${domain}: robots=${result.robots_ok} roots=${result.declared_sitemaps} files=${result.sitemap_files_fetched} raw=${result.raw_urls_seen} qualified=${result.qualified_urls}`,
    );
    await sleep(REQUEST_PACING_MS);
  }

  const candidates = [...byUrl.values()].sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
  const jsonl = candidates.map((row) => JSON.stringify(row)).join("\n") + (candidates.length ? "\n" : "");
  writeFileSync(outputPath, jsonl, "utf8");

  const summary = {
    mode: "shadow_read_only",
    domains_checked: domains.length,
    unique_qualified_urls: candidates.length,
    per_domain: perDomain,
    artifact_path: outputPath,
    artifact_sha256: createHash("sha256").update(jsonl, "utf8").digest("hex"),
    database_access: 0,
    database_writes: 0,
    listing_page_fetches: 0,
    robots_declared_sitemaps_only: true,
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
