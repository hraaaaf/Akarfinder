import {
  runStructuredListingIntelligencePipeline,
  type StructuredListingPipelineAnalysisContextV1,
  type StructuredListingPipelineInput,
  type StructuredListingPipelineResultV1,
} from "./structured-listing-pipeline";
import {
  evaluateListingQualityPassportV1,
  type ListingQualityPassportV1,
} from "./listing-quality-passport-v1";

export const LISTING_FACTORY_VERSION = "1.0" as const;

export interface ListingFactoryResultV1 {
  version: typeof LISTING_FACTORY_VERSION;
  pipeline: StructuredListingPipelineResultV1;
  quality: ListingQualityPassportV1;
  generated_at: string;
}

/**
 * Listing Factory V1 is a compatibility-preserving orchestration layer.
 * It reuses the canonical structured-listing pipeline and adds an explicit
 * quality passport. Search relevance remains a separate concern: quality may
 * break ties between already relevant results, never compensate for weak intent match.
 */
export function runListingFactoryV1(
  input: StructuredListingPipelineInput,
  generatedAt = new Date().toISOString(),
  analysisContext: StructuredListingPipelineAnalysisContextV1 = {},
): ListingFactoryResultV1 {
  const pipeline = runStructuredListingIntelligencePipeline(input, generatedAt, analysisContext);
  const quality = evaluateListingQualityPassportV1({
    property: pipeline.property,
    selected_offer: pipeline.selected_offer,
    completeness: pipeline.completeness,
    freshness: pipeline.freshness,
    anomaly: pipeline.anomaly,
    multisource: pipeline.multisource,
  });

  return {
    version: LISTING_FACTORY_VERSION,
    pipeline,
    quality,
    generated_at: generatedAt,
  };
}
