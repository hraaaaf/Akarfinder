import { searchOwnerListings } from "@/lib/seller/owner-listing-projection";
import {
  searchPublicRepresentations,
  type PublicSearchInput,
  type PublicSearchPage,
} from "@/lib/search-gateway/public-search-cursor";

export async function searchPublicRepresentationsWithOwner(input: PublicSearchInput): Promise<PublicSearchPage> {
  const base = await searchPublicRepresentations(input);
  if (input.cursor) return base;

  const owner = await searchOwnerListings({
    q: input.q,
    city: input.city,
    propertyType: input.propertyType,
    intent: input.intent,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minSurface: input.minSurface,
    maxSurface: input.maxSurface,
    limit: Math.min(input.limit ?? 50, 20),
  });
  if (owner.results.length === 0) return base;

  const merged = new Map<string, PublicSearchPage["results"][number]>();
  for (const result of owner.results) merged.set(result.original_url, result);
  for (const result of base.results) if (!merged.has(result.original_url)) merged.set(result.original_url, result);

  const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
  const results = [...merged.values()].slice(0, limit);
  return {
    results,
    results_count: results.length,
    total_count: base.total_count + owner.totalCount,
    has_more: base.has_more || merged.size > limit,
    next_cursor: base.next_cursor,
  };
}
