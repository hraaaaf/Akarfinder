// MASS-ACQUISITION-FREE-ACCELERATION-1 — public sitemap seed lane.
//
// Only robots-declared sitemaps from approved_discovery domains are eligible.
// This module never fetches listing pages and never publishes listings. It only
// converts listing-shaped sitemap URLs into seed_only rows for source_offer_seeds.

import {
  getDomainEntry,
  getListingUrlPatterns,
  loadSourceDomainRegistry,
  type SourceDomainRegistry,
} from "@/lib/openserp-ingestion/domain-registry";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

export const SITEMAP_SEED_PROVIDER = "public_sitemap";

export type SitemapSeedCandidate = {
  canonical_url: string;
  source_domain: string;
  sitemap_url: string;
  observed_at: string;
};

export type SitemapSeedInsert = {
  canonical_url: string;
  source_domain: string;
  seed_provider: typeof SITEMAP_SEED_PROVIDER;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  metadata: Record<string, unknown>;
  freshness_status: "seed_only";
  fresh_last_seen_at: null;
  fresh_channels: string[];
  created_at: string;
  updated_at: string;
};

export function selectSitemapHarvestDomains(registry: SourceDomainRegistry = loadSourceDomainRegistry()): string[] {
  return registry.domains
    .filter((entry) => entry.status === "approved_discovery")
    .filter((entry) => entry.external_web_result)
    .filter((entry) => entry.listing_url_patterns.length > 0)
    .map((entry) => entry.domain)
    .sort();
}

export function robotsExplicitlyBlocksAll(content: string): boolean {
  let appliesToWildcard = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      appliesToWildcard = value === "*";
      continue;
    }
    if (key === "disallow" && appliesToWildcard && value === "/") return true;
  }
  return false;
}

export function parseRobotsSitemapUrls(content: string, domain: string): string[] {
  if (robotsExplicitlyBlocksAll(content)) return [];
  const urls = new Set<string>();
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const match = line.match(/^sitemap:\s*(https?:\/\/\S+)$/i);
    if (!match) continue;
    try {
      const url = new URL(match[1]);
      if (extractDomain(url.toString()) !== domain) continue;
      urls.add(url.toString());
    } catch {
      // malformed sitemap declaration: fail closed
    }
  }
  return [...urls].sort();
}

export function parseSitemapLocs(xml: string): { kind: "index" | "urlset" | "unknown"; locs: string[] } {
  const kind = /<\s*sitemapindex\b/i.test(xml) ? "index" : /<\s*urlset\b/i.test(xml) ? "urlset" : "unknown";
  const locs = [...xml.matchAll(/<\s*loc\s*>\s*([^<]+?)\s*<\s*\/\s*loc\s*>/gi)]
    .map((match) => match[1].replace(/&amp;/g, "&").trim())
    .filter(Boolean);
  return { kind, locs: [...new Set(locs)] };
}

export function qualifySitemapListingUrls(
  domain: string,
  sitemapUrl: string,
  rawUrls: string[],
  observedAt: string = new Date().toISOString(),
  registry: SourceDomainRegistry = loadSourceDomainRegistry(),
): SitemapSeedCandidate[] {
  const entry = getDomainEntry(domain, registry);
  if (!entry || entry.status !== "approved_discovery" || !entry.external_web_result) return [];
  const patterns = getListingUrlPatterns(domain, registry);
  if (patterns.length === 0) return [];

  const byUrl = new Map<string, SitemapSeedCandidate>();
  for (const rawUrl of rawUrls) {
    const canonical = canonicalizeSourceUrl(rawUrl);
    if (!canonical || extractDomain(canonical) !== domain) continue;
    const pathname = new URL(canonical).pathname;
    if (!patterns.some((pattern) => pattern.test(pathname))) continue;
    byUrl.set(canonical, { canonical_url: canonical, source_domain: domain, sitemap_url: sitemapUrl, observed_at: observedAt });
  }
  return [...byUrl.values()].sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
}

export function buildSitemapSeedRows(candidates: SitemapSeedCandidate[], nowIso: string = new Date().toISOString()): SitemapSeedInsert[] {
  const byUrl = new Map<string, SitemapSeedInsert>();
  for (const candidate of candidates) {
    const existing = byUrl.get(candidate.canonical_url);
    if (existing) continue;
    byUrl.set(candidate.canonical_url, {
      canonical_url: candidate.canonical_url,
      source_domain: candidate.source_domain,
      seed_provider: SITEMAP_SEED_PROVIDER,
      first_observed_at: candidate.observed_at,
      last_observed_at: candidate.observed_at,
      observation_count: 1,
      metadata: { source: "robots_declared_public_sitemap", sitemap_url: candidate.sitemap_url },
      freshness_status: "seed_only",
      fresh_last_seen_at: null,
      fresh_channels: [],
      created_at: nowIso,
      updated_at: nowIso,
    });
  }
  return [...byUrl.values()].sort((a, b) => a.canonical_url.localeCompare(b.canonical_url));
}