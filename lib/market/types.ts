import type { MarketBenchmarkSourceId } from "./market-benchmark-registry";

// P10D — Prix moyen observé
// NEVER claim official prices. Always "observé" / "indicatif".

export type MarketConfidence = "élevée" | "moyenne" | "faible";

export type MarketDataPoint = {
  city: string;           // lowercase, no accents
  neighborhood?: string;  // lowercase, no accents, optional
  property_type: string;  // lowercase
  transaction_type: "buy" | "rent";
  median_price_per_m2: number; // DH/m² (buy) or DH/m²/mois (rent)
  range_low: number;
  range_high: number;
  sample_count: number;
  confidence: MarketConfidence; // élevée>=30, moyenne 10-29, faible<10
  period: string;         // e.g. "Données 2024–2025"
};

export type MarketReference = {
  benchmark_id: string;
  benchmark_source_type: MarketBenchmarkSourceId;
  benchmark_methodology: string;
  benchmark_date: string;
  benchmark_level: "district" | "city";
  fallback_applied: "none" | "district_to_city";
  median_price_per_m2: number;
  range_low: number;
  range_high: number;
  sample_count: number;
  confidence: MarketConfidence;
  period: string;
  scope: "neighborhood" | "city"; // which level matched
  position: "coherent" | "high" | "low";
  position_pct: number; // % diff from median (signed)
};

export type ObservedPriceComparisonLabel =
  | "Position relative inférieure"
  | "Position relative proche"
  | "Position relative supérieure"
  | "Données insuffisantes";

export type ListingPriceComparison = {
  listing_price_per_m2: number | null;
  observed_price_per_m2: number | null;
  difference_percent: number | null;
  comparison_label: ObservedPriceComparisonLabel;
  confidence: MarketConfidence | null;
  listings_count: number | null;
  disclaimer: string;
};
