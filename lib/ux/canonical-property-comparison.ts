import type { Listing } from "@/lib/listings/types";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

export type PropertyComparisonRow = {
  code: "price" | "price_per_m2" | "surface" | "bedrooms" | "bathrooms" | "location" | "freshness" | "reliability";
  label: string;
  values: Array<string | null>;
};

export type CanonicalPropertyComparisonModel = {
  properties: Array<{
    canonicalPropertyId: string;
    listingId: string;
    title: string;
    sourceName: string | null;
  }>;
  rows: PropertyComparisonRow[];
  limitation: string;
};

function formatMoney(value: number | null | undefined): string | null {
  if (!Number.isFinite(value) || value == null || value <= 0) return null;
  return `${new Intl.NumberFormat("fr-MA").format(value)} DH`;
}

function formatNumber(value: number | null | undefined, suffix = ""): string | null {
  if (!Number.isFinite(value) || value == null || value <= 0) return null;
  return `${new Intl.NumberFormat("fr-MA").format(value)}${suffix}`;
}

function uniqueCanonicalListings(listings: Listing[]): Listing[] {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const canonicalId = getCanonicalPropertyId(listing);
    if (seen.has(canonicalId)) return false;
    seen.add(canonicalId);
    return true;
  });
}

export function buildCanonicalPropertyComparisonModel(
  listings: Listing[],
): CanonicalPropertyComparisonModel {
  const properties = uniqueCanonicalListings(listings);
  const candidateRows: PropertyComparisonRow[] = [
    { code: "price", label: "Prix affiché", values: properties.map((listing) => formatMoney(listing.price)) },
    { code: "price_per_m2", label: "Prix au m²", values: properties.map((listing) => {
      const value = formatNumber(listing.price_per_m2);
      return value ? `${value} DH/m²` : null;
    }) },
    { code: "surface", label: "Surface", values: properties.map((listing) => formatNumber(listing.surface_m2, " m²")) },
    { code: "bedrooms", label: "Chambres", values: properties.map((listing) => formatNumber(listing.bedrooms_count ?? listing.bedrooms)) },
    { code: "bathrooms", label: "Salles de bain", values: properties.map((listing) => formatNumber(listing.bathrooms_count ?? listing.bathrooms)) },
    { code: "location", label: "Localisation déclarée", values: properties.map((listing) => [listing.neighborhood || listing.district, listing.city].filter(Boolean).join(", ") || null) },
    { code: "freshness", label: "Fraîcheur publiée", values: properties.map((listing) => listing.freshness_label?.trim() || null) },
    { code: "reliability", label: "Fiabilité disponible", values: properties.map((listing) => {
      if (listing.reliability_available !== true || !Number.isFinite(listing.reliability_score)) return null;
      const score = listing.reliability_score <= 1 ? listing.reliability_score * 100 : listing.reliability_score;
      return `${Math.round(score)} %`;
    }) },
  ];

  return {
    properties: properties.map((listing) => ({
      canonicalPropertyId: getCanonicalPropertyId(listing),
      listingId: listing.id,
      title: listing.title,
      sourceName: listing.source_name?.trim() || null,
    })),
    rows: candidateRows.filter((row) => row.values.some((value) => value != null)),
    limitation:
      "Cette comparaison juxtapose uniquement les informations publiables disponibles. Elle ne désigne pas un meilleur bien et ne remplace pas la vérification des sources.",
  };
}
