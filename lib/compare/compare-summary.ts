import { getListingImageMode } from "@/lib/listings/image-policy";
import type { Listing } from "@/lib/listings/types";
import { getListingObservedPriceComparison } from "@/lib/market/get-market-reference";
import { calculatePackageScore } from "@/lib/package-score/calculate-package-score";
import { getListingProximity } from "@/lib/proximity/get-listing-proximity";
import type {
  CompareListingInsights,
  CompareSummary,
  CompareSummaryCard,
} from "@/lib/compare/types";

const FORBIDDEN_COMPARE_WORDING = [
  "meilleur choix garanti",
  "investissement sûr",
  "prix officiel",
  "estimation certifiée",
  "recommandation financière",
  "achat conseillé automatiquement",
];

function getSourceLabel(listing: Listing): string {
  return listing.source_name || listing.source_type || "Source analysée";
}

function getReliabilityLabel(listing: Listing): string {
  if (listing.duplicate_score != null && listing.duplicate_score >= 0.7) {
    return "Doublon possible";
  }
  if (listing.reliability_score >= 80) return "Fiabilité élevée";
  if (listing.reliability_score >= 50) return "À vérifier";
  return "Fiabilité faible";
}

export function getProximitySummary(listing: Listing): string {
  const points = getListingProximity(listing.city, listing.neighborhood);
  if (points.length === 0) return "Proximité utile à confirmer";

  const nearby = points
    .filter((point) => point.distance_minutes <= 15)
    .slice(0, 3)
    .map((point) => `${point.label} ${point.distance_minutes} min`);

  return nearby.length > 0
    ? nearby.join(" · ")
    : "Repères de proximité disponibles";
}

export function buildCompareListingInsights(listing: Listing): CompareListingInsights {
  const transactionType = listing.transaction_type === "rent" ? "rent" : "buy";
  const priceComparison = getListingObservedPriceComparison(
    listing.city,
    listing.neighborhood,
    listing.property_type,
    transactionType,
    listing.price_per_m2
  );
  const proximityPoints = getListingProximity(listing.city, listing.neighborhood);
  const packageScore = calculatePackageScore(
    listing.reliability_score,
    listing.reliability_available !== false,
    listing.duplicate_score,
    proximityPoints,
    priceComparison
  );

  return {
    listing,
    packageScore,
    priceComparison,
    proximityPoints,
    proximitySummary: getProximitySummary(listing),
    sourceLabel: getSourceLabel(listing),
    duplicatePossible: (listing.duplicate_score ?? 0) >= 0.7,
    observedPriceLabel: priceComparison.comparison_label,
    observedPriceDeltaLabel:
      priceComparison.difference_percent == null
        ? null
        : `${priceComparison.difference_percent > 0 ? "+" : ""}${priceComparison.difference_percent}%`,
    reliabilityLabel: getReliabilityLabel(listing),
    imageMode: getListingImageMode(listing),
  };
}

function createCard(
  title: string,
  winnerId: string | null,
  winnerLabel: string,
  detail: string
): CompareSummaryCard {
  return { title, winnerId, winnerLabel, detail };
}

function getBest<T>(
  items: CompareListingInsights[],
  scoreFor: (item: CompareListingInsights) => number | null
): CompareListingInsights | null {
  let best: CompareListingInsights | null = null;
  let bestScore: number | null = null;

  for (const item of items) {
    const score = scoreFor(item);
    if (score == null) continue;
    if (bestScore == null || score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  return best;
}

function getMostCompleteListing(items: CompareListingInsights[]) {
  return getBest(items, (item) => item.listing.data_completeness_score ?? null);
}

function getBestReliabilityListing(items: CompareListingInsights[]) {
  return getBest(items, (item) => item.listing.reliability_available === false ? null : item.listing.reliability_score);
}

function getBestPricePerM2Listing(items: CompareListingInsights[]) {
  return getBest(items, (item) => {
    if (item.listing.price_per_m2 <= 0) return null;
    const delta = item.priceComparison.difference_percent;
    return delta == null ? null : -delta;
  });
}

function getBestPackageListing(items: CompareListingInsights[]) {
  return getBest(items, (item) => {
    if (item.packageScore.overall_label === "Données insuffisantes") return null;
    return item.packageScore.overall_score;
  });
}

export function buildCompareSummary(items: CompareListingInsights[]): CompareSummary {
  const cards: CompareSummaryCard[] = [];
  const pointsToVerify = new Set<string>();

  const mostComplete = getMostCompleteListing(items);
  if (mostComplete) {
    cards.push(
      createCard(
        "Bien le plus complet",
        mostComplete.listing.id,
        mostComplete.listing.title,
        `Indice AkarFinder ${mostComplete.listing.data_completeness_score ?? "n/a"}/100.`
      )
    );
  }

  const bestReliability = getBestReliabilityListing(items);
  if (bestReliability) {
    cards.push(
      createCard(
        "Fiabilité la plus favorable",
        bestReliability.listing.id,
        bestReliability.listing.title,
        `Score de confiance visible ${bestReliability.listing.reliability_score}/100.`
      )
    );
  }

  const bestPricePerM2 = getBestPricePerM2Listing(items);
  if (bestPricePerM2) {
    cards.push(
      createCard(
        "Prix/m² le plus compétitif",
        bestPricePerM2.listing.id,
        bestPricePerM2.listing.title,
        `${bestPricePerM2.observedPriceLabel}${bestPricePerM2.observedPriceDeltaLabel ? ` (${bestPricePerM2.observedPriceDeltaLabel})` : ""}.`
      )
    );
  }

  const bestPackage = getBestPackageListing(items);
  if (bestPackage) {
    cards.push(
      createCard(
        "Package score le plus fort",
        bestPackage.listing.id,
        bestPackage.listing.title,
        `${bestPackage.packageScore.overall_label} · score ${bestPackage.packageScore.overall_score}/100.`
      )
    );
  }

  for (const item of items) {
    if (item.duplicatePossible) {
      pointsToVerify.add(`${item.listing.title} : doublon possible à confirmer avant contact.`);
    }
    if (item.priceComparison.comparison_label === "Prix supérieur au repère observé") {
      pointsToVerify.add(`${item.listing.title} : prix observé au-dessus du repère, à vérifier avant décision.`);
    }
    if (item.packageScore.missing_signals > 0) {
      pointsToVerify.add(`${item.listing.title} : certains signaux indicatifs restent incomplets.`);
    }
  }

  if (pointsToVerify.size === 0) {
    pointsToVerify.add("Comparer les photos, la source et les conditions de visite avant décision.");
  }

  return {
    cards,
    pointsToVerify: Array.from(pointsToVerify),
    disclaimer:
      "Comparaison indicative basée sur les données disponibles. À confirmer avant décision.",
  };
}

export function containsForbiddenCompareWording(value: string): boolean {
  const normalized = value.toLowerCase();
  return FORBIDDEN_COMPARE_WORDING.some((wording) => normalized.includes(wording));
}
