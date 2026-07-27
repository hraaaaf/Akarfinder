import type { Listing } from "@/lib/listings/types";
import type { CertifiedHeatmapZone } from "@/lib/ux/certified-local-heatmap";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

export type NeighborhoodComparisonColumn = {
  key: string;
  name: string;
  publishedPricePerM2: number;
  observedAt: string;
  sourceUrl: string;
  visibleCanonicalProperties: number;
  visibleMedianPricePerM2: number | null;
};

export type CertifiedNeighborhoodComparisonModel = {
  status: "available" | "unavailable";
  city: string;
  columns: NeighborhoodComparisonColumn[];
  disclosure: string;
  reason: string | null;
};

const DISCLOSURE = "Comparaison descriptive de références publiques de prix demandé et des propriétés actuellement visibles. Elle ne désigne pas un meilleur quartier et ne mesure ni la demande, ni la rentabilité, ni la liquidité.";

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

export function buildCertifiedNeighborhoodComparisonModel(input: {
  city: string;
  zones: CertifiedHeatmapZone[];
  selectedKeys: string[];
  visibleListings: Listing[];
}): CertifiedNeighborhoodComparisonModel {
  const selected = input.zones.filter((zone) => zone.scope === "neighborhood" && input.selectedKeys.includes(zone.key)).slice(0, 3);
  if (input.city === "all" || selected.length < 2) {
    return {
      status: "unavailable",
      city: input.city,
      columns: [],
      disclosure: DISCLOSURE,
      reason: input.city === "all" ? "Choisissez une ville pour comparer ses quartiers couverts." : "Sélectionnez au moins deux quartiers couverts.",
    };
  }

  const canonical = new Map<string, Listing>();
  for (const listing of input.visibleListings) canonical.set(getCanonicalPropertyId(listing), listing);

  const columns = selected.map((zone) => {
    const matching = [...canonical.values()].filter((listing) =>
      normalize(listing.city) === normalize(zone.city) && normalize(listing.neighborhood) === normalize(zone.neighborhood),
    );
    const prices = matching
      .map((listing) => listing.price_per_m2 ?? (listing.price && listing.surface_m2 ? Math.round(listing.price / listing.surface_m2) : null))
      .filter((value): value is number => value != null && Number.isFinite(value) && value > 0);

    return {
      key: zone.key,
      name: zone.neighborhood!,
      publishedPricePerM2: zone.pricePerM2,
      observedAt: zone.observedAt,
      sourceUrl: zone.sourceUrl,
      visibleCanonicalProperties: matching.length,
      visibleMedianPricePerM2: median(prices),
    };
  });

  return { status: "available", city: input.city, columns, disclosure: DISCLOSURE, reason: null };
}

export function certifiedNeighborhoodComparisonChangesRanking(): false {
  return false;
}
