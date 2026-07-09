// P10D — Prix moyen observé
// Returns indicative market reference for a listing.
// Returns null if city is not covered.

import { MARKET_DATA } from "./morocco-market-prices";
import type { MarketReference, ListingPriceComparison, ObservedPriceComparisonLabel } from "./types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['']/g, "'")
    .trim();
}

function normalizePropertyType(t: string): string {
  return normalize(t);
}

function computePosition(
  listingPricePerM2: number,
  median: number
): { position: "coherent" | "high" | "low"; position_pct: number } {
  const pct = ((listingPricePerM2 - median) / median) * 100;
  const position =
    pct > 10 ? "high" : pct < -10 ? "low" : "coherent";
  return { position, position_pct: Math.round(pct) };
}

export function getMarketReference(
  city: string,
  neighborhood: string | undefined,
  propertyType: string,
  transactionType: "buy" | "rent",
  listingPricePerM2: number
): MarketReference | null {
  const normCity = normalize(city);
  const normNeighborhood = neighborhood ? normalize(neighborhood) : undefined;
  const normType = normalizePropertyType(propertyType);

  // Try neighborhood-level match first
  if (normNeighborhood) {
    const match = MARKET_DATA.find(
      (d) =>
        normalize(d.city) === normCity &&
        d.neighborhood !== undefined &&
        normalize(d.neighborhood) === normNeighborhood &&
        normalize(d.property_type) === normType &&
        d.transaction_type === transactionType
    );
    if (match) {
      const { position, position_pct } = computePosition(listingPricePerM2, match.median_price_per_m2);
      return { ...match, scope: "neighborhood", position, position_pct };
    }
  }

  // City-level fallback
  const cityMatch = MARKET_DATA.find(
    (d) =>
      normalize(d.city) === normCity &&
      d.neighborhood === undefined &&
      normalize(d.property_type) === normType &&
      d.transaction_type === transactionType
  );
  if (cityMatch) {
    const { position, position_pct } = computePosition(listingPricePerM2, cityMatch.median_price_per_m2);
    return { ...cityMatch, scope: "city", position, position_pct };
  }

  return null;
}

const COMPARISON_DISCLAIMER =
  "Données indicatives issues de l'analyse AkarFinder — non officielles.";

export function getListingObservedPriceComparison(
  city: string,
  neighborhood: string | undefined,
  propertyType: string,
  transactionType: "buy" | "rent",
  listingPricePerM2: number
): ListingPriceComparison {
  const ref = getMarketReference(city, neighborhood, propertyType, transactionType, listingPricePerM2);

  if (!ref) {
    return {
      listing_price_per_m2: listingPricePerM2,
      observed_price_per_m2: null,
      difference_percent: null,
      comparison_label: "Données insuffisantes",
      confidence: null,
      listings_count: null,
      disclaimer: COMPARISON_DISCLAIMER,
    };
  }

  const label: ObservedPriceComparisonLabel =
    ref.position === "high"
      ? "Positionnement indicatif haut"
      : ref.position === "low"
        ? "Positionnement indicatif bas"
        : "Positionnement indicatif proche";

  return {
    listing_price_per_m2: listingPricePerM2,
    observed_price_per_m2: ref.median_price_per_m2,
    difference_percent: ref.position_pct,
    comparison_label: label,
    confidence: ref.confidence,
    listings_count: ref.sample_count,
    disclaimer: COMPARISON_DISCLAIMER,
  };
}
