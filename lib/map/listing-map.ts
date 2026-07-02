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
  averagePrice: number;
};

const CITY_VISUAL_POSITIONS: Record<string, { x: number; y: number }> = {
  Tanger: { x: 72, y: 16 },
  Rabat: { x: 62, y: 28 },
  Kenitra: { x: 63, y: 25 },
  Casablanca: { x: 59, y: 34 },
  Mohammedia: { x: 61, y: 32 },
  Fes: { x: 73, y: 30 },
  Marrakech: { x: 54, y: 48 },
  Agadir: { x: 43, y: 63 },
};

const NEIGHBORHOOD_OFFSETS: Record<string, { x: number; y: number }> = {
  "Casablanca::Finance City": { x: -1.2, y: 0.4 },
  "Casablanca::Maârif": { x: 0.4, y: -0.3 },
  "Casablanca::Bouskoura": { x: 1.4, y: 2.4 },
  "Rabat::Hay Riad": { x: 0.9, y: 1.3 },
  "Rabat::Agdal": { x: -0.7, y: 0.5 },
  "Tanger::Malabata": { x: 1.2, y: 0.6 },
  "Marrakech::Route de l'Ourika": { x: 0.8, y: 2.0 },
  "Agadir::Founty": { x: -0.6, y: 1.0 },
  "Fes::Ville Nouvelle": { x: -0.8, y: 0.7 },
  "Kenitra::Maâmora": { x: 0.9, y: 1.0 },
  "Mohammedia::Parc": { x: 0.6, y: -0.2 },
};

export const defaultMapFilters: MapFilters = {
  city: "all",
  transactionType: "all",
  propertyType: "all",
  minBudget: "",
  maxBudget: "",
  hideDuplicates: true,
};

export function formatShortPrice(price: number): string {
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

export function filterMapListings(
  listings: Listing[],
  filters: MapFilters
): Listing[] {
  const minBudget = Number(filters.minBudget) || 0;
  const maxBudget = Number(filters.maxBudget) || Number.POSITIVE_INFINITY;

  return listings.filter((listing) => {
    const hasGeo = listing.latitude != null && listing.longitude != null;
    const duplicateScore = listing.duplicate_score ?? 0;

    return (
      hasGeo &&
      (filters.city === "all" || listing.city === filters.city) &&
      (filters.transactionType === "all" ||
        listing.transaction_type === filters.transactionType) &&
      (filters.propertyType === "all" ||
        listing.property_type === filters.propertyType) &&
      listing.price >= minBudget &&
      listing.price <= maxBudget &&
      (!filters.hideDuplicates || duplicateScore < 0.7)
    );
  });
}

export function getMapPoint(listing: Listing): MapPoint | null {
  const base = CITY_VISUAL_POSITIONS[listing.city];
  if (!base) return null;

  const offset =
    NEIGHBORHOOD_OFFSETS[`${listing.city}::${listing.neighborhood}`] ?? {
      x: 0,
      y: 0,
    };

  return {
    listing,
    x: clamp(base.x + offset.x, 8, 92),
    y: clamp(base.y + offset.y, 8, 92),
    priceLabel: formatShortPrice(listing.price),
    precisionLabel: getPrecisionLabel(listing),
  };
}

export function getMapPoints(listings: Listing[]): MapPoint[] {
  return listings.map(getMapPoint).filter((point): point is MapPoint => Boolean(point));
}

export function getMapClusters(listings: Listing[]): MapCluster[] {
  const byCity = new Map<string, Listing[]>();

  listings.forEach((listing) => {
    if (listing.latitude == null || listing.longitude == null) return;
    byCity.set(listing.city, [...(byCity.get(listing.city) ?? []), listing]);
  });

  return Array.from(byCity.entries())
    .map(([city, cityListings]) => {
      const position = CITY_VISUAL_POSITIONS[city];
      if (!position) return null;

      const averagePrice = Math.round(
        cityListings.reduce((total, listing) => total + listing.price, 0) /
          cityListings.length
      );

      return {
        city,
        count: cityListings.length,
        x: position.x,
        y: position.y,
        averagePrice,
      };
    })
    .filter((cluster): cluster is MapCluster => Boolean(cluster))
    .sort((a, b) => b.count - a.count);
}

export function getCitiesWithGeo(listings: Listing[]): string[] {
  return Array.from(
    new Set(
      listings
        .filter((listing) => listing.latitude != null && listing.longitude != null)
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
