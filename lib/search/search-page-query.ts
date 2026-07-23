import { enrichSearchQueryWithTextIntent } from "./query-intent";
import type { SearchQuery } from "./types";

type SearchPageParams = Record<string, string | string[] | undefined>;

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeTransactionType(raw?: string): SearchQuery["transaction_type"] {
  switch (raw) {
    case "rent":
    case "location":
      return "rent";
    case "new":
    case "neuf":
      return "new";
    case "buy":
    case "sale":
    case "achat":
      return "buy";
    default:
      return undefined;
  }
}

export function buildSearchPageQuery(searchParams: SearchPageParams): SearchQuery {
  const query: SearchQuery = {
    limit: 100,
    offset: 0,
  };

  const search = pickFirst(searchParams.q);
  if (search?.trim()) query.q = search.trim();

  const city = pickFirst(searchParams.city);
  if (city && city !== "all") query.city = city;

  const propertyType = pickFirst(searchParams.property_type);
  if (propertyType && propertyType !== "all") query.property_type = propertyType;

  const transactionType = normalizeTransactionType(
    pickFirst(searchParams.type) ?? pickFirst(searchParams.transaction_type)
  );
  if (transactionType) query.transaction_type = transactionType;

  const minPrice = Number(pickFirst(searchParams.min_price) ?? pickFirst(searchParams.budget_min));
  if (Number.isFinite(minPrice) && minPrice > 0) query.min_price = minPrice;

  const maxPrice = Number(pickFirst(searchParams.max_price) ?? pickFirst(searchParams.budget_max));
  if (Number.isFinite(maxPrice) && maxPrice > 0) query.max_price = maxPrice;

  const minSurface = Number(pickFirst(searchParams.min_surface));
  if (Number.isFinite(minSurface) && minSurface > 0) query.min_surface = minSurface;

  const maxSurface = Number(pickFirst(searchParams.max_surface));
  if (Number.isFinite(maxSurface) && maxSurface > 0) query.max_surface = maxSurface;

  return enrichSearchQueryWithTextIntent(query);
}
