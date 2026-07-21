import {
  createUnavailableClaim,
  evidenceFromFact,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisConfidence,
  type AnalysisContractValidation,
  type AnalysisEvidenceV1,
} from "../analysis/analysis-contract";
import type { MarketIntelligenceV2 } from "../market/market-intelligence-v2";
import type { CompletenessResultV1 } from "../property-schema/completeness";
import type { CanonicalOfferV1, CanonicalPropertyV1 } from "../property-schema/core";
import type { AnomalyEngineV1 } from "./anomaly-engine-v1";
import type { FreshnessProvenanceV2, FreshnessVerificationChannel } from "./freshness-provenance-v2";
import type { MultiSourcePropertyIntelligenceV1 } from "./multisource-property-intelligence-v1";

export const AKAR_SCORE_VERSION = "2.0" as const;
export const AKAR_SCORE_MIN_COMPONENTS = 3;
export const AKAR_SCORE_MIN_WEIGHT_COVERAGE = 60;

export type AkarScoreStatus = "evaluated" | "insufficient_data";
export type AkarScoreComponentKey =
  | "completeness"
  | "provenance_traceability"
  | "freshness"
  | "data_coherence"
  | "market_context_quality";

export interface AkarScoreComponentV2 {
  key: AkarScoreComponentKey;
  label: string;
  weight: number;
  status: "evaluated" | "unavailable";
  score: number | null;
  normalized_weight: number | null;
  contribution: number | null;
  explanation: string;
}

export interface AkarScoreCoverageV2 {
  evaluated_components: number;
  total_components: 5;
  available_weight: number;
  total_weight: 100;
  coverage_percent: number;
  minimum_components_required: typeof AKAR_SCORE_MIN_COMPONENTS;
  minimum_weight_required: typeof AKAR_SCORE_MIN_WEIGHT_COVERAGE;
  minimum_coverage_met: boolean;
}

export interface AkarScoreBonusV2 {
  multi_source_corroboration: number;
  reason: string | null;
}

export interface AkarScoreV2 {
  version: typeof AKAR_SCORE_VERSION;
  status: AkarScoreStatus;
  score: number | null;
  base_score: number | null;
  public_label: string;
  measured_as: "information_documentation_quality";
  components: AkarScoreComponentV2[];
  coverage: AkarScoreCoverageV2;
  bonus: AkarScoreBonusV2;
  claim: AnalysisClaimV1;
  contract_validation: AnalysisContractValidation;
  limitations: string[];
  generated_at: string;
}

export interface AkarScoreV2Input {
  property: CanonicalPropertyV1;
  selected_offer: CanonicalOfferV1 | null;
  completeness: CompletenessResultV1;
  freshness: FreshnessProvenanceV2;
  market: MarketIntelligenceV2;
  anomaly: AnomalyEngineV1;
  multisource: MultiSourcePropertyIntelligenceV1;
  generated_at?: string;
}

type RawComponent = Omit<AkarScoreComponentV2, "normalized_weight" | "contribution">;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function provenanceTraceabilityScore(channel: FreshnessVerificationChannel): number | null {
  switch (channel) {
    case "first_party": return 100;
    case "partner_structured": return 90;
    case "authorized_source_observation": return 80;
    case "search_discovery": return 60;
    case "legacy_import": return 40;
    case "system_unknown": return null;
  }
}

function provenanceExplanation(channel: FreshnessVerificationChannel): string {
  switch (channel) {
    case "first_party": return "Donnée structurée issue directement du parcours AkarFinder.";
    case "partner_structured": return "Donnée structurée transmise par un partenaire identifié.";
    case "authorized_source_observation": return "Observation structurée rattachée à une source autorisée et traçable.";
    case "search_discovery": return "Signal découvert via un canal de recherche ; la traçabilité est plus limitée qu'une source structurée directe.";
    case "legacy_import": return "Donnée issue d'un import historique avec provenance partiellement reconstruite.";
    case "system_unknown": return "Le canal de provenance n'est pas suffisamment établi pour noter cette dimension.";
  }
}

function marketContextScore(market: MarketIntelligenceV2): number | null {
  if (market.status !== "evaluated") return null;
  switch (market.confidence) {
    case "high": return 100;
    case "medium": return 80;
    case "low": return 55;
    case "insufficient": return null;
  }
}

function marketContextExplanation(market: MarketIntelligenceV2): string {
  if (market.status !== "evaluated") return "Aucun contexte marché suffisamment compatible n'est disponible pour cette annonce.";
  const scope = market.benchmark.match_level === "exact_neighborhood"
    ? "quartier exact"
    : market.benchmark.match_level === "city_direct" || market.benchmark.match_level === "city_fallback"
      ? "ville"
      : "périmètre non établi";
  return `Le contexte marché repose sur un repère compatible au niveau ${scope}, avec une qualité ${market.confidence}.`;
}

function coherenceScore(anomaly: AnomalyEngineV1): number | null {
  if (anomaly.status !== "evaluated" || anomaly.anomaly_score == null) return null;
  return clampScore(100 - anomaly.anomaly_score);
}

function coherenceExplanation(anomaly: AnomalyEngineV1): string {
  if (anomaly.status !== "evaluated" || anomaly.anomaly_score == null) {
    return "Les contrôles de cohérence disponibles ne couvrent pas suffisamment cette annonce pour noter cette dimension.";
  }
  if (anomaly.signals.length === 0) {
    return "Aucun signal inhabituel n'a été déclenché par les contrôles exécutables ; cela ne valide pas les contrôles indisponibles.";
  }
  return `${anomaly.signals.length} signal${anomaly.signals.length === 1 ? "" : "aux"} inhabituel${anomaly.signals.length === 1 ? "" : "s"} réduit${anomaly.signals.length === 1 ? "" : "sent"} uniquement la composante de cohérence.`;
}

function multiSourceBonus(multisource: MultiSourcePropertyIntelligenceV1): AkarScoreBonusV2 {
  if (!multisource.is_multi_source || multisource.linkage.contradictions_present) {
    return { multi_source_corroboration: 0, reason: null };
  }
  if (multisource.linkage.level === "explicitly_supported" && multisource.linkage.confidence === "high") {
    return {
      multi_source_corroboration: 3,
      reason: "Petit bonus de corroboration : plusieurs offres sont reliées par une association explicitement étayée.",
    };
  }
  if (multisource.linkage.level === "strong_candidate" && multisource.linkage.confidence === "medium") {
    return {
      multi_source_corroboration: 2,
      reason: "Petit bonus de corroboration : plusieurs offres sont reliées par des signaux structurés forts sans contradiction détectée.",
    };
  }
  return { multi_source_corroboration: 0, reason: null };
}

function scoreLabel(score: number | null): string {
  if (score == null) return "Qualité documentaire insuffisamment couverte";
  if (score >= 85) return "Informations très bien documentées";
  if (score >= 70) return "Informations bien documentées";
  if (score >= 50) return "Documentation intermédiaire";
  return "Documentation limitée";
}

function claimConfidence(coverage: AkarScoreCoverageV2): AnalysisConfidence {
  if (!coverage.minimum_coverage_met) return "insufficient";
  if (coverage.available_weight >= 85 && coverage.evaluated_components >= 4) return "high";
  if (coverage.available_weight >= 70) return "medium";
  return "low";
}

function uniquePublicEvidence(items: AnalysisEvidenceV1[]): AnalysisEvidenceV1[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.public_usable || seen.has(item.evidence_id)) return false;
    seen.add(item.evidence_id);
    return true;
  });
}

function buildEvidence(input: AkarScoreV2Input): AnalysisEvidenceV1[] {
  const evidence: AnalysisEvidenceV1[] = [
    ...input.freshness.claim.evidence,
    ...input.anomaly.claim.evidence,
    ...input.multisource.claim.evidence,
  ];

  const city = input.property.facts.location.city;
  if (city.value != null && city.visibility === "PUBLIC") {
    evidence.push(evidenceFromFact(`${input.property.property_id}:akar-score:city`, city));
  }
  if (input.selected_offer?.title.value != null && input.selected_offer.title.visibility === "PUBLIC") {
    evidence.push(evidenceFromFact(`${input.selected_offer.offer_id}:akar-score:title`, input.selected_offer.title));
  }
  if (input.selected_offer?.price_amount.value != null && input.selected_offer.price_amount.visibility === "PUBLIC") {
    evidence.push(evidenceFromFact(`${input.selected_offer.offer_id}:akar-score:price`, input.selected_offer.price_amount));
  }

  return uniquePublicEvidence(evidence);
}

function unavailableResult(
  input: AkarScoreV2Input,
  components: AkarScoreComponentV2[],
  coverage: AkarScoreCoverageV2,
  generatedAt: string,
  limitations: string[],
): AkarScoreV2 {
  const claim = createUnavailableClaim({
    claim_id: `akar-score:${input.property.property_id}`,
    domain: "information_quality",
    label: "AkarScore indisponible",
    explanation: "La couverture des dimensions documentaires est insuffisante pour calculer un AkarScore sans transformer des données manquantes en pénalité artificielle.",
    generated_at: generatedAt,
  });
  return {
    version: AKAR_SCORE_VERSION,
    status: "insufficient_data",
    score: null,
    base_score: null,
    public_label: scoreLabel(null),
    measured_as: "information_documentation_quality",
    components,
    coverage,
    bonus: { multi_source_corroboration: 0, reason: null },
    claim,
    contract_validation: validateAnalysisClaim(claim),
    limitations,
    generated_at: generatedAt,
  };
}

export function evaluateAkarScoreV2(input: AkarScoreV2Input): AkarScoreV2 {
  const generatedAt = input.generated_at ?? new Date().toISOString();
  const traceability = provenanceTraceabilityScore(input.freshness.verification_channel);
  const rawComponents: RawComponent[] = [
    {
      key: "completeness",
      label: "Complétude utile",
      weight: 30,
      status: "evaluated",
      score: clampScore(input.completeness.score),
      explanation: "Mesure pondérée de la présence des informations utiles attendues pour ce type de bien ; elle ne mesure pas leur véracité.",
    },
    {
      key: "provenance_traceability",
      label: "Traçabilité et provenance",
      weight: 25,
      status: traceability == null ? "unavailable" : "evaluated",
      score: traceability,
      explanation: provenanceExplanation(input.freshness.verification_channel),
    },
    {
      key: "freshness",
      label: "Fraîcheur d'observation",
      weight: 15,
      status: input.freshness.freshness_score == null ? "unavailable" : "evaluated",
      score: input.freshness.freshness_score,
      explanation: input.freshness.freshness_score == null
        ? "Aucune date d'observation exploitable n'est disponible ; cette dimension reste absente du calcul."
        : input.freshness.public_explanation,
    },
    {
      key: "data_coherence",
      label: "Cohérence des données",
      weight: 15,
      status: coherenceScore(input.anomaly) == null ? "unavailable" : "evaluated",
      score: coherenceScore(input.anomaly),
      explanation: coherenceExplanation(input.anomaly),
    },
    {
      key: "market_context_quality",
      label: "Qualité du contexte marché",
      weight: 15,
      status: marketContextScore(input.market) == null ? "unavailable" : "evaluated",
      score: marketContextScore(input.market),
      explanation: marketContextExplanation(input.market),
    },
  ];

  const available = rawComponents.filter((component) => component.status === "evaluated" && component.score != null);
  const availableWeight = available.reduce((sum, component) => sum + component.weight, 0);
  const coverage: AkarScoreCoverageV2 = {
    evaluated_components: available.length,
    total_components: 5,
    available_weight: availableWeight,
    total_weight: 100,
    coverage_percent: availableWeight,
    minimum_components_required: AKAR_SCORE_MIN_COMPONENTS,
    minimum_weight_required: AKAR_SCORE_MIN_WEIGHT_COVERAGE,
    minimum_coverage_met: available.length >= AKAR_SCORE_MIN_COMPONENTS && availableWeight >= AKAR_SCORE_MIN_WEIGHT_COVERAGE,
  };

  const components: AkarScoreComponentV2[] = rawComponents.map((component) => {
    if (component.status !== "evaluated" || component.score == null || availableWeight === 0) {
      return { ...component, normalized_weight: null, contribution: null };
    }
    const normalizedWeight = (component.weight / availableWeight) * 100;
    return {
      ...component,
      normalized_weight: round1(normalizedWeight),
      contribution: round1((component.score * component.weight) / availableWeight),
    };
  });

  const limitations = [
    "AkarScore mesure la qualité de documentation disponible, pas la probabilité qu'une annonce soit vraie, fiable ou sans risque.",
    "Une dimension absente reste indisponible et n'est jamais convertie en score zéro.",
    "Le score ne remplace ni une vérification juridique, ni une expertise immobilière, ni une vérification de disponibilité actuelle.",
    "L'absence de plusieurs sources ne pénalise jamais le score ; un bonus limité n'est accordé qu'en cas de corroboration multi-source suffisamment étayée.",
  ];

  if (!coverage.minimum_coverage_met) {
    return unavailableResult(input, components, coverage, generatedAt, limitations);
  }

  const baseScore = round1(
    available.reduce((sum, component) => sum + Number(component.score) * component.weight, 0) / availableWeight,
  );
  const bonus = multiSourceBonus(input.multisource);
  const finalScore = Math.round(clampScore(baseScore + bonus.multi_source_corroboration));
  const evidence = buildEvidence(input);

  if (evidence.length === 0) {
    return unavailableResult(input, components, coverage, generatedAt, limitations);
  }

  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `akar-score:${input.property.property_id}`,
    domain: "information_quality",
    label: `AkarScore ${finalScore}/100 — ${scoreLabel(finalScore)}`,
    explanation: `Le score synthétise ${coverage.evaluated_components} dimensions documentaires disponibles sur 5. Les dimensions non disponibles sont exclues du dénominateur plutôt que transformées en pénalité artificielle.${bonus.reason ? ` ${bonus.reason}` : ""}`,
    strength: "calculated",
    confidence: claimConfidence(coverage),
    evidence,
    assumptions: [
      "Chaque composante conserve sa sémantique propre : complétude, provenance, fraîcheur, cohérence et qualité du contexte marché.",
      "Les pondérations servent uniquement à construire un indice de qualité documentaire explicable.",
    ],
    limitations,
    generated_at: generatedAt,
  };
  const validation = validateAnalysisClaim(claim);

  if (!validation.valid) {
    return unavailableResult(input, components, coverage, generatedAt, limitations);
  }

  return {
    version: AKAR_SCORE_VERSION,
    status: "evaluated",
    score: finalScore,
    base_score: baseScore,
    public_label: scoreLabel(finalScore),
    measured_as: "information_documentation_quality",
    components,
    coverage,
    bonus,
    claim,
    contract_validation: validation,
    limitations,
    generated_at: generatedAt,
  };
}
