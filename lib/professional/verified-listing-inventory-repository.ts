import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import { resolveListingGeo } from "@/lib/geo/resolve-listing-geo";
import {
  classifyVerifiedInventoryProvenance,
  type ListingInventoryProvenance,
} from "@/lib/map/listing-inventory-provenance";
import type { GeoPrecision } from "@/lib/listings/types";

const MAX_VERIFIED_LISTINGS = 100;

const RABAT_MARKET_ZONE_BY_DISTRICT: ReadonlyMap<string, string> = new Map([
  ["agdal", "market_zone_rabat_agdal"],
  ["hay riad", "market_zone_rabat_hay_riad"],
  ["hassan", "market_zone_rabat_centre"],
]);

export type VerifiedProfessionalListingInventoryItem = {
  property_listing_id: number;
  organization_id: string;
  verified_at: string | null;
  provenance: Exclude<ListingInventoryProvenance, "market">;
  title: string | null;
  city: string | null;
  district: string | null;
  price_mad: number | null;
  property_type: string | null;
  transaction_type: string | null;
  surface_m2: number | null;
  market_zone_id: string | null;
  geo_precision: GeoPrecision;
};

function normalizedToken(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function clampVerifiedListingInventoryLimit(limit = 50): number {
  const finite = Number.isFinite(limit) ? Math.trunc(limit) : 50;
  return Math.min(Math.max(finite, 1), MAX_VERIFIED_LISTINGS);
}

export function resolveVerifiedListingMarketZone(
  city: string | null | undefined,
  district: string | null | undefined,
): { market_zone_id: string | null; geo_precision: GeoPrecision } {
  const geo = resolveListingGeo(city, district);
  if (geo.geo_precision !== "neighborhood_centroid") {
    return { market_zone_id: null, geo_precision: geo.geo_precision };
  }

  if (normalizedToken(city) !== "rabat") {
    return { market_zone_id: null, geo_precision: geo.geo_precision };
  }

  return {
    market_zone_id: RABAT_MARKET_ZONE_BY_DISTRICT.get(normalizedToken(district)) ?? null,
    geo_precision: geo.geo_precision,
  };
}

export async function listVerifiedProfessionalOwnedListings(
  organizationId: string,
  limit = 50,
): Promise<VerifiedProfessionalListingInventoryItem[]> {
  if (!organizationId.trim()) return [];

  const boundedLimit = clampVerifiedListingInventoryLimit(limit);
  const db = getSupabaseServerClient();

  const [ownershipResult, organizationResult] = await Promise.all([
    db
      .from("professional_listing_ownership")
      .select("property_listing_id,organization_id,verified_at")
      .eq("organization_id", organizationId)
      .eq("status", "verified")
      .order("verified_at", { ascending: false, nullsFirst: false })
      .limit(boundedLimit),
    db
      .from("professional_organizations")
      .select("id,validation_status,activation_status,source_authorization_status")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (ownershipResult.error) {
    throw new Error(`[professional] verified listing inventory ownership read: ${ownershipResult.error.message}`);
  }
  if (organizationResult.error) {
    throw new Error(`[professional] verified listing inventory organization read: ${organizationResult.error.message}`);
  }

  const ownership = ownershipResult.data ?? [];
  if (ownership.length === 0) return [];

  const provenance = classifyVerifiedInventoryProvenance({
    ownership_verified: true,
    partner_authority: organizationResult.data ? {
      validation_status: organizationResult.data.validation_status,
      activation_status: organizationResult.data.activation_status,
      source_authorization_status: organizationResult.data.source_authorization_status,
    } : null,
  });
  if (!provenance) return [];

  const listingIds = ownership.map((row) => Number(row.property_listing_id));
  const { data: listingRows, error: listingError } = await db
    .from("property_listings")
    .select("id,title,price_mad,city,district,property_type,transaction_type,surface_m2")
    .in("id", listingIds);

  if (listingError) {
    throw new Error(`[professional] verified listing inventory listing read: ${listingError.message}`);
  }

  const listingsById = new Map<number, any>(
    (listingRows ?? []).map((row): [number, any] => [Number(row.id), row]),
  );

  return ownership.flatMap((row) => {
    const propertyListingId = Number(row.property_listing_id);
    const listing = listingsById.get(propertyListingId);
    if (!listing) return [];

    const zone = resolveVerifiedListingMarketZone(listing.city, listing.district);
    return [{
      property_listing_id: propertyListingId,
      organization_id: String(row.organization_id),
      verified_at: row.verified_at ? String(row.verified_at) : null,
      provenance,
      title: listing.title == null ? null : String(listing.title),
      city: listing.city == null ? null : String(listing.city),
      district: listing.district == null ? null : String(listing.district),
      price_mad: listing.price_mad == null ? null : Number(listing.price_mad),
      property_type: listing.property_type == null ? null : String(listing.property_type),
      transaction_type: listing.transaction_type == null ? null : String(listing.transaction_type),
      surface_m2: listing.surface_m2 == null ? null : Number(listing.surface_m2),
      market_zone_id: zone.market_zone_id,
      geo_precision: zone.geo_precision,
    }];
  });
}
