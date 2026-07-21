import type {
  CanonicalFact,
  FactConfidence,
  FactVerificationStatus,
  FactVisibility,
  ProvenanceKind,
} from "../property-schema/core";

export const ANALYSIS_CONTRACT_VERSION = "1.0" as const;

export type AnalysisDomain =
  | "property_fact"
  | "market_position"
  | "information_completeness"
  | "information_quality"
  | "legacy_reliability"
  | "freshness"
  | "duplicate_signal"
  | "anomaly_signal"
  | "legal"
  | "geo"
  | "investment"
  | "property_fit"
  | "final_conclusion";

export type AnalysisClaimStrength =
  | "observed"
  | "declared"
  | "verified"
  | "calculated"
  | "indicative"
  | "inferred"
  | "unavailable";

export type AnalysisConfidence = "high" | "medium" | "low" | "insufficient";

export interface AnalysisEvidenceV1 {
  evidence_id: string;
  provenance: ProvenanceKind;
  confidence: FactConfidence;
  verification_status: FactVerificationStatus;
  visibility: FactVisibility;
  source_ref: string | null;
  observed_at: string | null;
  public_usable: boolean;
}

export interface AnalysisClaimV1 {
  contract_version: typeof ANALYSIS_CONTRACT_VERSION;
  claim_id: string;
  domain: AnalysisDomain;
  label: string;
  explanation: string;
  strength: AnalysisClaimStrength;
  confidence: AnalysisConfidence;
  evidence: AnalysisEvidenceV1[];
  assumptions: string[];
  limitations: string[];
  generated_at: string;
}

export interface ClaimCapabilityV1 {
  strength: AnalysisClaimStrength;
  confidence: AnalysisConfidence;
  can_publish: boolean;
  qualifier: string | null;
  reason: string;
}

export interface AnalysisContractIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface AnalysisContractValidation {
  valid: boolean;
  public_allowed: boolean;
  issues: AnalysisContractIssue[];
}

type DomainPolicy = {
  allowed_strengths: readonly AnalysisClaimStrength[];
  forbidden_phrases?: readonly string[];
};

export const LEGACY_RELIABILITY_POLICY = {
  public_truth_claim_allowed: false,
  interpretation: "information_quality_only",
  reason:
    "The legacy reliability score mixes completeness, field extraction confidence, price/surface presence, seller/media presence and duplicate signals. It is not proof that a property fact is true or verified.",
} as const;

export const ANALYSIS_DOMAIN_POLICY: Readonly<Record<AnalysisDomain, DomainPolicy>> = {
  property_fact: {
    allowed_strengths: ["observed", "declared", "verified", "calculated", "inferred", "unavailable"],
  },
  market_position: {
    allowed_strengths: ["indicative", "unavailable"],
    forbidden_phrases: ["bonne affaire", "surcoté", "surcote", "trop cher", "juste prix"],
  },
  information_completeness: {
    allowed_strengths: ["calculated", "unavailable"],
    forbidden_phrases: ["fiable", "fiabilité", "fiabilite", "certifié", "certifie", "vérifié", "verifie"],
  },
  information_quality: {
    allowed_strengths: ["calculated", "indicative", "unavailable"],
    forbidden_phrases: ["certifié", "certifie", "garanti", "preuve de vérité", "preuve de verite"],
  },
  legacy_reliability: {
    allowed_strengths: ["calculated", "unavailable"],
    forbidden_phrases: ["fiable", "fiabilité", "fiabilite", "vérifié", "verifie", "certifié", "certifie", "garanti"],
  },
  freshness: {
    allowed_strengths: ["observed", "calculated", "unavailable"],
    forbidden_phrases: ["toujours disponible", "encore disponible", "disponible aujourd'hui", "disponible aujourd’hui"],
  },
  duplicate_signal: {
    allowed_strengths: ["inferred", "unavailable"],
    forbidden_phrases: ["même bien", "meme bien", "doublon certain", "identique avec certitude"],
  },
  anomaly_signal: {
    allowed_strengths: ["inferred", "unavailable"],
    forbidden_phrases: ["fraude", "arnaque", "mensonge", "faux prix"],
  },
  legal: {
    allowed_strengths: ["declared", "verified", "unavailable"],
  },
  geo: {
    allowed_strengths: ["declared", "verified", "calculated", "unavailable"],
  },
  investment: {
    allowed_strengths: ["indicative", "inferred", "unavailable"],
    forbidden_phrases: ["rendement garanti", "rentabilité garantie", "rentabilite garantie", "investissement sûr", "investissement sur"],
  },
  property_fit: {
    allowed_strengths: ["calculated", "indicative", "unavailable"],
    forbidden_phrases: ["meilleur bien", "parfait pour vous", "choix idéal garanti", "choix ideal garanti"],
  },
  final_conclusion: {
    allowed_strengths: ["indicative", "inferred", "unavailable"],
    forbidden_phrases: ["achetez ce bien", "n'achetez pas", "n’achetez pas", "sans risque", "garanti"],
  },
};

const GLOBAL_FORBIDDEN_PHRASES = [
  "prix officiel",
  "prix certifié",
  "prix certifie",
  "prix vérifié",
  "prix verifie",
  "prix garanti",
  "prix exact",
  "prix réel",
  "prix reel",
  "bonne affaire garantie",
  "sans risque",
  "fraude confirmée",
  "fraude confirmee",
  "certifié par akarfinder",
  "certifie par akarfinder",
] as const;

function confidenceFromFact(confidence: FactConfidence): AnalysisConfidence {
  if (confidence === "unknown") return "insufficient";
  return confidence;
}

function capConfidence(
  confidence: AnalysisConfidence,
  max: Exclude<AnalysisConfidence, "insufficient">,
): AnalysisConfidence {
  const rank: Record<AnalysisConfidence, number> = {
    insufficient: 0,
    low: 1,
    medium: 2,
    high: 3,
  };
  return rank[confidence] > rank[max] ? max : confidence;
}

export function evidenceFromFact<T>(evidenceId: string, fact: CanonicalFact<T>): AnalysisEvidenceV1 {
  return {
    evidence_id: evidenceId,
    provenance: fact.provenance,
    confidence: fact.confidence,
    verification_status: fact.verification_status,
    visibility: fact.visibility,
    source_ref: fact.source_ref,
    observed_at: fact.observed_at,
    public_usable: fact.visibility === "PUBLIC" && fact.value !== null,
  };
}

export function capabilityFromFact<T>(fact: CanonicalFact<T>): ClaimCapabilityV1 {
  if (fact.value === null) {
    return {
      strength: "unavailable",
      confidence: "insufficient",
      can_publish: true,
      qualifier: null,
      reason: "No value is available. The safe public conclusion is that the information is unavailable.",
    };
  }

  if (fact.visibility !== "PUBLIC") {
    return {
      strength: "unavailable",
      confidence: "insufficient",
      can_publish: false,
      qualifier: null,
      reason: "The source fact is not public and cannot be exposed through a public analysis claim.",
    };
  }

  if (fact.verification_status === "disputed") {
    return {
      strength: "unavailable",
      confidence: "low",
      can_publish: false,
      qualifier: "information contradictoire",
      reason: "A disputed fact cannot support an assertive public conclusion.",
    };
  }

  const baseConfidence = confidenceFromFact(fact.confidence);

  switch (fact.provenance) {
    case "VERIFIED_DOCUMENT":
      if (fact.verification_status === "verified") {
        return {
          strength: "verified",
          confidence: baseConfidence === "insufficient" ? "medium" : baseConfidence,
          can_publish: true,
          qualifier: null,
          reason: "The fact is supported by a verified document within its verification scope.",
        };
      }
      return {
        strength: "observed",
        confidence: capConfidence(baseConfidence, "medium"),
        can_publish: true,
        qualifier: "document fourni, vérification non finalisée",
        reason: "A document exists, but its content has not been verified strongly enough for a verified claim.",
      };
    case "DECLARED":
      return {
        strength: "declared",
        confidence: baseConfidence,
        can_publish: true,
        qualifier: "déclaré",
        reason: "Confidence describes confidence that the declaration was captured correctly, not that the underlying fact is true.",
      };
    case "DERIVED_GEO":
      return {
        strength: "calculated",
        confidence: baseConfidence,
        can_publish: true,
        qualifier: "localisation calculée",
        reason: "Derived geolocation is a calculation and must preserve its precision level.",
      };
    case "DERIVED_MARKET":
      return {
        strength: "indicative",
        confidence: baseConfidence,
        can_publish: true,
        qualifier: "repère indicatif",
        reason: "Market-derived information is comparative and indicative, never an official or exact property value.",
      };
    case "INFERRED":
      return {
        strength: "inferred",
        confidence: capConfidence(baseConfidence, "medium"),
        can_publish: true,
        qualifier: "à confirmer",
        reason: "An inferred fact is a hypothesis and cannot be promoted to verified truth without stronger evidence.",
      };
  }
}

function allClaimText(claim: AnalysisClaimV1): string {
  return [claim.label, claim.explanation, ...claim.assumptions, ...claim.limitations].join(" ").toLowerCase();
}

function containsPhrase(text: string, phrase: string): boolean {
  return text.includes(phrase.toLowerCase());
}

function hasVerifiedDocumentEvidence(claim: AnalysisClaimV1): boolean {
  return claim.evidence.some(
    (evidence) =>
      evidence.provenance === "VERIFIED_DOCUMENT" &&
      evidence.verification_status === "verified" &&
      evidence.public_usable,
  );
}

export function validateAnalysisClaim(claim: AnalysisClaimV1): AnalysisContractValidation {
  const issues: AnalysisContractIssue[] = [];
  const policy = ANALYSIS_DOMAIN_POLICY[claim.domain];
  const text = allClaimText(claim);

  if (!claim.label.trim() || !claim.explanation.trim()) {
    issues.push({ code: "missing_claim_text", severity: "error", message: "A public claim needs a label and an explanation." });
  }

  if (!policy.allowed_strengths.includes(claim.strength)) {
    issues.push({
      code: "strength_not_allowed_for_domain",
      severity: "error",
      message: `${claim.strength} is not allowed for ${claim.domain}.`,
    });
  }

  if (claim.strength !== "unavailable" && claim.evidence.length === 0) {
    issues.push({ code: "missing_evidence", severity: "error", message: "A non-empty conclusion must cite evidence." });
  }

  if (claim.strength !== "unavailable" && claim.evidence.some((evidence) => !evidence.public_usable)) {
    issues.push({
      code: "non_public_evidence",
      severity: "error",
      message: "A public claim cannot expose or depend directly on evidence marked non-public by this contract.",
    });
  }

  if (claim.strength === "verified" && !hasVerifiedDocumentEvidence(claim)) {
    issues.push({
      code: "verified_without_verified_document",
      severity: "error",
      message: "A verified claim requires public-usable VERIFIED_DOCUMENT evidence with verification_status=verified.",
    });
  }

  for (const phrase of GLOBAL_FORBIDDEN_PHRASES) {
    if (containsPhrase(text, phrase)) {
      issues.push({ code: "forbidden_absolute_language", severity: "error", message: `Forbidden public wording: ${phrase}` });
    }
  }

  for (const phrase of policy.forbidden_phrases ?? []) {
    if (containsPhrase(text, phrase)) {
      issues.push({ code: "forbidden_domain_language", severity: "error", message: `Forbidden wording for ${claim.domain}: ${phrase}` });
    }
  }

  if (claim.domain === "legal" && /(vérifié|verifie|confirmé|confirme|certifié|certifie)/.test(text) && claim.strength !== "verified") {
    issues.push({
      code: "legal_verification_overclaim",
      severity: "error",
      message: "Legal verification wording requires a verified legal claim supported by verified-document evidence.",
    });
  }

  if (claim.domain === "geo" && /(adresse exacte vérifiée|adresse exacte verifiee)/.test(text) && claim.strength !== "verified") {
    issues.push({
      code: "exact_geo_overclaim",
      severity: "error",
      message: "An exact verified address claim requires verified evidence; centroids and inferred coordinates are not exact addresses.",
    });
  }

  if (claim.domain === "final_conclusion" && claim.strength !== "unavailable") {
    if (claim.evidence.length < 2) {
      issues.push({
        code: "final_conclusion_insufficient_evidence",
        severity: "error",
        message: "A final conclusion needs at least two supporting evidence items; one signal cannot become a global verdict.",
      });
    }
    if (claim.limitations.length === 0) {
      issues.push({
        code: "final_conclusion_missing_limitations",
        severity: "error",
        message: "A final conclusion must surface material limitations instead of hiding uncertainty.",
      });
    }
  }

  if (claim.confidence === "insufficient" && claim.strength !== "unavailable") {
    issues.push({
      code: "insufficient_confidence_for_claim",
      severity: "error",
      message: "Insufficient confidence can only support an unavailable/insufficient-data conclusion.",
    });
  }

  const valid = !issues.some((issue) => issue.severity === "error");
  return { valid, public_allowed: valid, issues };
}

export interface MarketComparisonEligibilityInput {
  property_type: string | null | undefined;
  price_amount: number | null | undefined;
  surface_m2: number | null | undefined;
  benchmark_scope: "neighborhood" | "city" | null | undefined;
}

export interface MarketComparisonEligibility {
  eligible: boolean;
  strength: "indicative" | "unavailable";
  confidence: AnalysisConfidence;
  reason: string;
}

export function assessMarketComparisonEligibility(input: MarketComparisonEligibilityInput): MarketComparisonEligibility {
  const propertyType = (input.property_type ?? "").trim().toLowerCase();
  const supported = ["apartment", "appartement", "villa"].includes(propertyType);
  const priceOk = typeof input.price_amount === "number" && Number.isFinite(input.price_amount) && input.price_amount > 0;
  const surfaceOk = typeof input.surface_m2 === "number" && Number.isFinite(input.surface_m2) && input.surface_m2 > 0;

  if (!supported || !priceOk || !surfaceOk || !input.benchmark_scope) {
    return {
      eligible: false,
      strength: "unavailable",
      confidence: "insufficient",
      reason: "A public market-position claim requires a supported property type, positive price, positive surface and an identified benchmark.",
    };
  }

  return {
    eligible: true,
    strength: "indicative",
    confidence: input.benchmark_scope === "neighborhood" ? "high" : "medium",
    reason: "The comparison is eligible as an indicative relative-position signal only; it is not an official valuation or a purchase recommendation.",
  };
}

export function createUnavailableClaim(input: {
  claim_id: string;
  domain: AnalysisDomain;
  label?: string;
  explanation: string;
  generated_at?: string;
}): AnalysisClaimV1 {
  return {
    contract_version: ANALYSIS_CONTRACT_VERSION,
    claim_id: input.claim_id,
    domain: input.domain,
    label: input.label ?? "Données insuffisantes",
    explanation: input.explanation,
    strength: "unavailable",
    confidence: "insufficient",
    evidence: [],
    assumptions: [],
    limitations: [],
    generated_at: input.generated_at ?? new Date().toISOString(),
  };
}
