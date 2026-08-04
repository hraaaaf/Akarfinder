import { createHash } from "node:crypto";
import type { Listing, ListingPropertyType, ListingTransactionType } from "@/lib/listings/types";
import type { SearchQuery, SearchResult } from "@/lib/search";
import { prioritizeCommercialSearchListings } from "@/lib/search/search-commercial-priority";
import type { PublicSearchPage } from "@/lib/search-gateway/public-search-cursor";

export const ODM_PUBLIC_CANARY_MAX_PERCENT = 10;

function explicitTrue(value: string | undefined): boolean { return value === "true"; }

export function readPublicCanaryPercent(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.ODM_PUBLIC_CANARY_PERCENT);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= ODM_PUBLIC_CANARY_MAX_PERCENT ? parsed : 0;
}

function bucket(key: string): number {
  return createHash("sha256").update(key).digest().readUInt32BE(0) % 10_000;
}

export function shouldServeOdmPublicCanary(stableKey: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!stableKey) return false;
  if (!explicitTrue(env.ODM_PUBLIC_CANARY_ENABLED)) return false;
  if (!explicitTrue(env.ODM_PUBLIC_CANARY_APPROVED)) return false;
  if (explicitTrue(env.ODM_PUBLIC_CANARY_STOP)) return false;
  const percent = readPublicCanaryPercent(env);
  return percent > 0 && bucket(stableKey) < Math.floor(percent * 100);
}

function propertyType(value?: string): ListingPropertyType {
  const normalized = value?.trim().toLowerCase();
  if (normalized?.includes("villa")) return "Villa";
  if (normalized?.includes("terrain") || normalized === "land") return "Terrain";
  if (normalized?.includes("studio")) return "Studio";
  if (normalized?.includes("bureau") || normalized === "office") return "Bureau";
  if (normalized?.includes("maison") || normalized === "house") return "Maison";
  if (normalized?.includes("appartement") || normalized === "apartment" || normalized === "flat") return "Appartement";
  return "Appartement";
}

function transactionType(value?: string): ListingTransactionType {
  const normalized = value?.toLowerCase();
  if (normalized === "rent" || normalized === "louer" || normalized === "location") return "rent";
  if (normalized === "new" || normalized === "neuf") return "new";
  return "buy";
}

export function mapOdmPageToSearchResult(page: PublicSearchPage, query: SearchQuery): SearchResult {
  const listings: Listing[] = page.results.filter((row) => row.production_allowed && row.can_show_result).map((row) => ({
    id: row.id,
    title: row.title,
    city: row.normalized_city || query.city || "",
    neighborhood: "",
    price: row.normalized_price_mad ?? null,
    currency: "DH",
    surface_m2: row.normalized_surface_m2 ?? 0,
    price_per_m2: row.price_per_m2_mad ?? null,
    property_type: propertyType(row.normalized_property_type || query.property_type),
    transaction_type: transactionType(row.normalized_intent || query.transaction_type),
    bedrooms: 0,
    bathrooms: 0,
    freshness_label: "Source publique indexée",
    source_type: "Source analysée",
    reliability_label: "Infos limitées",
    reliability_score: Math.max(0, Math.min(100, Math.round(row.quality_score ?? 0))),
    reliability_available: row.quality_score != null,
    is_mre_friendly: false,
    description: row.snippet || "",
    image_url: "",
    reliability_explanation: row.display_eligibility_reason || "Résultat ODM soumis aux règles de publication.",
    listing_url: row.original_url,
    source_name: row.source_name,
    source_badge: row.source_badge,
    result_origin: row.result_origin,
    search_result_display_mode: row.search_result_display_mode,
    can_show_result: row.can_show_result,
    can_show_thumbnail: row.can_show_thumbnail,
    can_show_contact: false,
    can_show_gallery: false,
    production_allowed: row.production_allowed,
    primary_cta: "view_original",
    original_source_required: true,
    source_access_level: "indexed_only",
    image_permission_status: "source_link_only",
  }));

  return {
    listings: prioritizeCommercialSearchListings(listings),
    total: page.total_count,
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
    source: "database_fallback",
    generated_at: new Date().toISOString(),
    next_cursor: null,
    has_more: page.has_more,
  };
}
