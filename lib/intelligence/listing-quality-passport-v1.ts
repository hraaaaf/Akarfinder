import type { CanonicalOfferV1, CanonicalPropertyV1 } from "../property-schema/core";
import type { CompletenessResultV1 } from "../property-schema/completeness";
import type { FreshnessProvenanceV2 } from "./freshness-provenance-v2";
import type { AnomalyEngineV1 } from "./anomaly-engine-v1";
import type { MultiSourcePropertyIntelligenceV1 } from "./multisource-property-intelligence-v1";

export const LISTING_QUALITY_PASSPORT_VERSION = "1.0" as const;

export interface ListingQualityPassportV1 {
  version: typeof LISTING_QUALITY_PASSPORT_VERSION;
  completeness_score: number;
  trust_score: number | null;
  trust_coverage_percent: number;
  media_score: number;
  ranking_quality_score: number | null;
  components: {
    provenance: number | null;
    freshness: number | null;
    coherence: number | null;
    corroboration: number | null;
  };
  limitations: string[];
}

const TRUST_WEIGHTS = {
  provenance: 35,
  freshness: 30,
  coherence: 25,
  corroboration: 10,
} as const;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function provenanceScore(channel: FreshnessProvenanceV2["verification_channel"]): number | null {
  switch (channel) {
    case "first_party": return 100;
    case "partner_structured": return 95;
    case "authorized_source_observation": return 85;
    case "search_discovery": return 65;
    case "legacy_import": return 45;
    case "system_unknown": return null;
  }
}

function coherenceScore(anomaly: AnomalyEngineV1): number | null {
  if (anomaly.status !== "evaluated" || anomaly.anomaly_score == null) return null;
  return clamp(100 - anomaly.anomaly_score);
}

function corroborationScore(multisource: MultiSourcePropertyIntelligenceV1): number | null {
  if (!multisource.is_multi_source) return null;
  if (multisource.linkage.contradictions_present) return 0;
  switch (multisource.linkage.level) {
    case "explicitly_supported": return 100;
    case "strong_candidate": return 80;
    case "possible_candidate": return 45;
    case "unresolved": return null;
  }
}

function mediaScore(property: CanonicalPropertyV1): number {
  const publishableImages = property.media.filter(
    (asset) => asset.type === "image" && asset.publication_permission === "allowed" && asset.rights_status === "allowed",
  );
  const publishablePlans = property.media.filter(
    (asset) => asset.type === "floor_plan" && asset.publication_permission === "allowed" && asset.rights_status === "allowed",
  );

  let score = 0;
  if (publishableImages.length >= 1) score += 35;
  if (publishableImages.length >= 3) score += 20;
  if (publishableImages.length >= 6) score += 20;
  if (publishableImages.length >= 10) score += 15;
  if (publishablePlans.length >= 1) score += 10;
  return clamp(score);
}

function weightedTrust(components: ListingQualityPassportV1["components"]): { score: number | null; coverage: number } {
  const available = (Object.keys(TRUST_WEIGHTS) as Array<keyof typeof TRUST_WEIGHTS>)
    .filter((key) => components[key] != null);
  const availableWeight = available.reduce((sum, key) => sum + TRUST_WEIGHTS[key], 0);
  if (availableWeight < 60 || available.length < 2) return { score: null, coverage: availableWeight };

  const weighted = available.reduce(
    (sum, key) => sum + Number(components[key]) * TRUST_WEIGHTS[key],
    0,
  );
  return { score: Math.round(weighted / availableWeight), coverage: availableWeight };
}

export function evaluateListingQualityPassportV1(input: {
  property: CanonicalPropertyV1;
  selected_offer: CanonicalOfferV1 | null;
  completeness: CompletenessResultV1;
  freshness: FreshnessProvenanceV2;
  anomaly: AnomalyEngineV1;
  multisource: MultiSourcePropertyIntelligenceV1;
}): ListingQualityPassportV1 {
  const components = {
    provenance: provenanceScore(input.freshness.verification_channel),
    freshness: input.freshness.freshness_score,
    coherence: coherenceScore(input.anomaly),
    corroboration: corroborationScore(input.multisource),
  };
  const trust = weightedTrust(components);
  const media = mediaScore(input.property);

  const rankingQuality = trust.score == null
    ? null
    : Math.round(
        clamp(
          input.completeness.score * 0.45 +
          trust.score * 0.40 +
          media * 0.15,
        ),
      );

  return {
    version: LISTING_QUALITY_PASSPORT_VERSION,
    completeness_score: input.completeness.score,
    trust_score: trust.score,
    trust_coverage_percent: trust.coverage,
    media_score: media,
    ranking_quality_score: rankingQuality,
    components,
    limitations: [
      "Le score de complétude mesure la présence d'informations utiles, pas leur véracité.",
      "Le score de confiance mesure la qualité documentaire des signaux disponibles ; il ne certifie ni le bien ni sa disponibilité actuelle.",
      "Le score média ne récompense que les médias publiables avec droits et permission explicitement autorisés.",
      "Le ranking_quality_score est un signal de qualité destiné à départager des résultats déjà pertinents ; il ne doit jamais compenser une faible pertinence de recherche.",
      "Le contexte marché est volontairement exclu de la qualité intrinsèque de l'annonce.",
    ],
  };
}
