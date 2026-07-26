import type { ListingFiltersState, ListingPropertyType } from "@/lib/listings/types";
import type { SortBy } from "@/lib/listings/utils";
import {
  normalizeSearchQueryState,
  type SearchQueryState,
  type SearchViewMode,
} from "@/lib/ux/contracts";

const SORT_TO_CANONICAL: Record<SortBy, NonNullable<SearchQueryState["sort"]>> = {
  recommended: "relevance",
  reliability: "relevance",
  "price-asc": "price_asc",
  "price-desc": "price_desc",
};

const CANONICAL_TO_SORT: Record<NonNullable<SearchQueryState["sort"]>, SortBy> = {
  relevance: "recommended",
  price_asc: "price-asc",
  price_desc: "price-desc",
  newest: "recommended",
};

function positiveNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function searchSessionFromUrl(params: URLSearchParams): SearchQueryState {
  const transaction = params.get("transaction_type");
  const sort = params.get("sort");
  const view = params.get("view");

  return normalizeSearchQueryState({
    q: params.get("q") ?? undefined,
    transactionType: transaction === "buy" || transaction === "rent" ? transaction : undefined,
    propertyType: params.get("property_type") ?? undefined,
    city: params.get("city") ?? undefined,
    district: params.get("district") ?? undefined,
    minPrice: positiveNumber(params.get("min_price")),
    maxPrice: positiveNumber(params.get("max_price")),
    minSurface: positiveNumber(params.get("min_surface")),
    maxSurface: positiveNumber(params.get("max_surface")),
    bedrooms: positiveNumber(params.get("bedrooms")),
    sort:
      sort === "price_asc" || sort === "price_desc" || sort === "newest"
        ? sort
        : "relevance",
    view: view === "split" || view === "map" ? view : "list",
    page: positiveNumber(params.get("page")),
  });
}

export function searchSessionToUrl(state: SearchQueryState): URLSearchParams {
  const normalized = normalizeSearchQueryState(state);
  const params = new URLSearchParams();

  if (normalized.q) params.set("q", normalized.q);
  if (normalized.transactionType) params.set("transaction_type", normalized.transactionType);
  if (normalized.propertyType) params.set("property_type", normalized.propertyType);
  if (normalized.city) params.set("city", normalized.city);
  if (normalized.district) params.set("district", normalized.district);
  if (normalized.minPrice != null) params.set("min_price", String(normalized.minPrice));
  if (normalized.maxPrice != null) params.set("max_price", String(normalized.maxPrice));
  if (normalized.minSurface != null) params.set("min_surface", String(normalized.minSurface));
  if (normalized.maxSurface != null) params.set("max_surface", String(normalized.maxSurface));
  if (normalized.bedrooms != null) params.set("bedrooms", String(normalized.bedrooms));
  if (normalized.sort && normalized.sort !== "relevance") params.set("sort", normalized.sort);
  if (normalized.view && normalized.view !== "list") params.set("view", normalized.view);
  if (normalized.page && normalized.page > 1) params.set("page", String(normalized.page));

  return params;
}

export function listingFiltersToSearchSession(
  filters: ListingFiltersState,
  sortBy: SortBy,
  view: SearchViewMode,
): SearchQueryState {
  return normalizeSearchQueryState({
    q: filters.search,
    transactionType:
      filters.transactionType === "buy" || filters.transactionType === "rent"
        ? filters.transactionType
        : undefined,
    propertyType: filters.propertyType === "all" ? undefined : filters.propertyType,
    city: filters.city === "all" ? undefined : filters.city,
    district: filters.neighborhood === "all" ? undefined : filters.neighborhood,
    minPrice: positiveNumber(filters.minBudget),
    maxPrice: positiveNumber(filters.maxBudget),
    minSurface: positiveNumber(filters.minSurface),
    sort: SORT_TO_CANONICAL[sortBy],
    view,
  });
}

export function searchSessionToListingState(state: SearchQueryState): {
  filters: Partial<ListingFiltersState>;
  sortBy: SortBy;
  view: SearchViewMode;
} {
  const normalized = normalizeSearchQueryState(state);
  return {
    filters: {
      search: normalized.q ?? "",
      transactionType: normalized.transactionType ?? "all",
      propertyType: (normalized.propertyType as ListingPropertyType | undefined) ?? "all",
      city: normalized.city ?? "all",
      neighborhood: normalized.district ?? "all",
      minBudget: normalized.minPrice != null ? String(normalized.minPrice) : "",
      maxBudget: normalized.maxPrice != null ? String(normalized.maxPrice) : "",
      minSurface: normalized.minSurface != null ? String(normalized.minSurface) : "",
    },
    sortBy: CANONICAL_TO_SORT[normalized.sort ?? "relevance"],
    view: normalized.view ?? "list",
  };
}
