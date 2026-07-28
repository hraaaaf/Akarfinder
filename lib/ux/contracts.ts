export const UX_CONTRACT_VERSION = "2026-07-26" as const;

export type ResultOrigin =
  | "partner"
  | "first_party"
  | "public_index"
  | "internal_market_signal";

export type CanonicalEntityKind =
  | "property"
  | "representation"
  | "cluster"
  | "geo_area";

export type FreshnessBand = "fresh" | "aging" | "stale" | "unknown";
export type ConfidenceBand = "high" | "medium" | "low" | "insufficient";
export type GeoPrecision = "exact" | "approximate" | "area" | "city" | "unknown";

export type SearchViewMode = "list" | "split" | "map";

export type SearchQueryState = {
  q?: string;
  transactionType?: "buy" | "rent";
  propertyType?: string;
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  bedrooms?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "newest";
  view?: SearchViewMode;
  page?: number;
};

export type TrustDescriptor = {
  origin: ResultOrigin;
  freshness: FreshnessBand;
  completeness: ConfidenceBand;
  consistency: ConfidenceBand;
  canonicalConfidence: ConfidenceBand;
  geoPrecision: GeoPrecision;
  statisticalConfidence?: ConfidenceBand;
};

export type PublishedStatistic = {
  metric: string;
  value: number | null;
  unit: string;
  sampleSizeRaw: number;
  sampleSizeCanonical: number;
  periodStart: string;
  periodEnd: string;
  p25?: number | null;
  median?: number | null;
  p75?: number | null;
  confidence: ConfidenceBand;
  methodologyVersion: string;
  askingPriceOnly: true;
};

export function normalizeSearchQueryState(input: SearchQueryState): SearchQueryState {
  const normalized: SearchQueryState = {
    ...input,
    q: input.q?.trim() || undefined,
    city: input.city?.trim() || undefined,
    district: input.district?.trim() || undefined,
    propertyType: input.propertyType?.trim() || undefined,
    page: input.page && input.page > 0 ? Math.floor(input.page) : 1,
    view: input.view ?? "list",
    sort: input.sort ?? "relevance",
  };

  for (const key of ["minPrice", "maxPrice", "minSurface", "maxSurface", "bedrooms"] as const) {
    const value = normalized[key];
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
      delete normalized[key];
    }
  }

  if (
    typeof normalized.minPrice === "number" &&
    typeof normalized.maxPrice === "number" &&
    normalized.minPrice > normalized.maxPrice
  ) {
    [normalized.minPrice, normalized.maxPrice] = [normalized.maxPrice, normalized.minPrice];
  }

  if (
    typeof normalized.minSurface === "number" &&
    typeof normalized.maxSurface === "number" &&
    normalized.minSurface > normalized.maxSurface
  ) {
    [normalized.minSurface, normalized.maxSurface] = [normalized.maxSurface, normalized.minSurface];
  }

  return normalized;
}

export function canPublishStatistic(stat: PublishedStatistic): boolean {
  return (
    stat.value !== null &&
    stat.sampleSizeCanonical >= 8 &&
    stat.sampleSizeRaw >= stat.sampleSizeCanonical &&
    stat.confidence !== "insufficient" &&
    Boolean(stat.periodStart) &&
    Boolean(stat.periodEnd) &&
    Boolean(stat.methodologyVersion) &&
    stat.askingPriceOnly === true
  );
}

export function trustDescriptorHasNoOpaqueScore(value: TrustDescriptor): boolean {
  return !Object.prototype.hasOwnProperty.call(value, "score");
}
