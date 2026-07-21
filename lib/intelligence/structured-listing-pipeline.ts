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
import { enrichWithoutInventing } from "../property-schema/enrichment";
import {
  validateOfferIngestion,
  validatePropertyIngestion,
  validatePropertyPublication,
  type ValidationResultV1,
} from "../property-schema/validation";
import type { CanonicalOfferV1, CanonicalPropertyV1 } from "../property-schema/core";
import {
  createUnavailableClaim,
  evidenceFromFact,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisContractValidation,
} from "../analysis/analysis-contract";
import type { PriceGapResult } from "../market/price-gap-calculator";
import {
  evaluateMarketIntelligenceV2,
  type MarketIntelligenceV2,
} from "../market/market-intelligence-v2";
import {
  evaluateFreshnessProvenanceV2,
  type FreshnessProvenanceV2,
} from "./freshness-provenance-v2";
import {
  evaluateAnomalyEngineV1,
  type AnomalyEngineContextV1,
  type AnomalyEngineV1,
} from "./anomaly-engine-v1";
import {
  evaluateMultiSourcePropertyIntelligenceV1,
  type MultiSourcePropertyContextV1,
  type MultiSourcePropertyIntelligenceV1,
} from "./multisource-property-intelligence-v1";

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

export type StructuredListingPipelineAnalysisContextV1 = AnomalyEngineContextV1 & MultiSourcePropertyContextV1;

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
  duplicate_intelligence: "completed" | "unavailable";
  anomaly_intelligence: "completed" | "unavailable";
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
  /** Legacy-compatible safe projection. V2 gates can force insufficient_data. */
  gap: PriceGapResult;
  intelligence_v2: MarketIntelligenceV2;
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
  anomaly: AnomalyEngineV1;
  multisource: MultiSourcePropertyIntelligenceV1;
  stages: StructuredListingPipelineStagesV1;
  generated_at: string;
}

function adaptInput(input: StructuredListingPipelineInput): CanonicalPropertyV1 {
  switch (input.origin) {
    case "direct_feed": return adaptValidatedFeedRow(input.row, input.context);
    case "authorized_scraper": return adaptScrapedListing(input.row, input.context);
    case "partner": return adaptPartnerListing(input.row, input.context);
    case "legacy_db": return adaptLegacyListing(input.row, input.context);
    case "first_party": return input.property;
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
  return { valid: false, issues: [{ path: "offer", code, message, severity: "error" }] };
}

function pickSurfaceFact(property: CanonicalPropertyV1) {
  const surfaces = property.facts.surfaces;
  return surfaces.surface_habitable_m2 ?? surfaces.surface_total_m2 ?? surfaces.surface_built_m2 ?? surfaces.surface_land_m2;
}

function marketLabel(position: MarketIntelligenceV2["comparison"]["position"]): string {
  switch (position) {
    case "below_market": return "Position relative inférieure";
    case "near_market": return "Position relative proche";
    case "above_market": return "Position relative supérieure";
    case "overpriced": return "Écart indicatif important";
    case "insufficient_data": return "Données marché insuffisantes";
  }
}

function buildMarketReferenceId(market: MarketIntelligenceV2): string | null {
  const benchmark = market.benchmark;
  if (!benchmark.source || !benchmark.scope || !benchmark.city || !benchmark.property_type) return null;
  return [benchmark.source, benchmark.scope, benchmark.city, benchmark.neighborhood ?? "_", benchmark.property_type].join(":");
}

function computeMarketAnalysis(
  property: CanonicalPropertyV1,
  offer: CanonicalOfferV1 | null,
  generatedAt: string,
): StructuredListingMarketAnalysisV1 {
  const propertyType = property.facts.classification.property_type.value;
  const marketSegment = property.facts.classification.market_segment.value;
  const city = property.facts.location.city.value;
  const neighborhood = property.facts.location.neighborhood?.value ?? property.facts.location.district?.value ?? null;
  const surfaceFact = pickSurfaceFact(property);
  const surfaceM2 = surfaceFact?.value ?? null;
  const priceAmount = offer?.price_status === "valid" ? offer.price_amount.value : null;

  const intelligenceV2 = evaluateMarketIntelligenceV2({
    city,
    neighborhood,
    property_type: propertyType,
    transaction_type: offer?.transaction_type ?? null,
    market_segment: marketSegment,
    surface_m2: surfaceM2,
    asking_price_mad: priceAmount,
    generated_at: generatedAt,
  });

  if (intelligenceV2.status !== "evaluated" || !offer || !surfaceFact || surfaceFact.value == null || offer.price_amount.value == null) {
    const claim = createUnavailableClaim({
      claim_id: `market-position:${property.property_id}`,
      domain: "market_position",
      label: "Données marché insuffisantes",
      explanation: intelligenceV2.explanation,
      generated_at: generatedAt,
    });
    return { gap: intelligenceV2.gap, intelligence_v2: intelligenceV2, claim, contract_validation: validateAnalysisClaim(claim) };
  }

  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `market-position:${property.property_id}`,
    domain: "market_position",
    label: marketLabel(intelligenceV2.comparison.position),
    explanation: intelligenceV2.explanation,
    strength: "indicative",
    confidence: intelligenceV2.confidence,
    evidence: [
      evidenceFromFact(`${offer.offer_id}:asking-price`, offer.price_amount),
      evidenceFromFact(`${property.property_id}:surface`, surfaceFact),
    ],
    assumptions: [
      "Le prix utilisé est le prix demandé de l'offre structurée sélectionnée, pas un prix de transaction constaté.",
      "La surface utilisée correspond au fait canonique de surface préféré disponible pour ce bien.",
    ],
    limitations: intelligenceV2.limitations,
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
    return {
      gap: intelligenceV2.gap,
      intelligence_v2: { ...intelligenceV2, status: "insufficient_data", confidence: "insufficient" },
      claim: safeClaim,
      contract_validation: validateAnalysisClaim(safeClaim),
    };
  }

  return { gap: intelligenceV2.gap, intelligence_v2: intelligenceV2, claim, contract_validation: contractValidation };
}

export function runStructuredListingIntelligencePipeline(
  input: StructuredListingPipelineInput,
  generatedAt = new Date().toISOString(),
  analysisContext: StructuredListingPipelineAnalysisContextV1 = {},
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
  const anomaly = evaluateAnomalyEngineV1(enriched, selectedOffer, market.intelligence_v2, generatedAt, analysisContext);
  const multisource = evaluateMultiSourcePropertyIntelligenceV1(enriched, generatedAt, analysisContext);
  const marketEvaluated = market.intelligence_v2.status === "evaluated" && market.intelligence_v2.comparison.position !== "insufficient_data";

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
    price_per_m2: market.intelligence_v2.asking_price.price_per_m2,
    price_per_m2_method: market.intelligence_v2.asking_price.price_per_m2 == null ? "unavailable" as const : "price_divided_by_surface" as const,
    data_completeness_score: completeness.score,
    freshness_score: freshness.freshness_score,
    market_position: marketEvaluated ? market.intelligence_v2.comparison.position : null,
    market_reference_id: marketEvaluated ? buildMarketReferenceId(market.intelligence_v2) : null,
    // Legacy field name retained as a compatibility projection. Semantics: linkage-confidence index, never duplicate probability.
    duplicate_score: multisource.linkage.confidence_score,
    anomaly_score: anomaly.anomaly_score,
  };

  const property: CanonicalPropertyV1 = { ...enriched, intelligence };

  return {
    pipeline_version: STRUCTURED_LISTING_PIPELINE_VERSION,
    origin: input.origin,
    property,
    selected_offer: selectedOffer,
    validation: { property_ingestion: propertyIngestion, offer_ingestion: offerIngestion, publication },
    completeness,
    market,
    freshness,
    anomaly,
    multisource,
    stages: {
      adaptation: "completed",
      property_ingestion_validation: propertyIngestion.valid ? "passed" : "failed",
      offer_ingestion_validation: offerIngestion ? (offerIngestion.valid ? "passed" : "failed") : "unavailable",
      safe_enrichment: "completed",
      information_completeness: "completed",
      publication_validation: publication ? (publication.valid ? "passed" : "failed") : "unavailable",
      market_analysis: market.claim.strength === "unavailable" ? "unavailable" : "completed",
      freshness: freshness.claim.strength === "unavailable" ? "unavailable" : "completed",
      duplicate_intelligence: multisource.status === "evaluated" ? "completed" : "unavailable",
      anomaly_intelligence: anomaly.status === "evaluated" ? "completed" : "unavailable",
      akar_score: "not_evaluated",
      final_conclusion: "not_evaluated",
      property_fit: "not_evaluated",
    },
    generated_at: generatedAt,
  };
}
