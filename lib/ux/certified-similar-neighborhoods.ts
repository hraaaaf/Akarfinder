import type { Listing } from "@/lib/listings/types";
import type { CertifiedLocalHeatmapModel, CertifiedHeatmapZone } from "@/lib/ux/certified-local-heatmap";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

export type SimilarNeighborhoodCandidate = {
  key: string;
  city: string;
  neighborhood: string;
  publishedPricePerM2: number;
  observedAt: string;
  sourceUrl: string;
  priceGapPct: number;
  visibleCanonicalProperties: number;
  similarityBasis: string[];
};

export type CertifiedSimilarNeighborhoodsModel = {
  status: "available" | "unavailable";
  selectedNeighborhood: string | null;
  selectedPublishedPricePerM2: number | null;
  candidates: SimilarNeighborhoodCandidate[];
  reason: string | null;
  disclosure: string;
};

const DISCLOSURE =
  "Proximité descriptive calculée à partir de références publiques de prix demandé et de la couverture canonique visible. Ce résultat n’est ni une recommandation, ni un classement d’attractivité, ni un conseil d’investissement.";

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function countVisibleCanonicalProperties(
  listings: Listing[],
  city: string,
  neighborhood: string,
): number {
  const ids = new Set<string>();
  for (const listing of listings) {
    const listingCity = normalize(listing.city);
    const listingNeighborhood = normalize(listing.neighborhood ?? listing.district);
    if (listingCity === normalize(city) && listingNeighborhood === normalize(neighborhood)) {
      ids.add(getCanonicalPropertyId(listing));
    }
  }
  return ids.size;
}

function neighborhoodZones(heatmap: CertifiedLocalHeatmapModel): CertifiedHeatmapZone[] {
  return heatmap.status === "available"
    ? heatmap.zones.filter((zone) => zone.scope === "neighborhood" && Boolean(zone.neighborhood))
    : [];
}

export function buildCertifiedSimilarNeighborhoodsModel(input: {
  heatmap: CertifiedLocalHeatmapModel;
  selectedNeighborhood: string | null;
  visibleListings: Listing[];
  limit?: number;
}): CertifiedSimilarNeighborhoodsModel {
  const zones = neighborhoodZones(input.heatmap);
  const selected = zones.find(
    (zone) => normalize(zone.neighborhood) === normalize(input.selectedNeighborhood),
  );

  if (!input.selectedNeighborhood || !selected || !selected.neighborhood) {
    return {
      status: "unavailable",
      selectedNeighborhood: input.selectedNeighborhood,
      selectedPublishedPricePerM2: null,
      candidates: [],
      reason: input.selectedNeighborhood
        ? "Le quartier sélectionné ne dispose pas d’une référence publiable comparable."
        : "Choisissez un quartier couvert pour afficher des proximités descriptives.",
      disclosure: DISCLOSURE,
    };
  }

  const limit = Math.max(1, Math.min(input.limit ?? 3, 5));
  const candidates = zones
    .filter((zone) => zone.key !== selected.key && Boolean(zone.neighborhood))
    .map((zone) => {
      const priceGapPct = Math.abs(zone.pricePerM2 - selected.pricePerM2) / selected.pricePerM2 * 100;
      const visibleCanonicalProperties = countVisibleCanonicalProperties(
        input.visibleListings,
        zone.city,
        zone.neighborhood!,
      );
      return {
        key: zone.key,
        city: zone.city,
        neighborhood: zone.neighborhood!,
        publishedPricePerM2: zone.pricePerM2,
        observedAt: zone.observedAt,
        sourceUrl: zone.sourceUrl,
        priceGapPct,
        visibleCanonicalProperties,
        similarityBasis: [
          "Écart de référence publique en MAD/m²",
          "Même ville et même type de bien",
          "Couverture canonique visible indiquée séparément",
        ],
      } satisfies SimilarNeighborhoodCandidate;
    })
    .sort((a, b) => a.priceGapPct - b.priceGapPct || a.neighborhood.localeCompare(b.neighborhood, "fr"))
    .slice(0, limit);

  if (candidates.length === 0) {
    return {
      status: "unavailable",
      selectedNeighborhood: selected.neighborhood,
      selectedPublishedPricePerM2: selected.pricePerM2,
      candidates: [],
      reason: "Aucun autre quartier publiable n’est disponible dans ce périmètre.",
      disclosure: DISCLOSURE,
    };
  }

  return {
    status: "available",
    selectedNeighborhood: selected.neighborhood,
    selectedPublishedPricePerM2: selected.pricePerM2,
    candidates,
    reason: null,
    disclosure: DISCLOSURE,
  };
}

export function certifiedSimilarNeighborhoodsChangesRanking(): false {
  return false;
}
