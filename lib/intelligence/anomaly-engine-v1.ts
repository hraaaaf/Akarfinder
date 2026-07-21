import {
  createUnavailableClaim,
  evidenceFromFact,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisContractValidation,
  type AnalysisEvidenceV1,
} from "../analysis/analysis-contract";
import type {
  CanonicalFact,
  CanonicalOfferV1,
  CanonicalPropertyV1,
} from "../property-schema/core";
import type { MarketIntelligenceV2 } from "../market/market-intelligence-v2";

export const ANOMALY_ENGINE_VERSION = "1.0" as const;

export type AnomalySeverity = "low" | "medium" | "high";
export type AnomalyConfidence = "low" | "medium" | "high";
export type AnomalyStatus = "evaluated" | "insufficient_data";

export type AnomalySignalCode =
  | "market_price_outlier"
  | "price_range_order_conflict"
  | "observation_chronology_conflict"
  | "future_observation_timestamp"
  | "offer_lifecycle_conflict"
  | "surface_fact_divergence"
  | "multi_offer_price_divergence"
  | "abrupt_price_change";

export interface AnomalyPriceObservationV1 {
  observed_at: string;
  price_mad: number | null;
  source_ref?: string | null;
}

export interface AnomalyEngineContextV1 {
  /** Real observed history only. Never synthesize missing price history. */
  price_history?: AnomalyPriceObservationV1[];
}

export interface AnomalySignalV1 {
  code: AnomalySignalCode;
  label: string;
  explanation: string;
  severity: AnomalySeverity;
  confidence: AnomalyConfidence;
  evidence: AnalysisEvidenceV1[];
  metrics: Record<string, number | string | boolean | null>;
  limitations: string[];
}

export interface AnomalyCoverageV1 {
  evaluated_checks: string[];
  unavailable_checks: string[];
}

export interface AnomalyEngineV1 {
  version: typeof ANOMALY_ENGINE_VERSION;
  status: AnomalyStatus;
  anomaly_score: number | null;
  signals: AnomalySignalV1[];
  coverage: AnomalyCoverageV1;
  claim: AnalysisClaimV1;
  contract_validation: AnalysisContractValidation;
  generated_at: string;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function percentDifference(a: number, b: number): number {
  const denominator = Math.min(Math.abs(a), Math.abs(b));
  if (!Number.isFinite(denominator) || denominator <= 0) return Number.POSITIVE_INFINITY;
  return (Math.abs(a - b) / denominator) * 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function severityWeight(severity: AnomalySeverity): number {
  if (severity === "high") return 50;
  if (severity === "medium") return 30;
  return 15;
}

function metadataEvidence(
  evidenceId: string,
  sourceRef: string | null,
  observedAt: string | null,
  confidence: "high" | "medium" | "low" = "high",
): AnalysisEvidenceV1 {
  return {
    evidence_id: evidenceId,
    provenance: "INFERRED",
    confidence,
    verification_status: "consistent",
    visibility: "PUBLIC",
    source_ref: sourceRef,
    observed_at: observedAt,
    public_usable: true,
  };
}

function uniqueEvidence(evidence: AnalysisEvidenceV1[]): AnalysisEvidenceV1[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    if (seen.has(item.evidence_id)) return false;
    seen.add(item.evidence_id);
    return true;
  });
}

function publicFactEvidence<T>(id: string, fact: CanonicalFact<T> | undefined): AnalysisEvidenceV1[] {
  if (!fact || fact.value == null || fact.visibility !== "PUBLIC") return [];
  return [evidenceFromFact(id, fact)];
}

function preferredSurfaceFacts(property: CanonicalPropertyV1): Array<{ id: string; fact: CanonicalFact<number> }> {
  const surfaces = property.facts.surfaces;
  const candidates: Array<[string, CanonicalFact<number> | undefined]> = [
    ["surface_total_m2", surfaces.surface_total_m2],
    ["surface_habitable_m2", surfaces.surface_habitable_m2],
    ["surface_built_m2", surfaces.surface_built_m2],
    ["surface_land_m2", surfaces.surface_land_m2],
  ];
  return candidates
    .filter((entry): entry is [string, CanonicalFact<number>] => Boolean(entry[1] && isPositiveFinite(entry[1]?.value)))
    .map(([id, fact]) => ({ id, fact }));
}

function buildSummaryClaim(
  property: CanonicalPropertyV1,
  signals: AnomalySignalV1[],
  generatedAt: string,
): { claim: AnalysisClaimV1; validation: AnalysisContractValidation } {
  if (signals.length === 0) {
    const claim = createUnavailableClaim({
      claim_id: `anomaly:${property.property_id}`,
      domain: "anomaly_signal",
      label: "Aucun signal inhabituel déclenché dans les contrôles disponibles",
      explanation:
        "Les contrôles exécutables n'ont déclenché aucun signal. Cette absence de signal ne démontre pas que toutes les informations du bien sont exactes ou complètes.",
      generated_at: generatedAt,
    });
    return { claim, validation: validateAnalysisClaim(claim) };
  }

  const evidence = uniqueEvidence(signals.flatMap((signal) => signal.evidence)).filter((item) => item.public_usable);
  if (evidence.length === 0) {
    const claim = createUnavailableClaim({
      claim_id: `anomaly:${property.property_id}`,
      domain: "anomaly_signal",
      label: "Signal inhabituel non publiable",
      explanation: "Un contrôle interne a déclenché un signal, mais les preuves publiques disponibles ne permettent pas de l'exposer comme conclusion publique.",
      generated_at: generatedAt,
    });
    return { claim, validation: validateAnalysisClaim(claim) };
  }

  const hasHigh = signals.some((signal) => signal.severity === "high" && signal.confidence !== "low");
  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `anomaly:${property.property_id}`,
    domain: "anomaly_signal",
    label: signals.length === 1 ? "1 signal inhabituel à examiner" : `${signals.length} signaux inhabituels à examiner`,
    explanation:
      "Des écarts ou incohérences ont été détectés automatiquement dans les données disponibles. Ils doivent être confirmés par les sources concernées avant toute interprétation.",
    strength: "inferred",
    confidence: hasHigh ? "medium" : "low",
    evidence,
    assumptions: [
      "Les contrôles utilisent uniquement les données canoniques, observations et repères explicitement disponibles au moment du calcul.",
    ],
    limitations: [
      "Un signal inhabituel n'est pas une preuve d'erreur, de mauvaise foi ou d'indisponibilité du bien.",
      "L'absence de signal sur un contrôle non évaluable ne constitue pas une validation de la donnée manquante.",
    ],
    generated_at: generatedAt,
  };
  return { claim, validation: validateAnalysisClaim(claim) };
}

export function evaluateAnomalyEngineV1(
  property: CanonicalPropertyV1,
  selectedOffer: CanonicalOfferV1 | null,
  market: MarketIntelligenceV2,
  generatedAt: string,
  context: AnomalyEngineContextV1 = {},
): AnomalyEngineV1 {
  const signals: AnomalySignalV1[] = [];
  const evaluatedChecks: string[] = [];
  const unavailableChecks: string[] = [];

  // 1) Extreme asking-price distance from a defensible market reference.
  if (market.status === "evaluated" && market.comparison.gap_percent != null && selectedOffer) {
    evaluatedChecks.push("market_price_outlier");
    const absGap = Math.abs(market.comparison.gap_percent);
    if (absGap >= 50) {
      const priceEvidence = publicFactEvidence(`${selectedOffer.offer_id}:asking-price`, selectedOffer.price_amount);
      const surfaceEvidence = preferredSurfaceFacts(property).slice(0, 1).flatMap(({ id, fact }) => publicFactEvidence(`${property.property_id}:${id}`, fact));
      signals.push({
        code: "market_price_outlier",
        label: "Écart de prix inhabituel par rapport au repère disponible",
        explanation: `Le prix demandé par m² s'écarte d'environ ${round1(absGap)} % du repère de marché compatible utilisé par AkarFinder.`,
        severity: absGap >= 80 ? "high" : "medium",
        confidence: market.confidence === "medium" || market.confidence === "high" ? "medium" : "low",
        evidence: [...priceEvidence, ...surfaceEvidence],
        metrics: {
          gap_percent: round1(market.comparison.gap_percent),
          benchmark_scope: market.benchmark.scope,
          benchmark_quality: market.benchmark.quality,
        },
        limitations: [
          "Le repère de marché est indicatif et un écart important peut s'expliquer par des caractéristiques non modélisées.",
        ],
      });
    }
  } else {
    unavailableChecks.push("market_price_outlier");
  }

  // 2) Invalid declared price range ordering.
  const minFact = selectedOffer?.price_range_min;
  const maxFact = selectedOffer?.price_range_max;
  if (isPositiveFinite(minFact?.value) && isPositiveFinite(maxFact?.value)) {
    evaluatedChecks.push("price_range_order_conflict");
    if (minFact.value > maxFact.value) {
      signals.push({
        code: "price_range_order_conflict",
        label: "Fourchette de prix incohérente",
        explanation: "La borne minimale déclarée de la fourchette est supérieure à la borne maximale.",
        severity: "high",
        confidence: "high",
        evidence: [
          ...publicFactEvidence(`${selectedOffer?.offer_id}:price-range-min`, minFact),
          ...publicFactEvidence(`${selectedOffer?.offer_id}:price-range-max`, maxFact),
        ],
        metrics: { min_price_mad: minFact.value, max_price_mad: maxFact.value },
        limitations: ["Le signal décrit une incohérence de structure de données et ne permet pas de déterminer quelle borne est correcte."],
      });
    }
  } else {
    unavailableChecks.push("price_range_order_conflict");
  }

  // 3) Observation chronology and future timestamps.
  if (selectedOffer) {
    const first = parseTime(selectedOffer.first_observed_at);
    const last = parseTime(selectedOffer.last_observed_at);
    const generated = parseTime(generatedAt);
    if (first != null || last != null) {
      evaluatedChecks.push("observation_chronology");
      if (first != null && last != null && first > last) {
        signals.push({
          code: "observation_chronology_conflict",
          label: "Chronologie d'observation incohérente",
          explanation: "La première observation enregistrée est postérieure à la dernière observation enregistrée.",
          severity: "high",
          confidence: "high",
          evidence: [metadataEvidence(`${selectedOffer.offer_id}:observation-window`, selectedOffer.source_url, selectedOffer.last_observed_at)],
          metrics: { first_observed_at: selectedOffer.first_observed_at, last_observed_at: selectedOffer.last_observed_at },
          limitations: ["Le signal peut provenir d'un problème de migration ou de synchronisation des métadonnées temporelles."],
        });
      }
      if (generated != null) {
        const tolerance = 86_400_000;
        const future = [first, last].filter((value): value is number => value != null && value > generated + tolerance);
        if (future.length > 0) {
          signals.push({
            code: "future_observation_timestamp",
            label: "Horodatage d'observation futur",
            explanation: "Une date d'observation est située dans le futur au-delà de la tolérance de synchronisation.",
            severity: "medium",
            confidence: "high",
            evidence: [metadataEvidence(`${selectedOffer.offer_id}:future-observation`, selectedOffer.source_url, selectedOffer.last_observed_at)],
            metrics: { generated_at: generatedAt, first_observed_at: selectedOffer.first_observed_at, last_observed_at: selectedOffer.last_observed_at },
            limitations: ["Un décalage d'horloge ou de fuseau mal normalisé peut produire ce signal."],
          });
        }
      }
    } else {
      unavailableChecks.push("observation_chronology");
    }
  } else {
    unavailableChecks.push("observation_chronology");
  }

  // 4) Offer lifecycle contradictions.
  if (selectedOffer) {
    evaluatedChecks.push("offer_lifecycle_conflict");
    const unavailableState = ["sold", "rented", "withdrawn"].includes(selectedOffer.availability_status);
    if (selectedOffer.offer_status === "active" && unavailableState) {
      signals.push({
        code: "offer_lifecycle_conflict",
        label: "Statuts d'offre contradictoires",
        explanation: "L'offre est marquée active alors que son statut de disponibilité indique qu'elle n'est plus proposée dans cet état.",
        severity: "medium",
        confidence: "high",
        evidence: [
          ...publicFactEvidence(`${selectedOffer.offer_id}:title`, selectedOffer.title),
          metadataEvidence(`${selectedOffer.offer_id}:lifecycle`, selectedOffer.source_url, selectedOffer.last_observed_at),
        ],
        metrics: { offer_status: selectedOffer.offer_status, availability_status: selectedOffer.availability_status },
        limitations: ["Le signal peut refléter un délai de synchronisation entre deux champs de statut."],
      });
    }
  } else {
    unavailableChecks.push("offer_lifecycle_conflict");
  }

  // 5) Conservative surface divergence for unit-like property types only.
  const type = property.facts.classification.property_type.value;
  const surfaceTotal = property.facts.surfaces.surface_total_m2;
  const surfaceHabitable = property.facts.surfaces.surface_habitable_m2;
  const surfaceBuilt = property.facts.surfaces.surface_built_m2;
  if (["apartment", "studio", "duplex", "office"].includes(type)) {
    const comparablePairs: Array<{ name: string; larger: CanonicalFact<number> | undefined; base: CanonicalFact<number> | undefined; factor: number }> = [
      { name: "habitable_vs_total", larger: surfaceHabitable, base: surfaceTotal, factor: 1.3 },
      { name: "built_vs_total", larger: surfaceBuilt, base: surfaceTotal, factor: 1.5 },
    ];
    const evaluable = comparablePairs.filter((pair) => isPositiveFinite(pair.larger?.value) && isPositiveFinite(pair.base?.value));
    if (evaluable.length > 0) {
      evaluatedChecks.push("surface_fact_divergence");
      const conflicting = evaluable.find((pair) => (pair.larger?.value ?? 0) > (pair.base?.value ?? 0) * pair.factor);
      if (conflicting && conflicting.larger && conflicting.base) {
        signals.push({
          code: "surface_fact_divergence",
          label: "Surfaces déclarées fortement divergentes",
          explanation: "Deux surfaces canoniques du même bien présentent un écart inhabituel au regard de leurs libellés.",
          severity: "medium",
          confidence: "medium",
          evidence: [
            ...publicFactEvidence(`${property.property_id}:${conflicting.name}:larger`, conflicting.larger),
            ...publicFactEvidence(`${property.property_id}:${conflicting.name}:base`, conflicting.base),
          ],
          metrics: {
            comparison: conflicting.name,
            larger_surface_m2: conflicting.larger.value,
            base_surface_m2: conflicting.base.value,
            ratio: round1(conflicting.larger.value / conflicting.base.value),
          },
          limitations: ["Les conventions de surface peuvent varier selon la source ; ce signal demande une vérification du sens exact de chaque surface."],
        });
      }
    } else {
      unavailableChecks.push("surface_fact_divergence");
    }
  } else {
    unavailableChecks.push("surface_fact_divergence");
  }

  // 6) Price divergence between active offers already attached to the same canonical property.
  const pricedOffers = property.offers.filter(
    (offer) => offer.offer_status === "active" && offer.price_status === "valid" && isPositiveFinite(offer.price_amount.value),
  );
  if (pricedOffers.length >= 2) {
    evaluatedChecks.push("multi_offer_price_divergence");
    const sorted = [...pricedOffers].sort((a, b) => (a.price_amount.value ?? 0) - (b.price_amount.value ?? 0));
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    const gap = percentDifference(low.price_amount.value as number, high.price_amount.value as number);
    if (gap >= 40) {
      signals.push({
        code: "multi_offer_price_divergence",
        label: "Prix fortement divergents entre offres rattachées au même bien",
        explanation: `Les offres actives actuellement rattachées au même bien canonique présentent environ ${round1(gap)} % d'écart entre le prix le plus bas et le plus haut.`,
        severity: gap >= 80 ? "high" : "medium",
        confidence: "medium",
        evidence: [
          ...publicFactEvidence(`${low.offer_id}:price`, low.price_amount),
          ...publicFactEvidence(`${high.offer_id}:price`, high.price_amount),
        ],
        metrics: {
          lowest_price_mad: low.price_amount.value,
          highest_price_mad: high.price_amount.value,
          divergence_percent: round1(gap),
          offer_count: pricedOffers.length,
        },
        limitations: ["Le signal suppose que le rattachement canonique des offres au même bien est correct ; la consolidation multi-source est évaluée séparément."],
      });
    }
  } else {
    unavailableChecks.push("multi_offer_price_divergence");
  }

  // 7) Abrupt real observed price movement. History is optional and never synthesized.
  const history = (context.price_history ?? [])
    .filter((point) => isPositiveFinite(point.price_mad) && parseTime(point.observed_at) != null)
    .sort((a, b) => (parseTime(a.observed_at) as number) - (parseTime(b.observed_at) as number));
  if (history.length >= 2) {
    evaluatedChecks.push("abrupt_price_change");
    let strongest: { previous: AnomalyPriceObservationV1; current: AnomalyPriceObservationV1; change: number; days: number } | null = null;
    for (let index = 1; index < history.length; index += 1) {
      const previous = history[index - 1];
      const current = history[index];
      const previousTime = parseTime(previous.observed_at) as number;
      const currentTime = parseTime(current.observed_at) as number;
      const days = (currentTime - previousTime) / 86_400_000;
      if (days < 0 || days > 30) continue;
      const change = percentDifference(previous.price_mad as number, current.price_mad as number);
      if (change < 30) continue;
      if (!strongest || change > strongest.change) strongest = { previous, current, change, days };
    }
    if (strongest) {
      signals.push({
        code: "abrupt_price_change",
        label: "Variation de prix rapide à examiner",
        explanation: `Deux observations réelles successives montrent une variation d'environ ${round1(strongest.change)} % en ${round1(strongest.days)} jours.`,
        severity: strongest.change >= 60 ? "high" : "medium",
        confidence: "medium",
        evidence: [
          metadataEvidence(`${property.property_id}:price-history:previous`, strongest.previous.source_ref ?? null, strongest.previous.observed_at, "medium"),
          metadataEvidence(`${property.property_id}:price-history:current`, strongest.current.source_ref ?? null, strongest.current.observed_at, "medium"),
        ],
        metrics: {
          previous_price_mad: strongest.previous.price_mad,
          current_price_mad: strongest.current.price_mad,
          change_percent: round1(strongest.change),
          elapsed_days: round1(strongest.days),
        },
        limitations: ["Une variation rapide peut correspondre à une correction d'annonce, une négociation commerciale ou un changement de périmètre de l'offre."],
      });
    }
  } else {
    unavailableChecks.push("abrupt_price_change");
  }

  const status: AnomalyStatus = evaluatedChecks.length > 0 ? "evaluated" : "insufficient_data";
  const anomalyScore = status === "evaluated"
    ? Math.min(100, signals.reduce((sum, signal) => sum + severityWeight(signal.severity), 0))
    : null;
  const summary = buildSummaryClaim(property, signals, generatedAt);

  return {
    version: ANOMALY_ENGINE_VERSION,
    status,
    anomaly_score: anomalyScore,
    signals,
    coverage: {
      evaluated_checks: [...new Set(evaluatedChecks)],
      unavailable_checks: [...new Set(unavailableChecks)],
    },
    claim: summary.claim,
    contract_validation: summary.validation,
    generated_at: generatedAt,
  };
}
