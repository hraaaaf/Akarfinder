import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fact } from "../../../lib/property-schema/core.js";
import {
  ANALYSIS_CONTRACT_VERSION,
  LEGACY_RELIABILITY_POLICY,
  assessMarketComparisonEligibility,
  capabilityFromFact,
  createUnavailableClaim,
  evidenceFromFact,
  validateAnalysisClaim,
  type AnalysisClaimV1,
  type AnalysisDomain,
  type AnalysisEvidenceV1,
} from "../../../lib/analysis/analysis-contract.js";

const NOW = "2026-07-21T18:30:00.000Z";

function publicEvidence(id = "e-1"): AnalysisEvidenceV1 {
  return {
    evidence_id: id,
    provenance: "DECLARED",
    confidence: "high",
    verification_status: "unverified",
    visibility: "PUBLIC",
    source_ref: "partner:test",
    observed_at: NOW,
    public_usable: true,
  };
}

function claim(
  domain: AnalysisDomain,
  overrides: Partial<AnalysisClaimV1> = {},
): AnalysisClaimV1 {
  return {
    contract_version: ANALYSIS_CONTRACT_VERSION,
    claim_id: `claim-${domain}`,
    domain,
    label: "Signal indicatif",
    explanation: "Conclusion limitée aux éléments effectivement disponibles.",
    strength: "indicative",
    confidence: "medium",
    evidence: [publicEvidence()],
    assumptions: [],
    limitations: ["À confirmer avec des informations complémentaires."],
    generated_at: NOW,
    ...overrides,
  };
}

describe("#11 ANALYSIS CONTRACT — fact capability", () => {
  it("never upgrades a high-confidence declaration into a verified fact", () => {
    const capability = capabilityFromFact(
      fact("120 m²", {
        provenance: "DECLARED",
        confidence: "high",
        verification_status: "unverified",
        visibility: "PUBLIC",
      }),
    );
    assert.equal(capability.strength, "declared");
    assert.equal(capability.confidence, "high");
    assert.equal(capability.qualifier, "déclaré");
  });

  it("allows verified strength only for a verified document fact", () => {
    const capability = capabilityFromFact(
      fact("Titre disponible", {
        provenance: "VERIFIED_DOCUMENT",
        confidence: "high",
        verification_status: "verified",
        visibility: "PUBLIC",
      }),
    );
    assert.equal(capability.strength, "verified");
    assert.equal(capability.can_publish, true);
  });

  it("treats a supplied but unverified document as observed, not verified", () => {
    const capability = capabilityFromFact(
      fact("Document reçu", {
        provenance: "VERIFIED_DOCUMENT",
        confidence: "high",
        verification_status: "unverified",
        visibility: "PUBLIC",
      }),
    );
    assert.equal(capability.strength, "observed");
    assert.notEqual(capability.strength, "verified");
  });

  it("caps inferred facts at medium confidence", () => {
    const capability = capabilityFromFact(
      fact("Probable", {
        provenance: "INFERRED",
        confidence: "high",
        visibility: "PUBLIC",
      }),
    );
    assert.equal(capability.strength, "inferred");
    assert.equal(capability.confidence, "medium");
  });

  it("suppresses disputed and non-public facts from assertive public claims", () => {
    const disputed = capabilityFromFact(
      fact("120", {
        provenance: "DECLARED",
        confidence: "high",
        verification_status: "disputed",
        visibility: "PUBLIC",
      }),
    );
    const internal = capabilityFromFact(
      fact("secret", {
        provenance: "DECLARED",
        confidence: "high",
        visibility: "INTERNAL",
      }),
    );
    assert.equal(disputed.can_publish, false);
    assert.equal(disputed.strength, "unavailable");
    assert.equal(internal.can_publish, false);
  });

  it("maps market-derived facts to indicative, never verified", () => {
    const capability = capabilityFromFact(
      fact(12_500, {
        provenance: "DERIVED_MARKET",
        confidence: "high",
        visibility: "PUBLIC",
      }),
    );
    assert.equal(capability.strength, "indicative");
  });
});

describe("#11 ANALYSIS CONTRACT — market eligibility", () => {
  it("allows only supported property types with positive price/surface and a benchmark", () => {
    const eligible = assessMarketComparisonEligibility({
      property_type: "apartment",
      price_amount: 1_200_000,
      surface_m2: 100,
      benchmark_scope: "neighborhood",
    });
    assert.equal(eligible.eligible, true);
    assert.equal(eligible.strength, "indicative");
    assert.equal(eligible.confidence, "high");

    const land = assessMarketComparisonEligibility({
      property_type: "land",
      price_amount: 1_200_000,
      surface_m2: 100,
      benchmark_scope: "city",
    });
    assert.equal(land.eligible, false);
    assert.equal(land.confidence, "insufficient");
  });

  it("returns insufficient when price, surface or benchmark is missing", () => {
    assert.equal(
      assessMarketComparisonEligibility({
        property_type: "villa",
        price_amount: null,
        surface_m2: 300,
        benchmark_scope: "city",
      }).eligible,
      false,
    );
  });
});

describe("#11 ANALYSIS CONTRACT — public language and domain boundaries", () => {
  it("rejects market overclaims such as good-deal or official-price wording", () => {
    const validation = validateAnalysisClaim(
      claim("market_position", {
        label: "Bonne affaire",
        explanation: "Le prix officiel confirme que ce bien est sous-évalué.",
      }),
    );
    assert.equal(validation.valid, false);
    assert.equal(validation.issues.some((issue) => issue.code === "forbidden_absolute_language"), true);
    assert.equal(validation.issues.some((issue) => issue.code === "forbidden_domain_language"), true);
  });

  it("rejects completeness being presented as reliability or verification", () => {
    const validation = validateAnalysisClaim(
      claim("information_completeness", {
        strength: "calculated",
        label: "Annonce fiable",
        explanation: "Les informations sont vérifiées grâce au taux de complétude.",
      }),
    );
    assert.equal(validation.valid, false);
  });

  it("rejects freshness being converted into an availability assertion", () => {
    const validation = validateAnalysisClaim(
      claim("freshness", {
        strength: "observed",
        label: "Encore disponible",
        explanation: "L'annonce a été observée récemment.",
      }),
    );
    assert.equal(validation.valid, false);
  });

  it("rejects duplicate signals being promoted to same-property certainty", () => {
    const validation = validateAnalysisClaim(
      claim("duplicate_signal", {
        strength: "inferred",
        label: "Même bien",
        explanation: "Le moteur a détecté une forte similarité.",
      }),
    );
    assert.equal(validation.valid, false);
  });

  it("rejects anomaly signals being presented as fraud", () => {
    const validation = validateAnalysisClaim(
      claim("anomaly_signal", {
        strength: "inferred",
        label: "Fraude",
        explanation: "Une anomalie statistique a été détectée.",
      }),
    );
    assert.equal(validation.valid, false);
  });

  it("rejects guaranteed investment language", () => {
    const validation = validateAnalysisClaim(
      claim("investment", {
        label: "Rendement garanti",
        explanation: "Projection basée sur des hypothèses de marché.",
      }),
    );
    assert.equal(validation.valid, false);
  });

  it("rejects a legacy reliability score as proof of truth", () => {
    assert.equal(LEGACY_RELIABILITY_POLICY.public_truth_claim_allowed, false);
    const validation = validateAnalysisClaim(
      claim("legacy_reliability", {
        strength: "calculated",
        label: "Bien fiable et vérifié",
        explanation: "Le score garantit la véracité de l'annonce.",
      }),
    );
    assert.equal(validation.valid, false);
  });
});

describe("#11 ANALYSIS CONTRACT — verification and final conclusions", () => {
  it("requires verified-document evidence for verified legal wording", () => {
    const invalid = validateAnalysisClaim(
      claim("legal", {
        strength: "declared",
        label: "Titre vérifié",
        explanation: "Le vendeur a déclaré disposer d'un titre.",
      }),
    );
    assert.equal(invalid.valid, false);

    const verifiedEvidence = evidenceFromFact(
      "legal-doc",
      fact("titre", {
        provenance: "VERIFIED_DOCUMENT",
        confidence: "high",
        verification_status: "verified",
        visibility: "PUBLIC",
      }),
    );
    const valid = validateAnalysisClaim(
      claim("legal", {
        strength: "verified",
        confidence: "high",
        label: "Document de titre vérifié",
        explanation: "La vérification porte uniquement sur le document fourni et son périmètre contrôlé.",
        evidence: [verifiedEvidence],
      }),
    );
    assert.equal(valid.valid, true);
  });

  it("requires at least two evidence items and explicit limitations for a final conclusion", () => {
    const insufficient = validateAnalysisClaim(
      claim("final_conclusion", {
        evidence: [publicEvidence("one")],
        limitations: [],
      }),
    );
    assert.equal(insufficient.valid, false);
    assert.equal(
      insufficient.issues.some((issue) => issue.code === "final_conclusion_insufficient_evidence"),
      true,
    );
    assert.equal(
      insufficient.issues.some((issue) => issue.code === "final_conclusion_missing_limitations"),
      true,
    );

    const valid = validateAnalysisClaim(
      claim("final_conclusion", {
        label: "Profil global à examiner",
        explanation: "Le prix relatif et le niveau d'information fournissent des signaux utiles, avec des limites explicites.",
        evidence: [publicEvidence("price"), publicEvidence("completeness")],
        limitations: ["Disponibilité non confirmée.", "Situation juridique non évaluée."],
      }),
    );
    assert.equal(valid.valid, true);
  });

  it("allows an explicit insufficient-data conclusion instead of inventing a result", () => {
    const unavailable = createUnavailableClaim({
      claim_id: "missing-market-data",
      domain: "market_position",
      explanation: "Aucun repère compatible ne permet une comparaison publique.",
      generated_at: NOW,
    });
    const validation = validateAnalysisClaim(unavailable);
    assert.equal(validation.valid, true);
    assert.equal(unavailable.strength, "unavailable");
    assert.equal(unavailable.confidence, "insufficient");
  });
});
