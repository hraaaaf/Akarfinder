// ODM-CANARY-DUAL-READ-01 — shadow-only comparison between legacy Search and ODM.
// This module never selects or mutates the public response.

import { createHash } from "node:crypto";

import type { SearchResult } from "@/lib/search";
import type { PublicSearchPage } from "@/lib/search-gateway/public-search-cursor";

export const ODM_DUAL_READ_FLAG_NAMES = [
  "ODM_DUAL_READ_ENABLED",
  "ODM_DUAL_READ_SAMPLE_PERCENT",
] as const;

export const ODM_DUAL_READ_MAX_SAMPLE_PERCENT = 5;

export type OdmShadowSearchContext = {
  city: string | null;
  property_type: string | null;
  transaction_type: string | null;
  has_text_query: boolean;
  has_price_filter: boolean;
  has_surface_filter: boolean;
  limit: number | null;
  offset: number | null;
  is_paginated: boolean;
};

export type OdmDualReadDivergence = {
  version: "odm_dual_read_v1";
  stable_key_hash: string;
  context_city: string | null;
  context_property_type: string | null;
  context_transaction_type: string | null;
  context_has_text_query: boolean;
  context_has_price_filter: boolean;
  context_has_surface_filter: boolean;
  context_limit: number | null;
  context_offset: number | null;
  context_is_paginated: boolean;
  legacy_result_count: number;
  legacy_comparable_count: number;
  legacy_missing_identity_count: number;
  odm_result_count: number;
  odm_comparable_count: number;
  odm_missing_identity_count: number;
  legacy_count: number;
  odm_count: number;
  canonical_overlap_count: number;
  canonical_overlap_rate: number;
  rank_overlap_at_10: number;
  trusted_price_comparisons: number;
  trusted_price_divergences: number;
  trusted_surface_comparisons: number;
  trusted_surface_divergences: number;
  generated_at: string;
};

type Comparable = {
  identityKey: string;
  price: number | null;
  surface: number | null;
};

function explicitTrue(value: string | undefined): boolean {
  return value === "true";
}

export function readDualReadSamplePercent(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ODM_DUAL_READ_SAMPLE_PERCENT;
  if (raw === undefined || raw.trim() === "") return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > ODM_DUAL_READ_MAX_SAMPLE_PERCENT) return 0;
  return parsed;
}

function stableBucket(key: string): number {
  const digest = createHash("sha256").update(key).digest();
  return digest.readUInt32BE(0) % 10_000;
}

export function shouldRunOdmDualRead(
  stableKey: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!stableKey || !explicitTrue(env.ODM_DUAL_READ_ENABLED)) return false;
  const percent = readDualReadSamplePercent(env);
  if (percent <= 0) return false;
  return stableBucket(stableKey) < Math.floor(percent * 100);
}

const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "ref",
  "referrer",
  "source",
]);

function normalizedUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const parsed = new URL(value.trim());
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.hash = "";
    if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
      parsed.port = "";
    }
    for (const key of [...parsed.searchParams.keys()]) {
      const normalized = key.toLowerCase();
      if (normalized.startsWith("utm_") || TRACKING_QUERY_KEYS.has(normalized)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.searchParams.sort();
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return parsed;
  } catch {
    return null;
  }
}

function sourceOfferIdentity(url: URL): string | null {
  const host = url.hostname;
  const path = decodeURIComponent(url.pathname).replace(/\/$/, "");
  const patterns: Array<[RegExp, string]> = [
    [/agenz\.ma$/, "agenz"],
    [/mubawab\.ma$/, "mubawab"],
    [/avito\.ma$/, "avito"],
    [/mouldar\.com$/, "mouldar"],
    [/masaken\.ma$/, "masaken"],
    [/1immo\.ma$/, "1immo"],
  ];
  const source = patterns.find(([domain]) => domain.test(host))?.[1];
  if (!source) return null;

  const offerId = source === "mubawab"
    ? path.match(/\/(?:[a-z]{2}\/)?a\/(\d+)(?:\/|$)/i)?.[1]
    : source === "avito"
      ? path.match(/_(\d+)\.html?$/i)?.[1]
      : source === "mouldar"
        ? path.match(/\/([0-9a-f]{8})$/i)?.[1]
        : source === "1immo"
          ? path.match(/-(\d+)$/)?.[1]
          : path.match(/\/(\d+)$/)?.[1];

  return offerId ? `${source}:offer:${offerId.toLowerCase()}` : null;
}

export function canonicalIdentityKey(value: unknown): string | null {
  const parsed = normalizedUrl(value);
  if (!parsed) {
    if (typeof value !== "string" || value.trim() === "") return null;
    return `raw:${value.trim().replace(/\/$/, "")}`;
  }

  const sourceIdentity = sourceOfferIdentity(parsed);
  if (sourceIdentity) return sourceIdentity;

  // Protocol is deliberately excluded: http/https variants represent the same
  // public source resource. Host, normalized path and meaningful query remain.
  const query = parsed.searchParams.toString();
  return `url:${parsed.host}${parsed.pathname}${query ? `?${query}` : ""}`;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function legacyComparable(result: SearchResult): Comparable[] {
  return result.listings.flatMap((listing) => {
    const value = listing as unknown as Record<string, unknown>;
    const identityKey = canonicalIdentityKey(
      value.canonical_url ?? value.original_url ?? value.listing_url ?? value.url ?? value.source_url,
    );
    if (!identityKey) return [];
    return [{
      identityKey,
      price: finiteNumber(value.price ?? value.price_mad ?? value.normalized_price_mad),
      surface: finiteNumber(value.surface ?? value.surface_m2 ?? value.normalized_surface_m2),
    }];
  });
}

function odmComparable(page: PublicSearchPage): Comparable[] {
  return page.results.flatMap((result) => {
    const value = result as unknown as Record<string, unknown>;
    const identityKey = canonicalIdentityKey(
      value.canonical_url ?? value.original_url ?? value.display_url,
    );
    if (!identityKey) return [];
    return [{
      identityKey,
      price: finiteNumber(value.price ?? value.normalized_price_mad),
      surface: finiteNumber(value.surface ?? value.normalized_surface_m2),
    }];
  });
}

function materiallyDifferent(left: number, right: number): boolean {
  if (left === right) return false;
  const denominator = Math.max(Math.abs(left), Math.abs(right), 1);
  return Math.abs(left - right) / denominator > 0.02;
}

export function compareLegacyAndOdm(
  stableKey: string,
  legacy: SearchResult,
  odm: PublicSearchPage,
  now = new Date(),
): OdmDualReadDivergence {
  const legacyResultCount = legacy.listings.length;
  const odmResultCount = odm.results.length;
  const legacyRows = legacyComparable(legacy);
  const odmRows = odmComparable(odm);
  const odmByIdentity = new Map(odmRows.map((row) => [row.identityKey, row]));
  const overlap = legacyRows.filter((row) => odmByIdentity.has(row.identityKey));

  let priceComparisons = 0;
  let priceDivergences = 0;
  let surfaceComparisons = 0;
  let surfaceDivergences = 0;

  for (const legacyRow of overlap) {
    const odmRow = odmByIdentity.get(legacyRow.identityKey);
    if (!odmRow) continue;
    if (legacyRow.price !== null && odmRow.price !== null) {
      priceComparisons += 1;
      if (materiallyDifferent(legacyRow.price, odmRow.price)) priceDivergences += 1;
    }
    if (legacyRow.surface !== null && odmRow.surface !== null) {
      surfaceComparisons += 1;
      if (materiallyDifferent(legacyRow.surface, odmRow.surface)) surfaceDivergences += 1;
    }
  }

  const topLegacy = new Set(legacyRows.slice(0, 10).map((row) => row.identityKey));
  const rankOverlapAt10 = odmRows.slice(0, 10).filter((row) => topLegacy.has(row.identityKey)).length;

  return {
    version: "odm_dual_read_v1",
    stable_key_hash: createHash("sha256").update(stableKey).digest("hex").slice(0, 16),
    context_city: null,
    context_property_type: null,
    context_transaction_type: null,
    context_has_text_query: false,
    context_has_price_filter: false,
    context_has_surface_filter: false,
    context_limit: null,
    context_offset: null,
    context_is_paginated: false,
    legacy_result_count: legacyResultCount,
    legacy_comparable_count: legacyRows.length,
    legacy_missing_identity_count: legacyResultCount - legacyRows.length,
    odm_result_count: odmResultCount,
    odm_comparable_count: odmRows.length,
    odm_missing_identity_count: odmResultCount - odmRows.length,
    legacy_count: legacyRows.length,
    odm_count: odmRows.length,
    canonical_overlap_count: overlap.length,
    canonical_overlap_rate: legacyRows.length === 0 ? 0 : overlap.length / legacyRows.length,
    rank_overlap_at_10: rankOverlapAt10,
    trusted_price_comparisons: priceComparisons,
    trusted_price_divergences: priceDivergences,
    trusted_surface_comparisons: surfaceComparisons,
    trusted_surface_divergences: surfaceDivergences,
    generated_at: now.toISOString(),
  };
}

export function emitOdmDualReadMetric(metric: OdmDualReadDivergence): void {
  console.info("[odm-dual-read-shadow]", JSON.stringify(metric));
}
