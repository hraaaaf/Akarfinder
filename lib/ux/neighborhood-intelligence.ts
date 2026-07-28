import type { Listing } from "@/lib/listings/types";
import type { PriceExplorerResult } from "@/lib/ux/price-explorer";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

export type NeighborhoodPropertyMix = {
  propertyType: string;
  count: number;
};

export type NeighborhoodIntelligenceModel = {
  status: "available" | "insufficient_scope" | "no_visible_properties";
  city: string;
  neighborhood: string | null;
  scopeLabel: string;
  canonicalPropertyCount: number;
  disclosedPriceCount: number;
  displayedMedianPricePerM2: number | null;
  publishedReferencePricePerM2: number | null;
  publishedReferenceConfidence: PriceExplorerResult["confidence"];
  propertyMix: NeighborhoodPropertyMix[];
  exactGeoCount: number;
  disclosure: string;
  unavailableInsights: string[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : Math.round(sorted[middle]);
}

function canonicalRepresentatives(listings: Listing[]): Listing[] {
  const representatives = new Map<string, Listing>();
  for (const listing of listings) {
    const canonicalId = getCanonicalPropertyId(listing);
    if (!representatives.has(canonicalId)) representatives.set(canonicalId, listing);
  }
  return [...representatives.values()];
}

function displayedPricePerM2(listing: Listing): number | null {
  if (Number.isFinite(listing.price_per_m2) && listing.price_per_m2 != null && listing.price_per_m2 > 0) {
    return listing.price_per_m2;
  }
  if (listing.price != null && listing.price > 0 && listing.surface_m2 > 0) {
    return Math.round(listing.price / listing.surface_m2);
  }
  return null;
}

export function buildNeighborhoodIntelligenceModel(input: {
  visibleListings: Listing[];
  city: string;
  neighborhood?: string | null;
  priceReference: PriceExplorerResult;
}): NeighborhoodIntelligenceModel {
  const neighborhood = input.neighborhood && input.neighborhood !== "all" ? input.neighborhood : null;
  const scoped = input.visibleListings.filter((listing) => {
    if (input.city === "all" || listing.city !== input.city) return false;
    return neighborhood ? listing.neighborhood === neighborhood || listing.district === neighborhood : true;
  });
  const properties = canonicalRepresentatives(scoped);
  const scopeLabel = neighborhood ? `${input.city}, ${neighborhood}` : input.city;

  const base = {
    city: input.city,
    neighborhood,
    scopeLabel,
    canonicalPropertyCount: properties.length,
    disclosedPriceCount: properties.filter((listing) => listing.price != null && listing.price > 0).length,
    displayedMedianPricePerM2: median(properties.map(displayedPricePerM2).filter((value): value is number => value != null)),
    publishedReferencePricePerM2:
      input.priceReference.status === "available" ? input.priceReference.askingPricePerM2 : null,
    publishedReferenceConfidence: input.priceReference.confidence,
    propertyMix: [...properties.reduce((counts, listing) => {
      counts.set(listing.property_type, (counts.get(listing.property_type) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())]
      .map(([propertyType, count]) => ({ propertyType, count }))
      .sort((a, b) => b.count - a.count || a.propertyType.localeCompare(b.propertyType, "fr")),
    exactGeoCount: properties.filter((listing) =>
      listing.geo_precision === "exact" &&
      listing.geo_source !== "unknown" &&
      Number.isFinite(listing.latitude) &&
      Number.isFinite(listing.longitude),
    ).length,
    disclosure:
      "Les indicateurs d’offre décrivent uniquement les propriétés canoniques actuellement visibles dans cette recherche. Ils ne constituent ni un recensement exhaustif, ni une tendance historique du marché.",
    unavailableInsights: [
      "Évolution historique de l’offre",
      "Vitesse de vente ou de location",
      "Délai moyen avant disparition",
      "Liquidité du quartier",
      "Demande réelle des acheteurs",
    ],
  };

  if (input.city === "all") return { ...base, status: "insufficient_scope" };
  if (properties.length === 0) return { ...base, status: "no_visible_properties" };
  return { ...base, status: "available" };
}

export function neighborhoodIntelligenceChangesRanking(): false {
  return false;
}
