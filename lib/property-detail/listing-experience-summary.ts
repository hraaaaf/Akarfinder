import { hasLivingHereNeighborhoodContext } from "@/lib/geo/living-here-context";
import type { LivingHereModel } from "@/lib/geo/living-here";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export const P5_LISTING_SUMMARY_KEYS = ["confidence", "market", "living"] as const;

export type P5ListingSummaryKey = (typeof P5_LISTING_SUMMARY_KEYS)[number];

export type P5ListingSummaryCard = {
  key: P5ListingSummaryKey;
  title: "Confiance" | "Marché" | "Vie locale";
  primary: string;
  secondary: string;
};

function formatMadPerM2(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} DH/m²`;
}

export function buildListingExperienceSummary(input: {
  detail: PublicPropertyDetailV2;
  marketComparables?: MarketComparableSet | null;
  livingHere?: LivingHereModel | null;
}): P5ListingSummaryCard[] {
  const { detail, marketComparables = null, livingHere = null } = input;

  const confidence: P5ListingSummaryCard = {
    key: "confidence",
    title: "Confiance",
    primary: detail.provenance.source_name,
    secondary: detail.provenance.fact_provenance_label,
  };

  const market: P5ListingSummaryCard = marketComparables?.status === "certified" && marketComparables.distribution
    ? {
        key: "market",
        title: "Marché",
        primary: formatMadPerM2(marketComparables.distribution.medianPricePerM2),
        secondary: `Médiane observée · ${marketComparables.scope === "neighborhood" ? "quartier" : "ville"} · n=${marketComparables.sampleCount}`,
      }
    : {
        key: "market",
        title: "Marché",
        primary: "Repère non calculé",
        secondary: marketComparables?.sampleCount
          ? `Échantillon comparable vérifié insuffisant · n=${marketComparables.sampleCount}`
          : "Échantillon comparable vérifié insuffisant",
      };

  const livingVisible = livingHere && livingHere.visibility !== "hidden" && livingHere.pois.length > 0;
  const livingContext = livingHere && hasLivingHereNeighborhoodContext(livingHere) ? livingHere : null;
  const hasExactMeasurements = Boolean(
    livingContext?.exactPropertyMeasurements?.origin.exact &&
    livingContext.exactPropertyMeasurements.canShowPreciseRouteTimes &&
    livingContext.exactPropertyMeasurements.pois.some((poi) => poi.routes.length > 0),
  );
  const living: P5ListingSummaryCard = livingVisible
    ? {
        key: "living",
        title: "Vie locale",
        primary: `${livingHere.pois.length} repère${livingHere.pois.length > 1 ? "s" : ""} ${livingContext ? "de quartier" : "de proximité"}`,
        secondary: livingContext
          ? hasExactMeasurements
            ? "Repères quartier NCI · mesures depuis le bien disponibles séparément"
            : "Repères quartier NCI · aucun temps produit depuis le contexte"
          : livingHere.canShowPreciseRouteTimes
            ? "POI fournisseur vérifiés · temps de trajet disponibles"
            : "POI fournisseur vérifiés · contexte sans temps de trajet précis",
      }
    : {
        key: "living",
        title: "Vie locale",
        primary: "Contexte non disponible",
        secondary: "Aucune proximité n’est inventée sans position exploitable",
      };

  return [confidence, market, living];
}
