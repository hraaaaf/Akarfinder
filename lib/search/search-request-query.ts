import type { SearchQuery } from "./types";

export type SearchParamReader = (name: string) => string | undefined;

function nonEmpty(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseFinite(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePositive(value?: string): number | undefined {
  const parsed = parseFinite(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = parseFinite(value);
  if (parsed === undefined) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), minimum), maximum);
}

function parseNonNegativeInteger(value?: string): number | undefined {
  const parsed = parseFinite(value);
  if (parsed === undefined) return undefined;
  return Math.max(Math.trunc(parsed), 0);
}

function publicValue(value?: string): string | undefined {
  const parsed = nonEmpty(value);
  return parsed && parsed.toLowerCase() !== "all" ? parsed : undefined;
}

export function buildSearchRequestQuery(read: SearchParamReader): SearchQuery {
  const explicitOffset = read("offset");
  const page = parseBoundedInteger(read("page"), 1, 1, Number.MAX_SAFE_INTEGER);
  const perPage = parseBoundedInteger(read("per_page"), 0, 1, 100);
  const derivedOffset = perPage > 0 ? (page - 1) * perPage : 0;
  const query: SearchQuery = {
    // Keep the established first public tranche: the page shell, SSR and API
    // must all hash and serve the same 100-result request when no limit is sent.
    limit: parseBoundedInteger(read("limit"), 100, 1, 100),
    // Explicit offsets remain authoritative. Public page/per_page links are an
    // equivalent readable representation and resolve to the same stable key.
    offset:
      explicitOffset !== undefined
        ? parseBoundedInteger(explicitOffset, 0, 0, Number.MAX_SAFE_INTEGER)
        : derivedOffset,
  };

  const q = nonEmpty(read("q"));
  if (q) query.q = q;

  const city = publicValue(read("city"));
  if (city) query.city = city;

  const propertyType = publicValue(read("property_type"));
  if (propertyType) query.property_type = propertyType;

  const transactionType = publicValue(read("transaction_type") ?? read("type"));
  if (transactionType) query.transaction_type = transactionType;

  const minReliabilityScore = parseFinite(read("minReliabilityScore"));
  if (minReliabilityScore !== undefined) query.minReliabilityScore = minReliabilityScore;

  const reliabilityBadge = publicValue(read("reliability_badge"));
  if (reliabilityBadge) query.reliability_badge = reliabilityBadge;

  const sort = publicValue(read("sort"));
  if (sort) query.sort = sort;

  const cursor = parseNonNegativeInteger(read("cursor"));
  if (cursor !== undefined) query.cursor = cursor;

  const minPrice = parsePositive(read("min_price") ?? read("budget_min"));
  if (minPrice !== undefined) query.min_price = minPrice;

  const maxPrice = parsePositive(read("max_price") ?? read("budget_max"));
  if (maxPrice !== undefined) query.max_price = maxPrice;

  const minSurface = parsePositive(read("min_surface"));
  if (minSurface !== undefined) query.min_surface = minSurface;

  const maxSurface = parsePositive(read("max_surface"));
  if (maxSurface !== undefined) query.max_surface = maxSurface;

  return query;
}

export function buildSearchStableKey(query: SearchQuery): string {
  return JSON.stringify({
    q: query.q ?? null,
    city: query.city ?? null,
    property_type: query.property_type ?? null,
    transaction_type: query.transaction_type ?? null,
    min_price: query.min_price ?? null,
    max_price: query.max_price ?? null,
    min_surface: query.min_surface ?? null,
    max_surface: query.max_surface ?? null,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  });
}
