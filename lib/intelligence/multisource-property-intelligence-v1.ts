import {
  createUnavailableClaim,
  evidenceFromFact,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisContractValidation,
  type AnalysisEvidenceV1,
} from "../analysis/analysis-contract";
import type { CanonicalOfferV1, CanonicalPropertyV1 } from "../property-schema/core";

export const MULTISOURCE_PROPERTY_INTELLIGENCE_VERSION = "1.0" as const;

export type MultiSourceAssociationBasis =
  | "manual_review"
  | "explicit_partner_identifier"
  | "deterministic_same_source_identifier"
  | "url_duplicate"
  | "same_source_offer"
  | "cross_source_high_confidence"
  | "possible_match"
  | "legacy_one_to_one_projection"
  | "unknown";

export interface MultiSourceAssociationEvidenceV1 {
  offer_a_id: string;
  offer_b_id: string;
  basis: MultiSourceAssociationBasis;
  matched_signals?: string[];
  contradicting_signals?: string[];
  source_ref?: string | null;
  observed_at?: string | null;
}

export interface MultiSourcePropertyContextV1 {
  associations?: MultiSourceAssociationEvidenceV1[];
}

export type MultiSourceLinkageLevel =
  | "explicitly_supported"
  | "strong_candidate"
  | "possible_candidate"
  | "unresolved";

export type MultiSourceConfidence = "high" | "medium" | "low" | "insufficient";

export interface MultiSourceDivergenceV1 {
  code: "asking_price" | "availability" | "transaction_type" | "compliance_status";
  severity: "low" | "medium" | "high";
  explanation: string;
  offer_ids: string[];
  metrics: Record<string, number | string | boolean | null>;
}

export interface MultiSourcePropertyIntelligenceV1 {
  version: typeof MULTISOURCE_PROPERTY_INTELLIGENCE_VERSION;
  status: "evaluated" | "insufficient_data";
  offer_count: number;
  active_offer_count: number;
  source_count: number;
  is_multi_source: boolean;
  linkage: {
    level: MultiSourceLinkageLevel;
    confidence: MultiSourceConfidence;
    confidence_score: number | null;
    association_evidence_count: number;
    strong_component_coverage: number | null;
    contradictions_present: boolean;
  };
  price_summary: {
    priced_active_offer_count: number;
    min_asking_price_mad: number | null;
    max_asking_price_mad: number | null;
    spread_percent: number | null;
  };
  availability_states: string[];
  transaction_types: string[];
  divergences: MultiSourceDivergenceV1[];
  claim: AnalysisClaimV1;
  contract_validation: AnalysisContractValidation;
  limitations: string[];
  generated_at: string;
}

type WeightedAssociation = MultiSourceAssociationEvidenceV1 & { score: number; valid_for_strong_linkage: boolean };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function positivePrice(offer: CanonicalOfferV1): number | null {
  const value = offer.price_amount.value;
  return offer.price_status === "valid" && typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function associationScore(evidence: MultiSourceAssociationEvidenceV1): WeightedAssociation {
  const contradictions = evidence.contradicting_signals ?? [];
  const matched = new Set(evidence.matched_signals ?? []);
  const corroborating = ["district", "surface_m2", "price_mad", "bedrooms_count"].filter((signal) => matched.has(signal)).length;

  switch (evidence.basis) {
    case "manual_review":
    case "explicit_partner_identifier":
      return { ...evidence, score: contradictions.length === 0 ? 100 : 45, valid_for_strong_linkage: contradictions.length === 0 };
    case "deterministic_same_source_identifier":
    case "url_duplicate":
    case "same_source_offer":
      // Strong record-level linkage, but not by itself proof of physical-property identity.
      return { ...evidence, score: contradictions.length === 0 ? 90 : 40, valid_for_strong_linkage: contradictions.length === 0 };
    case "cross_source_high_confidence": {
      const valid = contradictions.length === 0 && corroborating >= 3;
      return { ...evidence, score: valid ? 75 : 35, valid_for_strong_linkage: valid };
    }
    case "legacy_one_to_one_projection":
      return { ...evidence, score: 55, valid_for_strong_linkage: false };
    case "possible_match":
      return { ...evidence, score: contradictions.length === 0 ? 35 : 20, valid_for_strong_linkage: false };
    case "unknown":
      return { ...evidence, score: 0, valid_for_strong_linkage: false };
  }
}

function largestStrongComponentCoverage(offerIds: string[], edges: WeightedAssociation[]): number | null {
  if (offerIds.length < 2) return null;
  const parent = new Map(offerIds.map((id) => [id, id]));
  const find = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  for (const edge of edges.filter((item) => item.valid_for_strong_linkage)) union(edge.offer_a_id, edge.offer_b_id);
  const counts = new Map<string, number>();
  for (const id of offerIds) {
    const root = find(id);
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  const largest = Math.max(...counts.values());
  return round1(largest / offerIds.length);
}

function publicEvidenceForOffers(property: CanonicalPropertyV1, offerIds: Set<string>): AnalysisEvidenceV1[] {
  const evidence: AnalysisEvidenceV1[] = [];
  for (const offer of property.offers) {
    if (!offerIds.has(offer.offer_id)) continue;
    if (offer.title.value != null && offer.title.visibility === "PUBLIC") {
      evidence.push(evidenceFromFact(`${offer.offer_id}:title`, offer.title));
    } else if (offer.price_amount.value != null && offer.price_amount.visibility === "PUBLIC") {
      evidence.push(evidenceFromFact(`${offer.offer_id}:price`, offer.price_amount));
    }
  }
  return evidence;
}

function buildClaim(
  property: CanonicalPropertyV1,
  level: MultiSourceLinkageLevel,
  confidence: MultiSourceConfidence,
  associations: WeightedAssociation[],
  generatedAt: string,
): { claim: AnalysisClaimV1; validation: AnalysisContractValidation } {
  if (level === "unresolved" || associations.length === 0) {
    const claim = createUnavailableClaim({
      claim_id: `multisource:${property.property_id}`,
      domain: "duplicate_signal",
      label: "Rapprochement multi-source non établi",
      explanation: "Les données disponibles ne permettent pas de publier un rapprochement suffisamment étayé entre les offres rattachées à cette fiche canonique.",
      generated_at: generatedAt,
    });
    return { claim, validation: validateAnalysisClaim(claim) };
  }

  const linkedIds = new Set<string>();
  for (const association of associations) {
    linkedIds.add(association.offer_a_id);
    linkedIds.add(association.offer_b_id);
  }
  const evidence = publicEvidenceForOffers(property, linkedIds);
  if (evidence.length === 0) {
    const claim = createUnavailableClaim({
      claim_id: `multisource:${property.property_id}`,
      domain: "duplicate_signal",
      label: "Rapprochement multi-source non publiable",
      explanation: "Le rapprochement existe dans les données internes mais aucune preuve publique exploitable n'est disponible pour l'exposer.",
      generated_at: generatedAt,
    });
    return { claim, validation: validateAnalysisClaim(claim) };
  }

  const label = level === "explicitly_supported"
    ? "Rapprochement multi-source explicitement étayé"
    : level === "strong_candidate"
      ? "Rapprochement multi-source fortement étayé"
      : "Rapprochement multi-source possible à confirmer";

  const claim: AnalysisClaimV1 = {
    contract_version: "1.0",
    claim_id: `multisource:${property.property_id}`,
    domain: "duplicate_signal",
    label,
    explanation: "Plusieurs offres présentent des éléments de rapprochement documentés. Elles restent conservées séparément avec leurs prix, statuts, sources et divergences propres.",
    strength: "inferred",
    confidence: confidence === "insufficient" ? "low" : confidence,
    evidence,
    assumptions: ["Le rapprochement dépend des identifiants ou signaux explicitement fournis au moteur ; aucune fusion silencieuse n'est effectuée."],
    limitations: [
      "Un rapprochement ne prouve pas à lui seul l'identité physique du bien immobilier.",
      "Les divergences entre offres sont conservées et ne sont jamais écrasées pour fabriquer une valeur unique.",
    ],
    generated_at: generatedAt,
  };
  return { claim, validation: validateAnalysisClaim(claim) };
}

export function evaluateMultiSourcePropertyIntelligenceV1(
  property: CanonicalPropertyV1,
  generatedAt: string,
  context: MultiSourcePropertyContextV1 = {},
): MultiSourcePropertyIntelligenceV1 {
  const offers = property.offers;
  const offerIds = new Set(offers.map((offer) => offer.offer_id));
  const associations = (context.associations ?? [])
    .filter((item) => item.offer_a_id !== item.offer_b_id && offerIds.has(item.offer_a_id) && offerIds.has(item.offer_b_id))
    .map(associationScore);

  const activeOffers = offers.filter((offer) => offer.offer_status === "active");
  const sourceCount = new Set(offers.map((offer) => offer.source_id || offer.source_name).filter(Boolean)).size;
  const priced = activeOffers
    .map((offer) => ({ offer, price: positivePrice(offer) }))
    .filter((item): item is { offer: CanonicalOfferV1; price: number } => item.price != null);
  const prices = priced.map((item) => item.price);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const spreadPercent = minPrice != null && maxPrice != null && minPrice > 0 ? round1(((maxPrice - minPrice) / minPrice) * 100) : null;

  const divergences: MultiSourceDivergenceV1[] = [];
  if (priced.length >= 2 && spreadPercent != null && spreadPercent >= 10) {
    divergences.push({
      code: "asking_price",
      severity: spreadPercent >= 50 ? "high" : spreadPercent >= 25 ? "medium" : "low",
      explanation: `Les prix demandés actifs présentent environ ${spreadPercent} % d'écart entre le minimum et le maximum.`,
      offer_ids: priced.map((item) => item.offer.offer_id),
      metrics: { min_price_mad: minPrice, max_price_mad: maxPrice, spread_percent: spreadPercent },
    });
  }

  const availabilityStates = unique(activeOffers.map((offer) => offer.availability_status));
  if (availabilityStates.length > 1) {
    divergences.push({
      code: "availability",
      severity: "medium",
      explanation: "Les offres actives n'exposent pas toutes le même statut de disponibilité.",
      offer_ids: activeOffers.map((offer) => offer.offer_id),
      metrics: { distinct_state_count: availabilityStates.length },
    });
  }

  const transactionTypes = unique(activeOffers.map((offer) => offer.transaction_type));
  if (transactionTypes.length > 1) {
    divergences.push({
      code: "transaction_type",
      severity: "low",
      explanation: "Plusieurs types de transaction coexistent parmi les offres actives rattachées à la fiche canonique.",
      offer_ids: activeOffers.map((offer) => offer.offer_id),
      metrics: { distinct_transaction_count: transactionTypes.length },
    });
  }

  const complianceStates = unique(activeOffers.map((offer) => offer.compliance_status));
  if (complianceStates.length > 1) {
    divergences.push({
      code: "compliance_status",
      severity: "low",
      explanation: "Les offres actives ont des statuts de conformité d'affichage différents et doivent rester gouvernées séparément.",
      offer_ids: activeOffers.map((offer) => offer.offer_id),
      metrics: { distinct_compliance_count: complianceStates.length },
    });
  }

  const contradictionsPresent = associations.some((item) => (item.contradicting_signals ?? []).length > 0);
  const strongCoverage = largestStrongComponentCoverage(offers.map((offer) => offer.offer_id), associations);
  const strongAssociations = associations.filter((item) => item.valid_for_strong_linkage);
  const explicitAssociations = strongAssociations.filter((item) => item.basis === "manual_review" || item.basis === "explicit_partner_identifier");
  const possibleAssociations = associations.filter((item) => item.score > 0);

  let level: MultiSourceLinkageLevel = "unresolved";
  let confidence: MultiSourceConfidence = "insufficient";
  let confidenceScore: number | null = null;

  if (offers.length >= 2 && possibleAssociations.length > 0) {
    const average = round1(possibleAssociations.reduce((sum, item) => sum + item.score, 0) / possibleAssociations.length);
    confidenceScore = contradictionsPresent ? Math.min(49, average) : average;
    if (!contradictionsPresent && strongCoverage === 1 && explicitAssociations.length > 0 && explicitAssociations.length === strongAssociations.length) {
      level = "explicitly_supported";
      confidence = "high";
      confidenceScore = Math.max(confidenceScore, 95);
    } else if (!contradictionsPresent && strongCoverage === 1 && strongAssociations.length > 0) {
      level = "strong_candidate";
      confidence = "medium";
      confidenceScore = Math.max(confidenceScore, 70);
    } else {
      level = "possible_candidate";
      confidence = "low";
    }
  }

  const summary = buildClaim(property, level, confidence, associations.filter((item) => item.score > 0), generatedAt);
  const limitations = [
    "Les offres sources restent des objets séparés ; aucune divergence n'est écrasée par consolidation.",
    "La confiance de rapprochement n'est pas une probabilité de vérité et ne certifie pas l'identité physique d'un bien.",
    "Les signaux heuristiques issus du dédoublonnage restent inférieurs à un identifiant partenaire explicite ou à une revue humaine documentée.",
  ];

  return {
    version: MULTISOURCE_PROPERTY_INTELLIGENCE_VERSION,
    status: offers.length >= 2 ? "evaluated" : "insufficient_data",
    offer_count: offers.length,
    active_offer_count: activeOffers.length,
    source_count: sourceCount,
    is_multi_source: sourceCount >= 2,
    linkage: {
      level,
      confidence,
      confidence_score: confidenceScore,
      association_evidence_count: associations.length,
      strong_component_coverage: strongCoverage,
      contradictions_present: contradictionsPresent,
    },
    price_summary: {
      priced_active_offer_count: priced.length,
      min_asking_price_mad: minPrice,
      max_asking_price_mad: maxPrice,
      spread_percent: spreadPercent,
    },
    availability_states: availabilityStates,
    transaction_types: transactionTypes,
    divergences,
    claim: summary.claim,
    contract_validation: summary.validation,
    limitations,
    generated_at: generatedAt,
  };
}
