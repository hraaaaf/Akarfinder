import { resolveNeighborhoodEntity } from "@/lib/geo/geo-entity-registry";
import { MARKET_DATA } from "@/lib/market/morocco-market-prices";
import type { NeighborhoodConfidence, NeighborhoodPoint } from "@/lib/map/canonical-neighborhood-data";

export type ExactNeighborhoodPriceBenchmark = {
  pointId: string;
  city: string;
  neighborhood: string;
  medianPricePerM2: number;
  rangeLow: number;
  rangeHigh: number;
  sampleCount: number;
  confidence: NeighborhoodConfidence;
  period: string;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeConfidence(value: string): NeighborhoodConfidence {
  if (normalizeText(value) === "elevee") return "high";
  if (normalizeText(value) === "moyenne") return "medium";
  return "low";
}

function resolvesToSameNeighborhood(point: NeighborhoodPoint, observedNeighborhood: string): boolean {
  const observedEntity = resolveNeighborhoodEntity(point.city, observedNeighborhood);
  return observedEntity?.slug === point.neighborhoodSlug;
}

export function getExactApartmentBuyBenchmark(
  point: NeighborhoodPoint,
): ExactNeighborhoodPriceBenchmark | null {
  const city = normalizeText(point.city);
  const match = MARKET_DATA.find(
    (entry) =>
      entry.neighborhood !== undefined &&
      normalizeText(entry.city) === city &&
      resolvesToSameNeighborhood(point, entry.neighborhood) &&
      entry.property_type === "appartement" &&
      entry.transaction_type === "buy",
  );

  if (!match) return null;

  return {
    pointId: point.id,
    city: point.city,
    neighborhood: point.neighborhood,
    medianPricePerM2: match.median_price_per_m2,
    rangeLow: match.range_low,
    rangeHigh: match.range_high,
    sampleCount: match.sample_count,
    confidence: normalizeConfidence(match.confidence),
    period: match.period,
  };
}

export function getExactApartmentBuyBenchmarks(
  points: NeighborhoodPoint[],
): ExactNeighborhoodPriceBenchmark[] {
  return points.flatMap((point) => {
    const benchmark = getExactApartmentBuyBenchmark(point);
    return benchmark ? [benchmark] : [];
  });
}

export function formatDhPerM2(value: number): string {
  return `${value.toLocaleString("fr-FR")} DH/m²`;
}

export function formatPriceRange(benchmark: ExactNeighborhoodPriceBenchmark): string {
  return `${benchmark.rangeLow.toLocaleString("fr-FR")}–${benchmark.rangeHigh.toLocaleString("fr-FR")} DH/m²`;
}

export function marketPriceLayerUsesInterpolation(): false {
  return false;
}
