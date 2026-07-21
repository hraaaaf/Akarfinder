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
  CanonicalPropertyType,
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

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function percentDifference(a: number, b: number): number {
  const denominator = Math.min(Math.abs(a), Math.abs(b));
  if (denominator <= 0 || !Number.isFinite(denominator)) return Number.POSITIVE_INFINITY;
  return (Math.abs(a - b) / denominator) * 100;
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

function publicFactEvidence<T>(id: string, fact: CanonicalFact<T> | undefined): AnalysisEvidenceV1[] {
  if (!fact || fact.value == null || fact.visibility !== "PUBLIC") return [];
  return [evidenceFromFact(id, fact)];
}

function uniqueEvidence(items: AnalysisEvidenceV1[]): AnalysisEvidenceV1[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.evidence_id)) return false;
    seen.add(item.evidence_id);
    return true;
  });
}

function preferredSurfaceEvidence(property: CanonicalPropertyV1): AnalysisEvidenceV1[] {
  const surfaces = property.facts.surfaces;
  const candidates: Array<[string, CanonicalFact<number> | undefined]> = [
    ["surface_habitable_m2", surfaces.surface_habitable_m2],
    ["surface_total_m2", surfaces.surface_total_m2],
    ["surface_built_m2", surfaces.surface_built_m2],
    ["surface_land_m2", surfaces.surface_land_m2],
  ];
  for (const [name, candidate] of candidates) {
    if (candidate && isPositiveFinite(candidate.value)) {
      return publicFactEvidence(`${property.property_id}:${name}`, candidate);
    }
  }
  return [];
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
      explanation:
        "Un contrôle interne a déclenché un signal, mais les preuves publiques disponibles ne permettent pas de l'exposer comme conclusion publique.",
      generated_at: generatedAt,
    });
    return { claim, validation: validateAnalysisClaim(claim) };
  }

  const hasStrongSignal = signals.some((signal) => signal.severity === "high" && signal.confidence !== "low");
  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `anomaly:${property.property_id}`,
    domain: "anomaly_signal",
    label: signals.length === 1 ? "1 signal inhabituel à examiner" : `${signals.length} signaux inhabituels à examiner`,
    explanation:
      "Des écarts ou incohérences ont été détectés automatiquement dans les données disponibles. Ils doivent être confirmés par les sources concernées avant toute interprétation.",
    strength: "inferred",
    confidence: hasStrongSignal ? "medium" : "low",
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

function isUnitLikeProperty(type: CanonicalPropertyType | null): boolean {
  return type === "apartment" || type === "studio" || type === "duplex" || type === "office";
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
      signals.push({
        code: "market_price_outlier",
        label: "Écart de prix inhabituel par rapport au repère disponible",
        explanation: `Le prix demandé par m² s'écarte d'environ ${round1(absGap)} % du repère de marché compatible utilisé par AkarFinder.`,
        severity: absGap >= 80 ? "high" : "medium",
        confidence: market.confidence === "medium" || market.confidence === "high" ? "medium" : "low",
        evidence: [
          ...publicFactEvidence(`${selectedOffer.offer_id}:asking-price`, selectedOffer.price_amount),
          ...preferredSurfaceEvidence(property),
        ],
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
  if (selectedOffer && minFact && maxFact && isPositiveFinite(minFact.value) && isPositiveFinite(maxFact.value)) {
    evaluatedChecks.push("price_range_order_conflict");
    const minValue = minFact.value;
    const maxValue = maxFact.value;
    if (minValue > maxValue) {
      signals.push({
        code: "price_range_order_conflict",
        label: "Fourchette de prix incohérente",
        explanation: "La borne minimale déclarée de la fourchette est supérieure à la borne maximale.",
        severity: "high",
        confidence: "high",
        evidence: [
          ...publicFactEvidence(`${selectedOffer.offer_id}:price-range-min`, minFact),
          ...publicFactEvidence(`${selectedOffer.offer_id}:price-range-max`, maxFact),
        ],
        metrics: { min_price_mad: minValue, max_price_mad: maxValue },
        limitations: [
          "Le signal décrit une incohérence de structure de données et ne permet pas de déterminer quelle borne est correcte.",
        ],
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
          evidence: [
            metadataEvidence(
              `${selectedOffer.offer_id}:observation-window`,
              selectedOffer.source_url,
              selectedOffer.last_observed_at,
            ),
          ],
          metrics: {
            first_observed_at: selectedOffer.first_observed_at,
            last_observed_at: selectedOffer.last_observed_at,
          },
          limitations: [
            "Le signal peut provenir d'un problème de migration ou de synchronisation des métadonnées temporelles.",
          ],
        });
      }
      if (generated != null) {
        const toleranceMs = 86_400_000;
        const hasFuture = (first != null && first > generated + toleranceMs) || (last != null && last > generated + toleranceMs);
        if (hasFuture) {
          signals.push({
            code: "future_observation_timestamp",
            label: "Horodatage d'observation futur",
            explanation: "Une date d'observation est située dans le futur au-delà de la tolérance de synchronisation.",
            severity: "medium",
            confidence: "high",
            evidence: [
              metadataEvidence(
                `${selectedOffer.offer_id}:future-observation`,
                selectedOffer.source_url,
                selectedOffer.last_observed_at,
              ),
            ],
            metrics: {
              generated_at: generatedAt,
              first_observed_at: selectedOffer.first_observed_at,
              last_observed_at: selectedOffer.last_observed_at,
            },
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
    const unavailableState =
      selectedOffer.availability_status === "sold" ||
      selectedOffer.availability_status === "rented" ||
      selectedOffer.availability_status === "withdrawn";
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
        metrics: {
          offer_status: selectedOffer.offer_status,
          availability_status: selectedOffer.availability_status,
        },
        limitations: ["Le signal peut refléter un délai de synchronisation entre deux champs de statut."],
      });
    }
  } else {
    unavailableChecks.push("offer_lifecycle_conflict");
  }

  // 5) Conservative surface divergence for unit-like property types only.
  const propertyType = property.facts.classification.property_type.value;
  const totalFact = property.facts.surfaces.surface_total_m2;
  const habitableFact = property.facts.surfaces.surface_habitable_m2;
  const builtFact = property.facts.surfaces.surface_built_m2;
  if (isUnitLikeProperty(propertyType)) {
    const total = totalFact?.value;
    const habitable = habitableFact?.value;
    const built = builtFact?.value;
    const hasHabitablePair = totalFact && habitableFact && isPositiveFinite(total) && isPositiveFinite(habitable);
    const hasBuiltPair = totalFact && builtFact && isPositiveFinite(total) && isPositiveFinite(built);
    if (hasHabitablePair || hasBuiltPair) {
      evaluatedChecks.push("surface_fact_divergence");
      if (hasHabitablePair && habitable > total * 1.3) {
        signals.push({
          code: "surface_fact_divergence",
          label: "Surfaces déclarées fortement divergentes",
          explanation: "La surface habitable déclarée dépasse fortement la surface totale déclarée.",
          severity: "medium",
          confidence: "medium",
          evidence: [
            ...publicFactEvidence(`${property.property_id}:surface_habitable_m2`, habitableFact),
            ...publicFactEvidence(`${property.property_id}:surface_total_m2`, totalFact),
          ],
          metrics: {
            comparison: "habitable_vs_total",
            larger_surface_m2: habitable,
            base_surface_m2: total,
            ratio: round1(habitable / total),
          },
          limitations: [
            "Les conventions de surface peuvent varier selon la source ; ce signal demande une vérification du sens exact de chaque surface.",
          ],
        });
      } else if (hasBuiltPair && built > total * 1.5) {
        signals.push({
          code: "surface_fact_divergence",
          label: "Surfaces déclarées fortement divergentes",
          explanation: "La surface construite déclarée dépasse fortement la surface totale déclarée.",
          severity: "medium",
          confidence: "medium",
          evidence: [
            ...publicFactEvidence(`${property.property_id}:surface_built_m2`, builtFact),
            ...publicFactEvidence(`${property.property_id}:surface_total_m2`, totalFact),
          ],
          metrics: {
            comparison: "built_vs_total",
            larger_surface_m2: built,
            base_surface_m2: total,
            ratio: round1(built / total),
          },
          limitations: [
            "Les conventions de surface peuvent varier selon la source ; ce signal demande une vérification du sens exact de chaque surface.",
          ],
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
    const sorted = [...pricedOffers].sort((a, b) => Number(a.price_amount.value) - Number(b.price_amount.value));
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    const lowPrice = low?.price_amount.value;
    const highPrice = high?.price_amount.value;
    if (low && high && isPositiveFinite(lowPrice) && isPositiveFinite(highPrice)) {
      const gap = percentDifference(lowPrice, highPrice);
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
            lowest_price_mad: lowPrice,
            highest_price_mad: highPrice,
            divergence_percent: round1(gap),
            offer_count: pricedOffers.length,
          },
          limitations: [
            "Le signal suppose que le rattachement canonique des offres au même bien est correct ; la consolidation multi-source est évaluée séparément.",
          ],
        });
      }
    }
  } else {
    unavailableChecks.push("multi_offer_price_divergence");
  }

  // 7) Abrupt real observed price movement. History is optional and never synthesized.
  const history = (context.price_history ?? [])
    .filter((point) => isPositiveFinite(point.price_mad) && parseTime(point.observed_at) != null)
    .sort((a, b) => Number(parseTime(a.observed_at)) - Number(parseTime(b.observed_at)));
  if (history.length >= 2) {
    evaluatedChecks.push("abrupt_price_change");
    let strongest: {
      previous: AnomalyPriceObservationV1;
      current: AnomalyPriceObservationV1;
      change: number;
      days: number;
    } | null = null;

    for (let index = 1; index < history.length; index += 1) {
      const previous = history[index - 1];
      const current = history[index];
      if (!previous || !current || !isPositiveFinite(previous.price_mad) || !isPositiveFinite(current.price_mad)) continue;
      const previousTime = parseTime(previous.observed_at);
      const currentTime = parseTime(current.observed_at);
      if (previousTime == null || currentTime == null) continue;
      const days = (currentTime - previousTime) / 86_400_000;
      if (days < 0 || days > 30) continue;
      const change = percentDifference(previous.price_mad, current.price_mad);
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
          metadataEvidence(
            `${property.property_id}:price-history:previous`,
            strongest.previous.source_ref ?? null,
            strongest.previous.observed_at,
            "medium",
          ),
          metadataEvidence(
            `${property.property_id}:price-history:current`,
            strongest.current.source_ref ?? null,
            strongest.current.observed_at,
            "medium",
          ),
        ],
        metrics: {
          previous_price_mad: strongest.previous.price_mad,
          current_price_mad: strongest.current.price_mad,
          change_percent: round1(strongest.change),
          elapsed_days: round1(strongest.days),
        },
        limitations: [
          "Une variation rapide peut correspondre à une correction d'annonce, une négociation commerciale ou un changement de périmètre de l'offre.",
        ],
      });
    }
  } else {
    unavailableChecks.push("abrupt_price_change");
  }

  const status: AnomalyStatus = evaluatedChecks.length > 0 ? "evaluated" : "insufficient_data";
  const anomalyScore =
    status === "evaluated"
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
