import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  GEO_NEIGHBORHOODS,
  resolveCityEntity,
  resolveNeighborhoodEntity,
} from "@/lib/geo/geo-entity-registry";
import { getSourcesByType } from "@/lib/sources/source-access-registry";
import type {
  MarketTransaction,
  ObservedMarketListing,
} from "@/lib/map/city-market-intelligence";

const MAX_MARKET_ROWS = 10_000;

const STRUCTURED_PUBLIC_SOURCE_NAMES = [
  ...new Set([
    ...getSourcesByType("first_party"),
    ...getSourcesByType("partner_authorized"),
  ]),
];

type SupabaseMarketListingRow = {
  id: number;
  canonical_fingerprint: string | null;
  district: string | null;
  transaction_type: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  updated_at: string | Date | null;
  source_name: string | null;
  listing_url: string | null;
  source_url: string | null;
};

function decodeMaybe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeTransaction(value: unknown): MarketTransaction | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["sale", "buy", "new", "achat", "vente"].includes(normalized)) return "sale";
  if (["rent", "location", "louer"].includes(normalized)) return "rent";
  return null;
}

function normalizedTimestamp(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function sourceDomain(row: SupabaseMarketListingRow): string {
  for (const raw of [row.listing_url, row.source_url]) {
    if (!raw) continue;
    try {
      return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      // Fall through to the source label.
    }
  }
  return String(row.source_name ?? "unknown").trim().toLowerCase() || "unknown";
}

function districtVariants(citySlug: string, targetSlugs: readonly string[]): string[] {
  const targetSet = new Set(targetSlugs);
  const variants = new Set<string>();

  for (const district of GEO_NEIGHBORHOODS) {
    if (district.city_slug !== citySlug || !targetSet.has(district.slug)) continue;
    const rawValues = [
      district.slug,
      district.slug.replace(/-/g, " "),
      district.canonical_name,
      district.canonical_name.replace(/\s+/g, "-"),
      ...district.aliases,
    ];
    for (const raw of rawValues) {
      const value = raw.trim();
      if (!value) continue;
      variants.add(value.toLowerCase());
      variants.add(encodeURIComponent(value).toLowerCase());
    }
  }

  return [...variants];
}

export async function readSupabaseListingMarketObservations(
  cityInput: string,
  targetSlugs: readonly string[],
): Promise<ObservedMarketListing[]> {
  const city = resolveCityEntity(cityInput);
  if (!city) throw new Error(`market intelligence unknown city: ${cityInput}`);

  const variants = districtVariants(city.slug, targetSlugs);
  if (!variants.length) return [];

  // Public-facing Market is restricted to explicitly authorized active
  // source links. No fallback to Neon or invented snapshots on RPC failures.
  const { data, error } = await getSupabaseServerClient().rpc(
    "read_market_observations_v1",
    {
      p_city: city.canonical_name,
      p_district_variants: variants,
      p_authorized_sources: STRUCTURED_PUBLIC_SOURCE_NAMES.map((name) => name.trim().toLowerCase()),
      p_max_rows: MAX_MARKET_ROWS + 1,
    },
  );
  if (error) throw new Error(`market_supabase_observations_failed: ${error.code ?? "rpc_error"}`);
  const rows = (Array.isArray(data) ? data : []) as SupabaseMarketListingRow[];

  if (rows.length > MAX_MARKET_ROWS) {
    throw new Error(`market intelligence safety bound reached for ${city.slug}`);
  }

  return rows.flatMap((row) => {
    const rawDistrict = decodeMaybe(String(row.district ?? "").trim());
    const district = resolveNeighborhoodEntity(city.canonical_name, rawDistrict);
    const transaction = normalizeTransaction(row.transaction_type);
    if (!district || !targetSlugs.includes(district.slug) || !transaction) return [];

    const price = Number(row.price_mad) > 0 ? Number(row.price_mad) : null;
    const surface = Number(row.surface_m2) > 0 ? Number(row.surface_m2) : null;
    const pricePerM2 = price != null && surface != null ? price / surface : null;
    const canonicalKey =
      String(row.listing_url ?? "").trim() ||
      String(row.source_url ?? "").trim() ||
      String(row.canonical_fingerprint ?? "").trim() ||
      `listing:${row.id}`;

    return [{
      districtSlug: district.slug,
      transaction,
      canonicalKey,
      updatedAt: normalizedTimestamp(row.updated_at),
      pricePerM2,
      // property_listings has no certified freshness state. Keep this
      // deliberately unconfirmed rather than inferring freshness from timestamps.
      fresh: false,
      sourceDomain: sourceDomain(row),
    }];
  });
}
