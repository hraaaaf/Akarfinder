// P10D — Prix moyen observé
// Returns indicative market reference for a listing.
// Returns null if city is not covered.

import { findMarketBenchmark } from "./market-benchmark-registry";
import type { MarketReference, ListingPriceComparison, ObservedPriceComparisonLabel } from "./types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
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
  const position = pct > 10 ? "high" : pct < -10 ? "low" : "coherent";
  return { position, position_pct: Math.round(pct) };
}

function getConfidenceFromSampleCount(sampleCount: number): MarketReference["confidence"] {
  if (sampleCount >= 30) return "élevée";
  if (sampleCount >= 10) return "moyenne";
  return "faible";
}

export function getMarketReference(
  city: string,
  neighborhood: string | undefined,
  propertyType: string,
  transactionType: "buy" | "rent",
  listingPricePerM2: number | null
): MarketReference | null {
  if (listingPricePerM2 == null) return null;
  const normCity = normalize(city);
  const normNeighborhood = neighborhood ? normalize(neighborhood) : undefined;
  const normType = normalizePropertyType(propertyType);
  const match = findMarketBenchmark({
    city: normCity,
    neighborhood: normNeighborhood,
    property_type: normType,
  });

  if (!match) return null;

  const { position, position_pct } = computePosition(listingPricePerM2, match.benchmark_price_per_m2);
  const benchmarkLevel = match.scope === "neighborhood" ? "district" : "city";
  const fallbackApplied = match.scope === "city" && normNeighborhood ? "district_to_city" : "none";
  const confidence = getConfidenceFromSampleCount(match.sample_count);

  return {
    benchmark_id: match.match_key,
    benchmark_source_type: match.benchmark_source,
    benchmark_methodology: "Yakeey benchmark registry derived from audited public tables",
    benchmark_date: "Données 2024-2025",
    benchmark_level: benchmarkLevel,
    fallback_applied: fallbackApplied,
    median_price_per_m2: match.benchmark_price_per_m2,
    range_low: match.benchmark_price_per_m2 * 0.85,
    range_high: match.benchmark_price_per_m2 * 1.15,
    sample_count: match.sample_count,
    confidence,
    period: "Données 2024-2025",
    scope: match.scope,
    position,
    position_pct,
  };
}

const COMPARISON_DISCLAIMER =
  "Données indicatives issues de l'analyse AkarFinder — non officielles.";

export function getListingObservedPriceComparison(
  city: string,
  neighborhood: string | undefined,
  propertyType: string,
  transactionType: "buy" | "rent",
  listingPricePerM2: number | null
): ListingPriceComparison {
  const ref = listingPricePerM2 == null
    ? null
    : getMarketReference(city, neighborhood, propertyType, transactionType, listingPricePerM2);

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
      ? "Position relative supérieure"
      : ref.position === "low"
        ? "Position relative inférieure"
        : "Position relative proche";

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
