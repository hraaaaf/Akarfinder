import { mockListings } from "@/lib/listings/mock-listings";
import type { Listing, ListingFiltersState } from "@/lib/listings/types";

export const cityMapPositions: Record<string, { x: number; y: number }> = {
  Tanger: { x: 70, y: 18 },
  Rabat: { x: 62, y: 28 },
  Casablanca: { x: 58, y: 34 },
  Fes: { x: 72, y: 30 },
  Marrakech: { x: 54, y: 47 },
  Agadir: { x: 42, y: 63 },
  Kenitra: { x: 61, y: 25 },
  Mohammedia: { x: 59, y: 32 }
};

export const defaultListingFilters: ListingFiltersState = {
  search: "",
  transactionType: "all",
  city: "all",
  neighborhood: "all",
  minBudget: "",
  maxBudget: "",
  minSurface: "",
  propertyType: "all",
  reliability: "all",
  minReliabilityScore: 0,
  mreOnly: false,
  packageScore: "all"
};

export function formatPrice(price: number | null | undefined, currency = "DH") {
  if (!Number.isFinite(price) || price == null || price <= 0) {
    return "Prix non communique";
  }

  return `${new Intl.NumberFormat("fr-FR").format(price)} ${currency}`;
}

export function formatSurface(surface: number) {
  return `${surface} m2`;
}

export function getSearchCities(listings: Listing[]) {
  return Array.from(new Set(listings.map((listing) => listing.city))).sort();
}

export function getNeighborhoodsForCity(listings: Listing[], city: string) {
  const scopedListings =
    city === "all" ? listings : listings.filter((listing) => listing.city === city);

  return Array.from(new Set(scopedListings.map((listing) => listing.neighborhood))).sort();
}

export function getPropertyTypes(listings: Listing[]) {
  return Array.from(
    new Set(listings.map((listing) => listing.property_type))
  ).sort() as Listing["property_type"][];
}

function matchesReliabilityFilter(listing: Listing, filter: ListingFiltersState["reliability"]) {
  if (filter === "all") return true;
  const score = listing.reliability_score ?? 0;
  if (filter === "top") return score >= 80;
  if (filter === "high") return score >= 60 && score < 80;
  if (filter === "medium") return score >= 40 && score < 60;
  if (filter === "low") return score < 40;
  return true;
}

export type SortBy = "recommended" | "reliability" | "price-asc" | "price-desc";

export function sortListings(listings: Listing[], sortBy: SortBy): Listing[] {
  if (sortBy === "recommended") return listings;
  return [...listings].sort((a, b) => {
    if (sortBy === "reliability") return (b.reliability_score ?? 0) - (a.reliability_score ?? 0);
    if (sortBy === "price-asc" || sortBy === "price-desc") {
      // A listing with no disclosed price always sorts last, regardless of
      // direction — never treated as if it were priced at 0.
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return sortBy === "price-asc" ? a.price - b.price : b.price - a.price;
    }
    return 0;
  });
}

export function filterListings(listings: Listing[], filters: ListingFiltersState) {
  const minBudget = Number(filters.minBudget) || 0;
  const maxBudget = Number(filters.maxBudget) || Number.POSITIVE_INFINITY;
  const minSurface = Number(filters.minSurface) || 0;
  const searchTerm = filters.search.trim().toLowerCase();

  return listings.filter((listing) => {
    const haystack = [
      listing.title,
      listing.city,
      listing.neighborhood,
      listing.description,
      listing.property_type
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!searchTerm || haystack.includes(searchTerm)) &&
      (filters.transactionType === "all" ||
        listing.transaction_type === filters.transactionType) &&
      (filters.city === "all" || listing.city === filters.city) &&
      (filters.neighborhood === "all" ||
        listing.neighborhood === filters.neighborhood) &&
      // A budget filter can only ever match a listing with a disclosed
      // price — an undisclosed price is never assumed to be in range.
      // Untouched budget filters (0..Infinity) still let it through.
      (listing.price != null || (minBudget === 0 && maxBudget === Number.POSITIVE_INFINITY)) &&
      (listing.price == null || listing.price >= minBudget) &&
      (listing.price == null || listing.price <= maxBudget) &&
      listing.surface_m2 >= minSurface &&
      (filters.propertyType === "all" ||
        listing.property_type === filters.propertyType) &&
      matchesReliabilityFilter(listing, filters.reliability) &&
      (listing.reliability_score ?? 0) >= filters.minReliabilityScore &&
      (!filters.mreOnly || listing.is_mre_friendly)
    );
  });
}

export function getListingById(id: string) {
  return mockListings.find((listing) => listing.id === id);
}

export function getMapSummaries(listings: Listing[]) {
  const counts = new Map<string, number>();

  listings.forEach((listing) => {
    counts.set(listing.city, (counts.get(listing.city) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([city, count]) => ({
      city,
      count,
      position: cityMapPositions[city]
    }))
    .filter((entry) => entry.position)
    .sort((a, b) => b.count - a.count);
}
