import type { Listing } from "../listings/types";
import { adaptLegacyListing } from "../property-schema/adapters";
import { canPublishStructuredListing, getSourceAccessType } from "../sources/source-access-registry";
import { runStructuredListingIntelligencePipeline } from "./structured-listing-pipeline";
import {
  PUBLIC_SERP_INTELLIGENCE_VERSION,
  type PublicSerpIntelligenceSignalV1,
  type PublicSerpIntelligenceSummaryV1,
} from "./public-serp-intelligence-types";

const DISCLAIMER =
  "Lecture documentaire indicative fondée sur les informations disponibles. Les éléments sensibles restent à confirmer auprès des sources et documents applicables.";

type ListingWithPublicIntelligence = Listing & {
  public_intelligence?: PublicSerpIntelligenceSummaryV1;
};

export interface PublicSerpIntelligenceContextV1 {
  observed_at: string;
  source_name: string;
  generated_at?: string;
}

function marketLabel(position: string | null | undefined): string | null {
  switch (position) {
    case "below_market": return "Prix demandé sous le repère indicatif";
    case "near_market": return "Prix demandé proche du repère indicatif";
    case "above_market": return "Prix demandé au-dessus du repère indicatif";
    case "overpriced": return "Écart important au-dessus du repère indicatif";
    default: return null;
  }
}

function multiSourceLabel(level: string, isMultiSource: boolean, contradictions: boolean): string | null {
  if (!isMultiSource || contradictions) return null;
  if (level === "explicitly_supported" || level === "strong_candidate") {
    return "Plusieurs offres rapprochées à comparer";
  }
  return null;
}

function buildSignals(result: ReturnType<typeof runStructuredListingIntelligencePipeline>): PublicSerpIntelligenceSignalV1[] {
  const signals: PublicSerpIntelligenceSignalV1[] = [
    {
      code: "completeness",
      label: result.completeness.public_label,
    },
  ];

  if (result.freshness.freshness_state !== "unknown") {
    signals.push({ code: "freshness", label: result.freshness.public_freshness_label });
  }

  const market = marketLabel(result.market.intelligence_v2.comparison.position);
  if (market && result.market.intelligence_v2.status === "evaluated") {
    signals.push({ code: "market_context", label: market });
  }

  const multisource = multiSourceLabel(
    result.multisource.linkage.level,
    result.multisource.is_multi_source,
    result.multisource.linkage.contradictions_present,
  );
  if (multisource) signals.push({ code: "multisource", label: multisource });

  return signals.slice(0, 3);
}

function project(result: ReturnType<typeof runStructuredListingIntelligencePipeline>): PublicSerpIntelligenceSummaryV1 {
  const scoreAvailable = result.akar_score.status === "evaluated" && result.akar_score.score != null;
  const anomalyCount = result.anomaly.signals.length;

  return {
    version: PUBLIC_SERP_INTELLIGENCE_VERSION,
    status: scoreAvailable ? "available" : "insufficient_data",
    score: scoreAvailable ? result.akar_score.score : null,
    score_label: scoreAvailable
      ? result.akar_score.public_label
      : "Analyse documentaire partielle",
    coverage_label: `${result.akar_score.coverage.evaluated_components}/5 dimensions documentaires disponibles`,
    signals: buildSignals(result),
    attention_label: anomalyCount > 0
      ? `${anomalyCount} point${anomalyCount === 1 ? "" : "s"} à examiner dans les données disponibles`
      : null,
    disclaimer: DISCLAIMER,
  };
}

export function buildPublicSerpIntelligenceForListing(
  listing: Listing,
  context: PublicSerpIntelligenceContextV1,
): PublicSerpIntelligenceSummaryV1 | null {
  if (!canPublishStructuredListing(context.source_name)) return null;

  const accessType = getSourceAccessType(context.source_name);
  const acquisitionChannel = accessType === "first_party" ? "first_party_user" : "partner_feed";
  const originType = accessType === "first_party" ? "first_party_user" : "partner_feed";
  const generatedAt = context.generated_at ?? new Date().toISOString();

  const property = adaptLegacyListing(listing, {
    property_id: `serp-property:${listing.id}`,
    offer_id: `serp-offer:${listing.id}`,
    source_id: context.source_name.toLowerCase().trim(),
    source_name: context.source_name,
    external_offer_id: listing.id,
    source_url: listing.listing_url ?? null,
    now: context.observed_at,
    acquisition_channel: acquisitionChannel,
    origin_type: originType,
    compliance_status: "allowed",
  });

  const offer = property.offers[0];
  if (offer) {
    offer.first_observed_at = context.observed_at;
    offer.last_observed_at = context.observed_at;
    offer.updated_at_source = context.observed_at;
  }

  const result = runStructuredListingIntelligencePipeline(
    { origin: "first_party", property },
    generatedAt,
  );

  return project(result);
}

export function attachPublicSerpIntelligenceToListing(
  listing: Listing,
  context: PublicSerpIntelligenceContextV1,
): Listing {
  const publicIntelligence = buildPublicSerpIntelligenceForListing(listing, context);
  if (!publicIntelligence) return listing;
  return { ...listing, public_intelligence: publicIntelligence } as ListingWithPublicIntelligence;
}

export function getPublicSerpIntelligenceFromListing(
  listing: Listing,
): PublicSerpIntelligenceSummaryV1 | undefined {
  return (listing as ListingWithPublicIntelligence).public_intelligence;
}
