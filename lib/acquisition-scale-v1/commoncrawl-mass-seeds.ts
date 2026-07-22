// CASABLANCA-MASS-ACQUISITION-V1 — Common Crawl mass seed foundation.
//
// Historical CDX URLs are ONLY seeds. This module never creates a listing,
// never marks a seed fresh, never publishes anything, and never fetches a
// source page. Every URL is fail-closed against the existing source-domain
// registry and its listing_url_patterns before it can become a seed row.

import {
  getDomainEntry,
  getListingUrlPatterns,
  loadSourceDomainRegistry,
  type SourceDomainRegistry,
} from "@/lib/openserp-ingestion/domain-registry";
import { canonicalizeSourceUrl, extractDomain } from "@/lib/openserp-ingestion/utils";

export const COMMONCRAWL_MASS_SEED_PROVIDER = "commoncrawl_cdx";

export type CommonCrawlMassSeed = {
  canonical_url: string;
  source_domain: string;
  cdx_indexes_seen: string[];
  first_cdx_timestamp: string;
  last_cdx_timestamp: string;
  cdx_observation_count: number;
  listing_pattern_matched: true;
  status_codes_observed: string[];
  mime_observed: string[];
};

export type SourceOfferSeedInsert = {
  canonical_url: string;
  source_domain: string;
  seed_provider: typeof COMMONCRAWL_MASS_SEED_PROVIDER;
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

export type SeedMappingRejection = {
  canonical_url: string | null;
  source_domain: string | null;
  reason: "invalid_url" | "domain_mismatch" | "domain_not_approved" | "no_listing_pattern" | "path_not_listing" | "invalid_cdx_timestamp";
};

export function selectRegistryMassHarvestDomains(registry: SourceDomainRegistry = loadSourceDomainRegistry()): string[] {
  return registry.domains
    .filter((entry) => entry.status === "approved_discovery")
    .filter((entry) => entry.external_web_result)
    .filter((entry) => entry.listing_url_patterns.length > 0)
    .map((entry) => entry.domain)
    .sort();
}

export function cdxTimestampToIso(timestamp: string): string | null {
  if (!/^\d{14}$/.test(timestamp)) return null;
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6));
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  const second = Number(timestamp.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) return null;
  return date.toISOString();
}

export function validateAndMapMassSeed(
  seed: CommonCrawlMassSeed,
  registry: SourceDomainRegistry = loadSourceDomainRegistry(),
  nowIso: string = new Date().toISOString(),
): { ok: true; row: SourceOfferSeedInsert } | { ok: false; rejection: SeedMappingRejection } {
  const canonical = canonicalizeSourceUrl(seed.canonical_url);
  if (!canonical) {
    return { ok: false, rejection: { canonical_url: seed.canonical_url ?? null, source_domain: seed.source_domain ?? null, reason: "invalid_url" } };
  }

  const actualDomain = extractDomain(canonical);
  if (!actualDomain || actualDomain !== seed.source_domain) {
    return { ok: false, rejection: { canonical_url: canonical, source_domain: seed.source_domain, reason: "domain_mismatch" } };
  }

  const entry = getDomainEntry(actualDomain, registry);
  if (!entry || entry.status !== "approved_discovery" || !entry.external_web_result) {
    return { ok: false, rejection: { canonical_url: canonical, source_domain: actualDomain, reason: "domain_not_approved" } };
  }

  const patterns = getListingUrlPatterns(actualDomain, registry);
  if (patterns.length === 0) {
    return { ok: false, rejection: { canonical_url: canonical, source_domain: actualDomain, reason: "no_listing_pattern" } };
  }

  const pathname = new URL(canonical).pathname;
  if (!patterns.some((pattern) => pattern.test(pathname))) {
    return { ok: false, rejection: { canonical_url: canonical, source_domain: actualDomain, reason: "path_not_listing" } };
  }

  const firstObservedAt = cdxTimestampToIso(seed.first_cdx_timestamp);
  const lastObservedAt = cdxTimestampToIso(seed.last_cdx_timestamp);
  if (!firstObservedAt || !lastObservedAt) {
    return { ok: false, rejection: { canonical_url: canonical, source_domain: actualDomain, reason: "invalid_cdx_timestamp" } };
  }

  return {
    ok: true,
    row: {
      canonical_url: canonical,
      source_domain: actualDomain,
      seed_provider: COMMONCRAWL_MASS_SEED_PROVIDER,
      first_observed_at: firstObservedAt,
      last_observed_at: lastObservedAt,
      observation_count: Math.max(1, Math.trunc(seed.cdx_observation_count || 1)),
      metadata: {
        cdx_indexes_seen: [...new Set(seed.cdx_indexes_seen)].sort(),
        listing_pattern_matched: true,
        status_codes_observed: [...new Set(seed.status_codes_observed)].sort(),
        mime_observed: [...new Set(seed.mime_observed)].sort(),
        source: "commoncrawl_url_index",
      },
      freshness_status: "seed_only",
      fresh_last_seen_at: null,
      fresh_channels: [],
      created_at: nowIso,
      updated_at: nowIso,
    },
  };
}

export function buildMassSeedInsertBatch(
  seeds: CommonCrawlMassSeed[],
  registry: SourceDomainRegistry = loadSourceDomainRegistry(),
  nowIso: string = new Date().toISOString(),
): { rows: SourceOfferSeedInsert[]; rejections: SeedMappingRejection[] } {
  const rowsByUrl = new Map<string, SourceOfferSeedInsert>();
  const rejections: SeedMappingRejection[] = [];

  for (const seed of seeds) {
    const mapped = validateAndMapMassSeed(seed, registry, nowIso);
    if (!mapped.ok) {
      rejections.push(mapped.rejection);
      continue;
    }
    const existing = rowsByUrl.get(mapped.row.canonical_url);
    if (!existing || mapped.row.last_observed_at > existing.last_observed_at) {
      rowsByUrl.set(mapped.row.canonical_url, mapped.row);
    }
  }

  return {
    rows: [...rowsByUrl.values()].sort((a, b) => a.canonical_url.localeCompare(b.canonical_url)),
    rejections,
  };
}
