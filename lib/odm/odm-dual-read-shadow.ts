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

export type OdmDualReadDivergence = {
  version: "odm_dual_read_v1";
  stable_key_hash: string;
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
  canonicalUrl: string;
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

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) parsed.searchParams.delete(key);
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function legacyComparable(result: SearchResult): Comparable[] {
  return result.listings.flatMap((listing) => {
    const value = listing as unknown as Record<string, unknown>;
    const canonicalUrl = normalizeUrl(
      value.canonical_url ?? value.original_url ?? value.listing_url ?? value.url ?? value.source_url,
    );
    if (!canonicalUrl) return [];
    return [{
      canonicalUrl,
      price: finiteNumber(value.price ?? value.price_mad ?? value.normalized_price_mad),
      surface: finiteNumber(value.surface ?? value.surface_m2 ?? value.normalized_surface_m2),
    }];
  });
}

function odmComparable(page: PublicSearchPage): Comparable[] {
  return page.results.flatMap((result) => {
    const value = result as unknown as Record<string, unknown>;
    const canonicalUrl = normalizeUrl(value.original_url ?? value.display_url);
    if (!canonicalUrl) return [];
    return [{
      canonicalUrl,
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
  const odmByUrl = new Map(odmRows.map((row) => [row.canonicalUrl, row]));
  const overlap = legacyRows.filter((row) => odmByUrl.has(row.canonicalUrl));

  let priceComparisons = 0;
  let priceDivergences = 0;
  let surfaceComparisons = 0;
  let surfaceDivergences = 0;

  for (const legacyRow of overlap) {
    const odmRow = odmByUrl.get(legacyRow.canonicalUrl);
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

  const topLegacy = new Set(legacyRows.slice(0, 10).map((row) => row.canonicalUrl));
  const rankOverlapAt10 = odmRows.slice(0, 10).filter((row) => topLegacy.has(row.canonicalUrl)).length;

  return {
    version: "odm_dual_read_v1",
    stable_key_hash: createHash("sha256").update(stableKey).digest("hex").slice(0, 16),
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
