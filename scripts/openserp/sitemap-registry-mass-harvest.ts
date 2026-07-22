#!/usr/bin/env tsx
// MASS-ACQUISITION-FREE-ACCELERATION-1 — free sitemap acquisition lane.
//
// Fetch scope is intentionally narrow: https://<approved-domain>/robots.txt and
// sitemap files explicitly declared there. No listing/detail/category page is
// ever fetched. Output rows go only to source_offer_seeds as seed_only.

import { gunzipSync } from "node:zlib";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import {
  buildSitemapSeedRows,
  parseRobotsSitemapUrls,
  parseSitemapLocs,
  qualifySitemapListingUrls,
  selectSitemapHarvestDomains,
  type SitemapSeedCandidate,
  type SitemapSeedInsert,
} from "@/lib/acquisition-scale-v1/sitemap-mass-seeds";
import { extractDomain } from "@/lib/openserp-ingestion/utils";

const USER_AGENT = "AkarFinder-Sitemap-Indexer/1.0";
const REQUEST_TIMEOUT_MS = 12_000;
const REQUEST_PACING_MS = 250;
const MAX_SITEMAP_FILES_PER_DOMAIN = 60;
const MAX_URLS_PER_DOMAIN = 100_000;
const UPSERT_CHUNK = 500;

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function fetchBytes(url: string, fetchImpl: typeof fetch = fetch): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "application/xml,text/xml,text/plain,*/*;q=0.1" },
    });
    if (!response.ok) return null;
    const finalDomain = extractDomain(response.url || url);
    const requestedDomain = extractDomain(url);
    if (!finalDomain || !requestedDomain || finalDomain !== requestedDomain) return null;
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

function decodeMaybeGzip(bytes: Buffer): string {
  const decoded = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes;
  return decoded.toString("utf8");
}

export async function harvestDomainSitemaps(domain: string, fetchImpl: typeof fetch = fetch): Promise<{
  domain: string;
  robots_sitemaps: number;
  sitemap_files_fetched: number;
  raw_urls_seen: number;
  qualified_seeds: SitemapSeedCandidate[];
}> {
  const robotsUrl = `https://${domain}/robots.txt`;
  const robotsBytes = await fetchBytes(robotsUrl, fetchImpl);
  if (!robotsBytes) return { domain, robots_sitemaps: 0, sitemap_files_fetched: 0, raw_urls_seen: 0, qualified_seeds: [] };

  const roots = parseRobotsSitemapUrls(robotsBytes.toString("utf8"), domain);
  const queue = [...roots];
  const visited = new Set<string>();
  const candidates: SitemapSeedCandidate[] = [];
  let rawUrlsSeen = 0;

  while (queue.length > 0 && visited.size < MAX_SITEMAP_FILES_PER_DOMAIN && rawUrlsSeen < MAX_URLS_PER_DOMAIN) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl) || extractDomain(sitemapUrl) !== domain) continue;
    visited.add(sitemapUrl);

    const bytes = await fetchBytes(sitemapUrl, fetchImpl);
    await sleep(REQUEST_PACING_MS);
    if (!bytes) continue;

    let xml: string;
    try { xml = decodeMaybeGzip(bytes); } catch { continue; }
    const parsed = parseSitemapLocs(xml);

    if (parsed.kind === "index") {
      for (const loc of parsed.locs) {
        if (extractDomain(loc) === domain && !visited.has(loc) && queue.length + visited.size < MAX_SITEMAP_FILES_PER_DOMAIN) queue.push(loc);
      }
      continue;
    }

    if (parsed.kind !== "urlset") continue;
    rawUrlsSeen += parsed.locs.length;
    candidates.push(...qualifySitemapListingUrls(domain, sitemapUrl, parsed.locs));
  }

  const deduped = [...new Map(candidates.map((candidate) => [candidate.canonical_url, candidate])).values()]
    .sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
  return {
    domain,
    robots_sitemaps: roots.length,
    sitemap_files_fetched: visited.size,
    raw_urls_seen: rawUrlsSeen,
    qualified_seeds: deduped,
  };
}

async function insertRows(rows: SitemapSeedInsert[]): Promise<void> {
  const client = getSupabaseServerClient();
  for (let offset = 0; offset < rows.length; offset += UPSERT_CHUNK) {
    const { error } = await client
      .from("source_offer_seeds")
      .upsert(rows.slice(offset, offset + UPSERT_CHUNK), { onConflict: "canonical_url", ignoreDuplicates: true });
    if (error) throw error;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const domains = selectSitemapHarvestDomains();
  const allCandidates: SitemapSeedCandidate[] = [];
  const perDomain = [];

  for (const domain of domains) {
    try {
      const result = await harvestDomainSitemaps(domain);
      perDomain.push({ ...result, qualified_seeds: result.qualified_seeds.length });
      allCandidates.push(...result.qualified_seeds);
      console.log(`[sitemap-mass] ${domain}: roots=${result.robots_sitemaps} files=${result.sitemap_files_fetched} raw=${result.raw_urls_seen} qualified=${result.qualified_seeds.length}`);
    } catch (error) {
      perDomain.push({ domain, error: error instanceof Error ? error.message : String(error) });
      console.warn(`[sitemap-mass] ${domain}: failed closed`);
    }
    await sleep(REQUEST_PACING_MS);
  }

  const rows = buildSitemapSeedRows(allCandidates);
  const summary = { apply, domains_checked: domains.length, qualified_unique_seeds: rows.length, per_domain: perDomain };

  if (!apply) {
    console.log(JSON.stringify({ ok: true, status: "DRY_RUN", ...summary }, null, 2));
    return;
  }
  if (!isOpenSerpIngestionCronAuthorized()) {
    console.log(JSON.stringify({ ok: true, status: "NOOP_FLAGS_DISABLED", ...summary }, null, 2));
    return;
  }

  await insertRows(rows);
  console.log(JSON.stringify({ ok: true, status: "APPLIED", ...summary }, null, 2));
}

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}