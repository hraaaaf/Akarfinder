import type { Listing } from "../listings/types";
import type { PartnerListingStandard } from "../partners/partner-listing-types";
import type { ValidatedFeedRow } from "../feeds/schema";
import type { ScrapedListingP0 } from "../../scripts/scrapers/types";
import {
  adaptLegacyListing,
  adaptPartnerListing,
  adaptScrapedListing,
  adaptValidatedFeedRow,
  type AdapterContextV1,
} from "../property-schema/adapters";
import {
  computeInformationCompleteness,
  type CompletenessResultV1,
} from "../property-schema/completeness";
import {
  enrichWithoutInventing,
  getPreferredSurfaceM2,
} from "../property-schema/enrichment";
import {
  validateOfferIngestion,
  validatePropertyIngestion,
  validatePropertyPublication,
  type ValidationResultV1,
} from "../property-schema/validation";
import type {
  CanonicalOfferV1,
  CanonicalPropertyV1,
} from "../property-schema/core";
import {
  assessMarketComparisonEligibility,
  createUnavailableClaim,
  evidenceFromFact,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisContractValidation,
} from "../analysis/analysis-contract";
import {
  calculatePriceGap,
  type PriceGapResult,
} from "../market/price-gap-calculator";
import {
  evaluateFreshnessProvenanceV2,
  type FreshnessProvenanceV2,
} from "./freshness-provenance-v2";

export const STRUCTURED_LISTING_PIPELINE_VERSION = "1.0" as const;

export type StructuredListingOrigin =
  | "direct_feed"
  | "authorized_scraper"
  | "partner"
  | "legacy_db"
  | "first_party";

export type StructuredListingPipelineInput =
  | { origin: "direct_feed"; row: ValidatedFeedRow; context: AdapterContextV1 }
  | { origin: "authorized_scraper"; row: ScrapedListingP0; context: AdapterContextV1 }
  | { origin: "partner"; row: PartnerListingStandard; context: AdapterContextV1 }
  | { origin: "legacy_db"; row: Listing; context: AdapterContextV1 }
  | { origin: "first_party"; property: CanonicalPropertyV1 };

export type PipelineStageStatus = "completed" | "passed" | "failed" | "unavailable" | "not_evaluated";

export interface StructuredListingPipelineStagesV1 {
  adaptation: "completed";
  property_ingestion_validation: "passed" | "failed";
  offer_ingestion_validation: "passed" | "failed" | "unavailable";
  safe_enrichment: "completed";
  information_completeness: "completed";
  publication_validation: "passed" | "failed" | "unavailable";
  market_analysis: "completed" | "unavailable";
  freshness: "completed" | "unavailable";
  duplicate_intelligence: "not_evaluated";
  anomaly_intelligence: "not_evaluated";
  akar_score: "not_evaluated";
  final_conclusion: "not_evaluated";
  property_fit: "not_evaluated";
}

export interface StructuredListingPipelineValidationV1 {
  property_ingestion: ValidationResultV1;
  offer_ingestion: ValidationResultV1 | null;
  publication: ValidationResultV1 | null;
}

export interface StructuredListingMarketAnalysisV1 {
  gap: PriceGapResult;
  claim: AnalysisClaimV1;
  contract_validation: AnalysisContractValidation;
}

export interface StructuredListingPipelineResultV1 {
  pipeline_version: typeof STRUCTURED_LISTING_PIPELINE_VERSION;
  origin: StructuredListingOrigin;
  property: CanonicalPropertyV1;
  selected_offer: CanonicalOfferV1 | null;
  validation: StructuredListingPipelineValidationV1;
  completeness: CompletenessResultV1;
  market: StructuredListingMarketAnalysisV1;
  freshness: FreshnessProvenanceV2;
  stages: StructuredListingPipelineStagesV1;
  generated_at: string;
}

function adaptInput(input: StructuredListingPipelineInput): CanonicalPropertyV1 {
  switch (input.origin) {
    case "direct_feed":
      return adaptValidatedFeedRow(input.row, input.context);
    case "authorized_scraper":
      return adaptScrapedListing(input.row, input.context);
    case "partner":
      return adaptPartnerListing(input.row, input.context);
    case "legacy_db":
      return adaptLegacyListing(input.row, input.context);
    case "first_party":
      return input.property;
  }
}

function selectOffer(property: CanonicalPropertyV1): CanonicalOfferV1 | null {
  return (
    property.offers.find((offer) => offer.offer_status === "active" && offer.compliance_status === "allowed") ??
    property.offers.find((offer) => offer.offer_status === "active") ??
    property.offers[0] ??
    null
  );
}

function unavailableValidation(code: string, message: string): ValidationResultV1 {
  return {
    valid: false,
    issues: [{ path: "offer", code, message, severity: "error" }],
  };
}

function pickSurfaceFact(property: CanonicalPropertyV1) {
  const surfaces = property.facts.surfaces;
  return (
    surfaces.surface_habitable_m2 ??
    surfaces.surface_total_m2 ??
    surfaces.surface_built_m2 ??
    surfaces.surface_land_m2
  );
}

function marketLabel(position: PriceGapResult["price_position"]): string {
  switch (position) {
    case "below_market": return "Position relative inférieure";
    case "near_market": return "Position relative proche";
    case "above_market": return "Position relative supérieure";
    case "overpriced": return "Écart indicatif important";
    case "insufficient_data": return "Données marché insuffisantes";
  }
}

function buildMarketReferenceId(gap: PriceGapResult): string | null {
  if (!gap.benchmark_scope || !gap.benchmark_city || !gap.benchmark_property_type) return null;
  return [
    gap.benchmark_source,
    gap.benchmark_scope,
    gap.benchmark_city,
    gap.benchmark_neighborhood ?? "_",
    gap.benchmark_property_type,
  ].join(":");
}

function computeMarketAnalysis(
  property: CanonicalPropertyV1,
  offer: CanonicalOfferV1 | null,
  generatedAt: string,
): StructuredListingMarketAnalysisV1 {
  const propertyType = property.facts.classification.property_type.value;
  const city = property.facts.location.city.value;
  const neighborhood = property.facts.location.neighborhood?.value ?? property.facts.location.district?.value ?? null;
  const surfaceM2 = getPreferredSurfaceM2(property);
  const priceAmount = offer?.price_status === "valid" ? offer.price_amount.value : null;

  const gap = calculatePriceGap({
    city,
    neighborhood,
    property_type: propertyType,
    surface_m2: surfaceM2,
    total_price_mad: priceAmount,
  });

  const eligibility = assessMarketComparisonEligibility({
    property_type: propertyType,
    price_amount: priceAmount,
    surface_m2: surfaceM2,
    benchmark_scope: gap.benchmark_scope,
  });

  if (!eligibility.eligible || gap.price_position === "insufficient_data" || !offer) {
    const claim = createUnavailableClaim({
      claim_id: `market-position:${property.property_id}`,
      domain: "market_position",
      label: "Données marché insuffisantes",
      explanation: eligibility.reason,
      generated_at: generatedAt,
    });
    return { gap, claim, contract_validation: validateAnalysisClaim(claim) };
  }

  const surfaceFact = pickSurfaceFact(property);
  if (!surfaceFact || surfaceFact.value == null || offer.price_amount.value == null) {
    const claim = createUnavailableClaim({
      claim_id: `market-position:${property.property_id}`,
      domain: "market_position",
      explanation: "Le prix ou la surface de référence manque pour produire une comparaison publique.",
      generated_at: generatedAt,
    });
    return { gap, claim, contract_validation: validateAnalysisClaim(claim) };
  }

  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `market-position:${property.property_id}`,
    domain: "market_position",
    label: marketLabel(gap.price_position),
    explanation: `Le prix/m² observé est comparé à un repère Yakeey ${gap.benchmark_scope === "neighborhood" ? "de quartier" : "de ville"}.`,
    strength: "indicative",
    confidence: eligibility.confidence,
    evidence: [
      evidenceFromFact(`${offer.offer_id}:price`, offer.price_amount),
      evidenceFromFact(`${property.property_id}:surface`, surfaceFact),
    ],
    assumptions: ["Le prix et la surface utilisés correspondent à l'offre structurée sélectionnée et au bien canonique."],
    limitations: ["Cette comparaison est indicative et ne constitue ni une expertise, ni une estimation officielle, ni une recommandation d'achat."],
    generated_at: generatedAt,
  };

  const contractValidation = validateAnalysisClaim(claim);
  if (!contractValidation.valid) {
    const safeClaim = createUnavailableClaim({
      claim_id: `market-position:${property.property_id}`,
      domain: "market_position",
      explanation: "La comparaison n'a pas satisfait le contrat d'analyse public.",
      generated_at: generatedAt,
    });
    return { gap, claim: safeClaim, contract_validation: validateAnalysisClaim(safeClaim) };
  }

  return { gap, claim, contract_validation: contractValidation };
}

export function runStructuredListingIntelligencePipeline(
  input: StructuredListingPipelineInput,
  generatedAt = new Date().toISOString(),
): StructuredListingPipelineResultV1 {
  const adapted = adaptInput(input);
  const selectedOffer = selectOffer(adapted);

  const propertyIngestion = validatePropertyIngestion(adapted);
  const offerIngestion = selectedOffer ? validateOfferIngestion(selectedOffer) : null;

  const enriched = enrichWithoutInventing(adapted);
  const completeness = computeInformationCompleteness(enriched, selectedOffer ?? undefined);
  const publication = selectedOffer
    ? validatePropertyPublication(enriched, selectedOffer)
    : unavailableValidation("missing_offer", "A structured public listing requires an offer.");

  const market = computeMarketAnalysis(enriched, selectedOffer, generatedAt);
  const freshness = evaluateFreshnessProvenanceV2(enriched, selectedOffer, input.origin, generatedAt);
  const intelligence = {
    ...(enriched.intelligence ?? {
      property_id: enriched.property_id,
      computed_at: generatedAt,
      price_per_m2: null,
      price_per_m2_method: "unavailable" as const,
      market_position: null,
      market_reference_id: null,
      data_completeness_score: null,
      freshness_score: null,
      duplicate_score: null,
      anomaly_score: null,
      akar_score: null,
      listing_conclusion: null,
      property_fit_score: null,
      investment_score: null,
      mre_score: null,
    }),
    computed_at: generatedAt,
    data_completeness_score: completeness.score,
    freshness_score: freshness.freshness_score,
    market_position: market.gap.price_position === "insufficient_data" ? null : market.gap.price_position,
    market_reference_id: buildMarketReferenceId(market.gap),
  };

  const property: CanonicalPropertyV1 = { ...enriched, intelligence };

  return {
    pipeline_version: STRUCTURED_LISTING_PIPELINE_VERSION,
    origin: input.origin,
    property,
    selected_offer: selectedOffer,
    validation: {
      property_ingestion: propertyIngestion,
      offer_ingestion: offerIngestion,
      publication,
    },
    completeness,
    market,
    freshness,
    stages: {
      adaptation: "completed",
      property_ingestion_validation: propertyIngestion.valid ? "passed" : "failed",
      offer_ingestion_validation: offerIngestion ? (offerIngestion.valid ? "passed" : "failed") : "unavailable",
      safe_enrichment: "completed",
      information_completeness: "completed",
      publication_validation: publication ? (publication.valid ? "passed" : "failed") : "unavailable",
      market_analysis: market.claim.strength === "unavailable" ? "unavailable" : "completed",
      freshness: freshness.claim.strength === "unavailable" ? "unavailable" : "completed",
      duplicate_intelligence: "not_evaluated",
      anomaly_intelligence: "not_evaluated",
      akar_score: "not_evaluated",
      final_conclusion: "not_evaluated",
      property_fit: "not_evaluated",
    },
    generated_at: generatedAt,
  };
}
