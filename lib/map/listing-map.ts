import type {
  Listing,
  ListingPropertyType,
  ListingTransactionType,
} from "@/lib/listings/types";

export type MapBounds = {
  west: number;
  east: number;
  north: number;
  south: number;
};

export type MapFilters = {
  city: string;
  transactionType: "all" | ListingTransactionType;
  propertyType: "all" | ListingPropertyType;
  minBudget: string;
  maxBudget: string;
  hideDuplicates: boolean;
};

export type MapPoint = {
  listing: Listing;
  x: number;
  y: number;
  priceLabel: string;
  precisionLabel: string;
};

export type MapCluster = {
  city: string;
  count: number;
  x: number;
  y: number;
  averagePrice: number | null;
};

const MOROCCO_MAP_LIMITS: MapBounds = {
  west: -14.5,
  east: 2.5,
  south: 20.5,
  north: 37.5,
};

export const defaultMapFilters: MapFilters = {
  city: "all",
  transactionType: "all",
  propertyType: "all",
  minBudget: "",
  maxBudget: "",
  hideDuplicates: true,
};

export function formatShortPrice(price: number | null): string {
  if (price == null) return "Prix non communique";
  if (price >= 1_000_000) {
    const value = price / 1_000_000;
    return `${value.toLocaleString("fr-FR", {
      maximumFractionDigits: value >= 10 ? 0 : 1,
    })}M DH`;
  }

  if (price >= 1000) {
    return `${Math.round(price / 1000).toLocaleString("fr-FR")}k DH`;
  }

  return `${price.toLocaleString("fr-FR")} DH`;
}

export function getPrecisionLabel(listing: Listing): string {
  if (listing.geo_precision === "neighborhood_centroid") {
    return "Position approximative · quartier";
  }

  if (listing.geo_precision === "city_centroid") {
    return "Position approximative · ville";
  }

  if (listing.geo_precision === "exact") return "Position exacte";

  return "Position non disponible";
}

export function isExactMapListing(
  listing: Listing
): listing is Listing & {
  latitude: number;
  longitude: number;
  geo_precision: "exact";
  geo_source: "scraped_coordinates" | "manual_import";
} {
  const { latitude, longitude } = listing;
  const exactSource =
    listing.geo_source === "scraped_coordinates" ||
    listing.geo_source === "manual_import";

  return (
    listing.geo_precision === "exact" &&
    exactSource &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= MOROCCO_MAP_LIMITS.south &&
    latitude <= MOROCCO_MAP_LIMITS.north &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= MOROCCO_MAP_LIMITS.west &&
    longitude <= MOROCCO_MAP_LIMITS.east
  );
}

export function filterMapListings(
  listings: Listing[],
  filters: MapFilters
): Listing[] {
  const minBudget = Number(filters.minBudget) || 0;
  const maxBudget = Number(filters.maxBudget) || Number.POSITIVE_INFINITY;

  return listings.filter((listing) => {
    const duplicateScore = listing.duplicate_score ?? 0;

    return (
      isExactMapListing(listing) &&
      (filters.city === "all" || listing.city === filters.city) &&
      (filters.transactionType === "all" ||
        listing.transaction_type === filters.transactionType) &&
      (filters.propertyType === "all" ||
        listing.property_type === filters.propertyType) &&
      // An undisclosed price only matches when no real budget filter is set.
      (listing.price != null || (minBudget <= 0 && maxBudget === Number.POSITIVE_INFINITY)) &&
      (listing.price == null || listing.price >= minBudget) &&
      (listing.price == null || listing.price <= maxBudget) &&
      (!filters.hideDuplicates || duplicateScore < 0.7)
    );
  });
}

function projectExactCoordinate(longitude: number, latitude: number): { x: number; y: number } {
  const x = 8 + ((longitude - MOROCCO_MAP_LIMITS.west) / (MOROCCO_MAP_LIMITS.east - MOROCCO_MAP_LIMITS.west)) * 84;
  const y = 8 + ((MOROCCO_MAP_LIMITS.north - latitude) / (MOROCCO_MAP_LIMITS.north - MOROCCO_MAP_LIMITS.south)) * 84;
  return { x, y };
}

export function getMapPoint(listing: Listing): MapPoint | null {
  if (!isExactMapListing(listing)) return null;
  const position = projectExactCoordinate(listing.longitude, listing.latitude);

  return {
    listing,
    ...position,
    priceLabel: formatShortPrice(listing.price),
    precisionLabel: getPrecisionLabel(listing),
  };
}

export function getMapPoints(listings: Listing[]): MapPoint[] {
  return listings.map(getMapPoint).filter((point): point is MapPoint => Boolean(point));
}

export function getMapClusters(listings: Listing[]): MapCluster[] {
  const byCity = new Map<string, Array<Listing & { latitude: number; longitude: number }>>();

  listings.forEach((listing) => {
    if (!isExactMapListing(listing)) return;
    byCity.set(listing.city, [...(byCity.get(listing.city) ?? []), listing]);
  });

  return Array.from(byCity.entries())
    .map(([city, cityListings]) => {
      const longitude = cityListings.reduce((total, listing) => total + listing.longitude, 0) / cityListings.length;
      const latitude = cityListings.reduce((total, listing) => total + listing.latitude, 0) / cityListings.length;
      const position = projectExactCoordinate(longitude, latitude);

      // Undisclosed prices are excluded from the average, never treated as 0.
      const pricedListings = cityListings.filter((listing): listing is typeof listing & { price: number } => listing.price != null);
      const averagePrice = pricedListings.length === 0
        ? null
        : Math.round(pricedListings.reduce((total, listing) => total + listing.price, 0) / pricedListings.length);

      return {
        city,
        count: cityListings.length,
        ...position,
        averagePrice,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getCitiesWithGeo(listings: Listing[]): string[] {
  return Array.from(
    new Set(
      listings
        .filter(isExactMapListing)
        .map((listing) => listing.city)
    )
  ).sort();
}

export function getMapSearchHref(filters: MapFilters): string {
  const params = new URLSearchParams();
  if (filters.city !== "all") params.set("city", filters.city);
  if (filters.transactionType !== "all") params.set("type", filters.transactionType);
  if (filters.propertyType !== "all") params.set("property_type", filters.propertyType);
  if (filters.minBudget) params.set("min_price", filters.minBudget);
  if (filters.maxBudget) params.set("max_price", filters.maxBudget);
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

// ─── MapLibre helpers ──────────────────────────────────────────────────────────

export type FlyToTarget = {
  lng: number;
  lat: number;
  zoom: number;
};

/** Morocco overview — default initial view */
export const MOROCCO_OVERVIEW: FlyToTarget = {
  lng: -6.3,
  lat: 31.8,
  zoom: 5.5,
};

/** City zoom targets derived from CITY_CENTROIDS. */
export const CITY_FLY_TARGETS: Record<string, FlyToTarget> = {
  Casablanca:  { lng: -7.5898, lat: 33.5731, zoom: 11 },
  Rabat:       { lng: -6.8416, lat: 34.0209, zoom: 12 },
  Tanger:      { lng: -5.8340, lat: 35.7595, zoom: 12 },
  Marrakech:   { lng: -7.9811, lat: 31.6295, zoom: 11 },
  Agadir:      { lng: -9.5981, lat: 30.4278, zoom: 12 },
  Fes:         { lng: -5.0078, lat: 34.0181, zoom: 12 },
  Kenitra:     { lng: -6.5802, lat: 34.2610, zoom: 12 },
  Mohammedia:  { lng: -7.3833, lat: 33.6866, zoom: 13 },
};

/** Return flyTo target for a given city name, or Morocco overview. */
export function getCityFlyTarget(city: string): FlyToTarget {
  return CITY_FLY_TARGETS[city] ?? MOROCCO_OVERVIEW;
}
