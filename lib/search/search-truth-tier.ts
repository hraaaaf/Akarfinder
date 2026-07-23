import { getPublicSerpIntelligenceFromListing } from "@/lib/intelligence/public-serp-intelligence-carrier";
import type { Listing } from "@/lib/listings/types";

export type SearchTruthTier = "analyzed" | "partial" | "observed";

export type SearchTruthPresentation = {
  tier: SearchTruthTier;
  label: string;
  informationLabel: string;
  explanation: string;
};

export type CollapsedSearchListings = {
  listings: Listing[];
  groupedRepresentations: number;
  groupedCountsByRepresentativeId: Record<string, number>;
};

export function isObservedExternalListing(listing: Listing): boolean {
  return (
    listing.source_display_type === "external_web_result" ||
    listing.source_badge === "external_web_result" ||
    listing.search_result_display_mode === "thin_indexed_result" ||
    (listing.original_source_required === true && listing.can_show_contact !== true)
  );
}

export function getSearchTruthPresentation(listing: Listing): SearchTruthPresentation {
  if (isObservedExternalListing(listing)) {
    return {
      tier: "observed",
      label: "Offre observée",
      informationLabel: "Aperçu limité",
      explanation:
        "AkarFinder référence cette offre avec des informations limitées. La source originale reste obligatoire pour vérifier les détails.",
    };
  }

  const intelligence = getPublicSerpIntelligenceFromListing(listing);
  if (intelligence?.status === "available" && intelligence.score != null) {
    return {
      tier: "analyzed",
      label: "Analysé par AkarFinder",
      informationLabel: "Information structurée",
      explanation:
        "Analyse documentaire fondée sur les informations disponibles. Ce niveau ne signifie pas que le bien est vérifié, certifié ou garanti.",
    };
  }

  return {
    tier: "partial",
    label: "Analyse partielle",
    informationLabel: "À compléter",
    explanation:
      "AkarFinder dispose de suffisamment d'éléments pour structurer le résultat, mais pas pour produire une analyse documentaire complète.",
  };
}

/**
 * Reduce visible noise for structured listings when the dedup engine has already
 * assigned the same duplicate_group_id to multiple representations. We keep the
 * first item in the already-ranked list, so relevance order remains authoritative.
 *
 * External/index-only offers are never silently collapsed here: their original
 * sources remain individually visible unless a dedicated public similarity UI
 * explicitly groups them.
 */
export function collapseStructuredDuplicateGroups(listings: Listing[]): CollapsedSearchListings {
  const result: Listing[] = [];
  const representativeByGroup = new Map<string, Listing>();
  const groupedCountsByRepresentativeId: Record<string, number> = {};
  let groupedRepresentations = 0;

  for (const listing of listings) {
    if (isObservedExternalListing(listing) || !listing.duplicate_group_id?.trim()) {
      result.push(listing);
      continue;
    }

    const groupId = listing.duplicate_group_id.trim();
    const representative = representativeByGroup.get(groupId);
    if (!representative) {
      representativeByGroup.set(groupId, listing);
      result.push(listing);
      groupedCountsByRepresentativeId[listing.id] = 1;
      continue;
    }

    groupedRepresentations += 1;
    groupedCountsByRepresentativeId[representative.id] =
      (groupedCountsByRepresentativeId[representative.id] ?? 1) + 1;
  }

  return { listings: result, groupedRepresentations, groupedCountsByRepresentativeId };
}

export function partitionStructuredListings(listings: Listing[]): {
  analyzed: Listing[];
  partial: Listing[];
  observed: Listing[];
} {
  const analyzed: Listing[] = [];
  const partial: Listing[] = [];
  const observed: Listing[] = [];

  for (const listing of listings) {
    const tier = getSearchTruthPresentation(listing).tier;
    if (tier === "analyzed") analyzed.push(listing);
    else if (tier === "partial") partial.push(listing);
    else observed.push(listing);
  }

  return { analyzed, partial, observed };
}
