#!/usr/bin/env tsx

import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { isOpenSerpIngestionCronAuthorized } from "@/lib/openserp-ingestion/openserp-ingestion-feature-flags";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";
import { getListingUrlPatterns, loadSourceDomainRegistry } from "@/lib/openserp-ingestion/domain-registry";

const APPLY = process.argv.includes("--apply");
const MAX_SITEMAPS_PER_SOURCE = 40;
const MAX_URLS_PER_SOURCE = 15_000;
const MAX_BYTES = 5_000_000;
const FETCH_TIMEOUT_MS = 20_000;
const CHUNK = 300;

const SOURCES = [
  { domain: "daragadir.com", roots: ["https://daragadir.com/sitemap_index.xml", "https://daragadir.com/sitemap.xml"] },
  { domain: "promoimmomarrakech.com", roots: ["https://www.promoimmomarrakech.com/sitemap-propriete.xml"] },
  { domain: "limmobiliersansfrontieres.com", roots: ["https://limmobiliersansfrontieres.com/property-sitemap.xml", "https://limmobiliersansfrontieres.com/property-sitemap2.xml"] },
] as const;

type SitemapEntry = { loc: string; lastmod: string | null };

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function parseSitemapXml(xml: string): { kind: "index" | "urlset"; entries: SitemapEntry[] } {
  const kind = /<\s*sitemapindex\b/i.test(xml) ? "index" : "urlset";
  const blockTag = kind === "index" ? "sitemap" : "url";
  const blocks = [...xml.matchAll(new RegExp(`<${blockTag}\\b[^>]*>([\\s\\S]*?)<\\/${blockTag}>`, "gi"))];
  const entries: SitemapEntry[] = [];
  for (const block of blocks) {
    const body = block[1] ?? "";
    const loc = body.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = body.match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim() ?? null;
    entries.push({ loc: decodeXml(loc), lastmod: lastmod ? decodeXml(lastmod) : null });
  }
  return { kind, entries };
}

async function fetchXml(url: string, expectedDomain: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "AkarFinder-Sitemap-Delta/1.0 (+https://akarfinder.vercel.app)" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    const finalDomain = extractDomain(response.url);
    if (finalDomain !== expectedDomain) throw new Error(`cross-domain redirect refused: ${url} -> ${response.url}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!/(xml|text\/plain|application\/octet-stream)/i.test(contentType)) {
      throw new Error(`unexpected sitemap content-type ${contentType} for ${url}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error(`sitemap too large: ${url}`);
    return new TextDecoder().decode(bytes);
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverSource(domain: string, roots: readonly string[]): Promise<SitemapEntry[]> {
  const queue = [...roots];
  const visited = new Set<string>();
  const urls = new Map<string, SitemapEntry>();
  const patterns = getListingUrlPatterns(domain, loadSourceDomainRegistry());
  if (patterns.length === 0) throw new Error(`no canonical listing patterns for ${domain}`);

  while (queue.length > 0 && visited.size < MAX_SITEMAPS_PER_SOURCE && urls.size < MAX_URLS_PER_SOURCE) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    const parsed = parseSitemapXml(await fetchXml(sitemapUrl, domain));
    if (parsed.kind === "index") {
      for (const entry of parsed.entries) {
        const canonical = canonicalizeSourceUrl(entry.loc);
        if (!canonical || extractDomain(canonical) !== domain || visited.has(canonical)) continue;
        queue.push(canonical);
      }
      continue;
    }
    for (const entry of parsed.entries) {
      const canonical = canonicalizeSourceUrl(entry.loc);
      if (!canonical || extractDomain(canonical) !== domain) continue;
      if (!patterns.some((pattern) => pattern.test(new URL(canonical).pathname))) continue;
      urls.set(canonical, { loc: canonical, lastmod: entry.lastmod });
      if (urls.size >= MAX_URLS_PER_SOURCE) break;
    }
  }
  return [...urls.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

async function existingUrls(urls: string[]): Promise<Set<string>> {
  const client = getSupabaseServerClient();
  const existing = new Set<string>();
  for (let offset = 0; offset < urls.length; offset += CHUNK) {
    const slice = urls.slice(offset, offset + CHUNK);
    const { data, error } = await client.from("source_offer_seeds").select("canonical_url").in("canonical_url", slice);
    if (error) throw error;
    for (const row of data ?? []) existing.add(row.canonical_url as string);
  }
  return existing;
}

async function insertDelta(domain: string, entries: SitemapEntry[]): Promise<number> {
  const client = getSupabaseServerClient();
  const now = new Date().toISOString();
  const existing = await existingUrls(entries.map((entry) => entry.loc));
  const delta = entries.filter((entry) => !existing.has(entry.loc));
  if (!APPLY) return delta.length;

  for (let offset = 0; offset < delta.length; offset += CHUNK) {
    const rows = delta.slice(offset, offset + CHUNK).map((entry) => {
      const observed = entry.lastmod && !Number.isNaN(Date.parse(entry.lastmod)) ? new Date(entry.lastmod).toISOString() : now;
      return {
        canonical_url: entry.loc,
        source_domain: domain,
        seed_provider: "public_sitemap",
        first_observed_at: observed,
        last_observed_at: now,
        observation_count: 1,
        metadata: {
          source: "connected_public_sitemap_delta",
          acquisition_lot: "ODM-10C3",
          sitemap_lastmod: entry.lastmod,
          listing_pattern_matched: true,
        },
        freshness_status: "seed_only",
        fresh_last_seen_at: null,
        fresh_channels: [],
        created_at: now,
        updated_at: now,
      };
    });
    const { error } = await client.from("source_offer_seeds").upsert(rows, { onConflict: "canonical_url", ignoreDuplicates: true });
    if (error) throw error;
  }

  const { error: rpcError } = await client.rpc("odm_10c3_finalize_sitemap_delta", { p_source_domain: domain });
  if (rpcError) throw rpcError;
  return delta.length;
}

async function main() {
  if (APPLY && !isOpenSerpIngestionCronAuthorized()) {
    throw new Error("ODM-10C3 write flags are not all enabled");
  }
  const report: Array<Record<string, unknown>> = [];
  for (const source of SOURCES) {
    try {
      const entries = await discoverSource(source.domain, source.roots);
      const netNew = await insertDelta(source.domain, entries);
      report.push({ source_domain: source.domain, status: APPLY ? "APPLIED" : "DRY_RUN", qualified_sitemap_urls: entries.length, net_new_urls: netNew });
    } catch (error) {
      report.push({ source_domain: source.domain, status: "FAILED_CLOSED", error: error instanceof Error ? error.message : String(error) });
    }
  }
  console.log(JSON.stringify({ lot: "ODM-10C3", apply: APPLY, sources: report }, null, 2));
  if (report.every((row) => row.status === "FAILED_CLOSED")) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
