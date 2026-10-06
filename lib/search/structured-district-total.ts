import { getDbProvider, isNeonConfigured } from "@/lib/db/provider";
import { queryNeonRows } from "@/lib/db/neon-read-client";
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
 * Exact structured DB count for district searches on the Neon runtime path.
 * Public eligibility and free-text/reliability filters remain post-DB filters,
 * so callers may still return fewer visible rows than this count.
 */
export async function queryStructuredDistrictTotal(
  query: SearchQuery,
): Promise<number | null> {
  const filter = buildStructuredDistrictCountFilter(query);
  if (!filter) return null;
  if (getDbProvider() !== "neon" || !isNeonConfigured()) return null;

  const params: unknown[] = [filter.district];
  const predicates = ["district = $1"];

  if (filter.cityVariants.length === 1) {
    params.push(filter.cityVariants[0]);
    predicates.push(`city = $${params.length}`);
  } else if (filter.cityVariants.length > 1) {
    const placeholders = filter.cityVariants.map((city) => {
      params.push(city);
      return `$${params.length}`;
    });
    predicates.push(`city IN (${placeholders.join(", ")})`);
  }

  const add = (column: string, operator: string, value: unknown) => {
    params.push(value);
    predicates.push(`${column} ${operator} $${params.length}`);
  };

  if (filter.property_type) add("property_type", "=", filter.property_type);
  if (filter.transaction_type) add("transaction_type", "=", filter.transaction_type);
  if (filter.min_price != null) add("price_mad", ">=", filter.min_price);
  if (filter.max_price != null) add("price_mad", "<=", filter.max_price);
  if (filter.min_surface != null) add("surface_m2", ">=", filter.min_surface);
  if (filter.max_surface != null) add("surface_m2", "<=", filter.max_surface);

  try {
    const rows = await queryNeonRows<{ total: number | string }>(
      `SELECT COUNT(*)::bigint AS total
       FROM public.property_listings
       WHERE ${predicates.join(" AND ")}`,
      params,
    );
    return Number(rows[0]?.total ?? 0);
  } catch (error) {
    console.error(
      "[search:district-total] exact count failed:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
