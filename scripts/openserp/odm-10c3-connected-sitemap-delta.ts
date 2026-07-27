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
const READ_PAGE = 1000;

const SOURCES = [
  { domain: "daragadir.com", roots: ["https://daragadir.com/sitemap_index.xml", "https://daragadir.com/sitemap.xml", "https://daragadir.com/post-sitemap1.xml"] },
  { domain: "promoimmomarrakech.com", roots: ["https://www.promoimmomarrakech.com/sitemap-propriete.xml"] },
  { domain: "limmobiliersansfrontieres.com", roots: ["https://limmobiliersansfrontieres.com/property-sitemap.xml", "https://limmobiliersansfrontieres.com/property-sitemap2.xml"] },
] as const;

type SitemapEntry = { loc: string; lastmod: string | null };

function decodeXml(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return String(error); }
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
      headers: { "user-agent": "AkarFinder-Sitemap-Delta/1.0 (+https://akarfinder.vercel.app)", accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.1" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    const finalDomain = extractDomain(response.url);
    if (finalDomain !== expectedDomain) throw new Error(`cross-domain redirect refused: ${url} -> ${response.url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error(`sitemap too large: ${url}`);
    const xml = new TextDecoder().decode(bytes);
    if (!/<\s*(urlset|sitemapindex)\b/i.test(xml)) throw new Error(`response is not sitemap XML: ${url}`);
    return xml;
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverSource(domain: string, roots: readonly string[]): Promise<{ entries: SitemapEntry[]; warnings: string[] }> {
  const queue = [...roots];
  const visited = new Set<string>();
  const urls = new Map<string, SitemapEntry>();
  const warnings: string[] = [];
  const patterns = getListingUrlPatterns(domain, loadSourceDomainRegistry());
  if (patterns.length === 0) throw new Error(`no canonical listing patterns for ${domain}`);

  while (queue.length > 0 && visited.size < MAX_SITEMAPS_PER_SOURCE && urls.size < MAX_URLS_PER_SOURCE) {
    const sitemapUrl = queue.shift()!;
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    let parsed: ReturnType<typeof parseSitemapXml>;
    try {
      parsed = parseSitemapXml(await fetchXml(sitemapUrl, domain));
    } catch (error) {
      warnings.push(errorMessage(error));
      continue;
    }
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
  if (urls.size === 0) throw new Error(`no qualified listing URL discovered; warnings=${warnings.join(" | ")}`);
  return { entries: [...urls.values()].sort((a, b) => a.loc.localeCompare(b.loc)), warnings };
}

async function existingUrlsForDomain(domain: string): Promise<Set<string>> {
  const client = getSupabaseServerClient();
  const existing = new Set<string>();
  for (let offset = 0; ; offset += READ_PAGE) {
    const { data, error } = await client.from("source_offer_seeds").select("canonical_url").eq("source_domain", domain).order("canonical_url").range(offset, offset + READ_PAGE - 1);
    if (error) throw new Error(`Supabase existing-url read failed for ${domain}: ${error.message}`);
    for (const row of data ?? []) existing.add(row.canonical_url as string);
    if ((data?.length ?? 0) < READ_PAGE) break;
  }
  return existing;
}

async function insertDelta(domain: string, entries: SitemapEntry[]): Promise<number> {
  const client = getSupabaseServerClient();
  const now = new Date().toISOString();
  const existing = await existingUrlsForDomain(domain);
  const delta = entries.filter((entry) => !existing.has(entry.loc));
  if (!APPLY) return delta.length;

  for (let offset = 0; offset < delta.length; offset += CHUNK) {
    const rows = delta.slice(offset, offset + CHUNK).map((entry) => {
      const observed = entry.lastmod && !Number.isNaN(Date.parse(entry.lastmod)) ? new Date(entry.lastmod).toISOString() : now;
      return {
        canonical_url: entry.loc, source_domain: domain, seed_provider: "public_sitemap",
        first_observed_at: observed, last_observed_at: now, observation_count: 1,
        metadata: { source: "connected_public_sitemap_delta", acquisition_lot: "ODM-10C3", sitemap_lastmod: entry.lastmod, listing_pattern_matched: true },
        freshness_status: "seed_only", fresh_last_seen_at: null, fresh_channels: [], created_at: now, updated_at: now,
      };
    });
    const { error } = await client.from("source_offer_seeds").upsert(rows, { onConflict: "canonical_url", ignoreDuplicates: true });
    if (error) throw new Error(`Supabase seed upsert failed for ${domain}: ${error.message}`);
  }

  const { error: rpcError } = await client.rpc("odm_10c3_finalize_sitemap_delta", { p_source_domain: domain });
  if (rpcError) throw new Error(`ODM-10C3 finalize RPC failed for ${domain}: ${rpcError.message}`);
  return delta.length;
}

async function main() {
  if (APPLY && !isOpenSerpIngestionCronAuthorized()) throw new Error("ODM-10C3 write flags are not all enabled");
  const report: Array<Record<string, unknown>> = [];
  for (const source of SOURCES) {
    try {
      const discovery = await discoverSource(source.domain, source.roots);
      const netNew = await insertDelta(source.domain, discovery.entries);
      report.push({ source_domain: source.domain, status: APPLY ? "APPLIED" : "DRY_RUN", qualified_sitemap_urls: discovery.entries.length, net_new_urls: netNew, warnings: discovery.warnings });
    } catch (error) {
      report.push({ source_domain: source.domain, status: "FAILED_CLOSED", error: errorMessage(error) });
    }
  }
  console.log(JSON.stringify({ lot: "ODM-10C3", apply: APPLY, sources: report }, null, 2));
  if (report.every((row) => row.status === "FAILED_CLOSED")) process.exitCode = 1;
}

void main().catch((error) => { console.error(errorMessage(error)); process.exit(1); });
