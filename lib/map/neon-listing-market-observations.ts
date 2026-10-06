import { queryNeonRows } from "@/lib/db/neon-read-client";
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

type NeonMarketListingRow = {
  id: number;
  canonical_fingerprint: string | null;
  district: string | null;
  transaction_type: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  updated_at: string | null;
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

function sourceDomain(row: NeonMarketListingRow): string {
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

export async function readNeonListingMarketObservations(
  cityInput: string,
  targetSlugs: readonly string[],
): Promise<ObservedMarketListing[]> {
  const city = resolveCityEntity(cityInput);
  if (!city) throw new Error(`market intelligence unknown city: ${cityInput}`);

  const variants = districtVariants(city.slug, targetSlugs);
  if (!variants.length) return [];

  const params: unknown[] = [city.canonical_name];
  const districtPlaceholders = variants.map((variant) => {
    params.push(variant);
    return `$${params.length}`;
  });
  const sourcePlaceholders = STRUCTURED_PUBLIC_SOURCE_NAMES.map((sourceName) => {
    params.push(sourceName);
    return `$${params.length}`;
  });

  const publicClause = sourcePlaceholders.length
    ? `
      (
        (
          (pl.field_confidence->>'provider' = 'openserp'
            OR pl.field_confidence->>'acquisition_provider' = 'openserp')
          AND pl.field_confidence->>'publication_lane' = 'external_web_result'
          AND pl.field_confidence->>'classification_lane' = 'individual_listing'
        )
        OR EXISTS (
          SELECT 1
          FROM public.listing_sources ls_candidate
          WHERE ls_candidate.property_listing_id = pl.id
            AND ls_candidate.is_active IS TRUE
            AND lower(trim(ls_candidate.source_name)) IN (${sourcePlaceholders.join(",")})
        )
      )
    `
    : `
      (
        (pl.field_confidence->>'provider' = 'openserp'
          OR pl.field_confidence->>'acquisition_provider' = 'openserp')
        AND pl.field_confidence->>'publication_lane' = 'external_web_result'
        AND pl.field_confidence->>'classification_lane' = 'individual_listing'
      )
    `;

  params.push(MAX_MARKET_ROWS + 1);
  const limitPlaceholder = `$${params.length}`;

  const rows = await queryNeonRows<NeonMarketListingRow>(
    `SELECT
       pl.id,
       pl.canonical_fingerprint,
       pl.district,
       pl.transaction_type,
       pl.price_mad,
       pl.surface_m2,
       pl.updated_at,
       ls.source_name,
       ls.listing_url,
       ls.source_url
     FROM public.property_listings pl
     LEFT JOIN LATERAL (
       SELECT source_name, listing_url, source_url
       FROM public.listing_sources
       WHERE property_listing_id = pl.id
         AND is_active IS TRUE
       ORDER BY first_seen_at NULLS LAST, id
       LIMIT 1
     ) ls ON TRUE
     WHERE lower(trim(pl.city)) = lower($1)
       AND lower(trim(pl.district)) IN (${districtPlaceholders.join(",")})
       AND ${publicClause}
     ORDER BY pl.updated_at DESC NULLS LAST, pl.id DESC
     LIMIT ${limitPlaceholder}`,
    params,
  );

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
      updatedAt: row.updated_at ? String(row.updated_at) : null,
      pricePerM2,
      // property_listings has no certified freshness state. Keep this
      // deliberately unconfirmed rather than inferring freshness from timestamps.
      fresh: false,
      sourceDomain: sourceDomain(row),
    }];
  });
}
