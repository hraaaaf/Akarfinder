import { getDbProvider, isSupabaseConfigured } from "@/lib/db/provider";
import { getSupabaseServerClient } from "@/lib/db/supabase-client";
import {
  canonicalizeGeoPair,
  getCitySearchVariants,
} from "@/lib/geo/geo-entity-registry";
import type { SearchQuery } from "./types";

export type StructuredDistrictCountFilter = {
  cityVariants: string[];
  district: string;
  property_type?: string;
  transaction_type?: string;
  min_price?: number;
  max_price?: number;
  min_surface?: number;
  max_surface?: number;
};

function normalizePropertyType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "appartement" || n === "apartment") return "apartment";
  if (n === "villa") return "villa";
  if (n === "terrain" || n === "land") return "land";
  if (n === "bureau" || n === "office") return "office";
  return raw;
}

function normalizeTransactionType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase();
  if (n === "buy" || n === "sale" || n === "achat") return "sale";
  if (n === "rent" || n === "location") return "rent";
  if (n === "new" || n === "neuf") return "new";
  return raw;
}

export function buildStructuredDistrictCountFilter(
  query: SearchQuery,
): StructuredDistrictCountFilter | null {
  if (!query.city?.trim() || !query.district?.trim()) return null;

  const geo = canonicalizeGeoPair(query.city, query.district);
  if (!geo.neighborhood) return null;

  const variants = getCitySearchVariants(geo.city);
  return {
    cityVariants: variants.length > 0 ? variants : [geo.city],
    district: geo.neighborhood,
    property_type: normalizePropertyType(query.property_type),
    transaction_type: normalizeTransactionType(query.transaction_type),
    min_price: query.min_price,
    max_price: query.max_price,
    min_surface: query.min_surface,
    max_surface: query.max_surface,
  };
}

/**
 * Exact structured DB count for district searches in the production Supabase
 * path. This deliberately mirrors querySupabaseListings' structured filters.
 * Public eligibility and free-text/reliability filters remain post-DB filters,
 * so callers may still return fewer visible rows than this count.
 */
export async function queryStructuredDistrictTotal(
  query: SearchQuery,
): Promise<number | null> {
  const filter = buildStructuredDistrictCountFilter(query);
  if (!filter) return null;
  if (getDbProvider() !== "supabase" || !isSupabaseConfigured()) return null;

  const supabase = getSupabaseServerClient();
  let q = supabase
    .from("property_listings")
    .select("id", { count: "exact", head: true })
    .eq("district", filter.district);

  if (filter.cityVariants.length === 1) {
    q = q.eq("city", filter.cityVariants[0]);
  } else {
    q = q.in("city", filter.cityVariants);
  }
  if (filter.property_type) q = q.eq("property_type", filter.property_type);
  if (filter.transaction_type) q = q.eq("transaction_type", filter.transaction_type);
  if (filter.min_price != null) q = q.gte("price_mad", filter.min_price);
  if (filter.max_price != null) q = q.lte("price_mad", filter.max_price);
  if (filter.min_surface != null) q = q.gte("surface_m2", filter.min_surface);
  if (filter.max_surface != null) q = q.lte("surface_m2", filter.max_surface);

  const { count, error } = await q;
  if (error) {
    console.error("[search:district-total] exact count failed:", error.message);
    return null;
  }
  return count ?? 0;
}
