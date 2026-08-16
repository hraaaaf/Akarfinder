import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { PUBLIC_SERP_INTELLIGENCE_VERSION } from "@/lib/intelligence/public-serp-intelligence-types";
import { buildAkarInsightModel } from "@/lib/property-detail/akar-insight";
import { ANNOUNCEMENT_PAGE_TRUTH_CONTRACT_VERSION } from "@/lib/property-detail/announcement-page-truth-contract-v1";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

function detail(overrides: Partial<PublicPropertyDetailV2> = {}): PublicPropertyDetailV2 {
  const base: PublicPropertyDetailV2 = {
    version: "2.0",
    listing_id: "ann-l4-test",
    conclusion: {
      title: "Conclusion AkarFinder",
      summary: "Lecture documentaire de test.",
      akar_score: 82,
      akar_score_label: "Dossier bien documenté",
      coverage_label: "4/5 dimensions documentaires disponibles",
      attention_label: "1 point à examiner dans les données disponibles",
    },
    fit: {
      status: "not_calculated",
      label: "Compatibilité personnalisée non calculée",
      explanation: "Aucun profil explicite.",
    },
    market: {
      status: "available",
      label: "Prix demandé proche du repère indicatif",
      price_per_m2: 18_560,
    },
    facts: { essential: [], surfaces: [], layout: [], building: [], features: [] },
    environment: { city: "Rabat", district: "Agdal", geo_precision_label: null },
    costs: { status: "not_provided", label: "Coûts complémentaires non renseignés" },
    history: [],
    provenance: {
      source_name: "AkarFinder",
      source_url: null,
      source_access_type: "first_party",
      fact_provenance_label: "Déclaré dans AkarFinder",
      verified_document_count: 0,
      verified_document_label: "Aucune vérification documentaire affichable",
    },
    multisource: { status: "supported", label: "Plusieurs offres rapprochées à comparer" },
    professional: { source_name: "AkarFinder", seller_name: null, profile_status: "profile_layer_pending" },
    disclaimer: "Aucune donnée manquante n’est inventée.",
  };

  return {
    ...base,
    ...overrides,
    conclusion: { ...base.conclusion, ...overrides.conclusion },
    fit: { ...base.fit, ...overrides.fit },
    market: { ...base.market, ...overrides.market },
    multisource: { ...base.multisource, ...overrides.multisource },
  };
}

describe("ANN-L4 Akar insight projection", () => {
  it("projects canonical score, coverage and supported signals without recomputing them", () => {
    const model = buildAkarInsightModel(detail());
    assert.equal(model.version, PUBLIC_SERP_INTELLIGENCE_VERSION);
    assert.equal(model.truthContractVersion, ANNOUNCEMENT_PAGE_TRUTH_CONTRACT_VERSION);
    assert.equal(model.score, 82);
    assert.equal(model.scoreLabel, "Dossier bien documenté");
    assert.equal(model.coverageLabel, "4/5 dimensions documentaires disponibles");
    assert.deepEqual(model.items, [
      { key: "market", label: "Position marché", value: "Prix demandé proche du repère indicatif" },
      { key: "multisource", label: "Multi-source", value: "Plusieurs offres rapprochées à comparer" },
      { key: "attention", label: "À examiner", value: "1 point à examiner dans les données disponibles" },
    ]);
  });

  it("never turns an absent score into zero", () => {
    const value = detail({
      conclusion: {
        title: "Conclusion AkarFinder",
        summary: "Lecture partielle.",
        akar_score: null,
        akar_score_label: "Analyse documentaire partielle",
        coverage_label: "2/5 dimensions documentaires disponibles",
        attention_label: null,
      },
    });
    const model = buildAkarInsightModel(value);
    assert.equal(model.score, null);
    assert.equal(model.scoreLabel, "Analyse documentaire partielle");
    assert.equal(model.items.some((item) => item.key === "attention"), false);
  });

  it("suppresses both an invalid score and the label attached to it", () => {
    const model = buildAkarInsightModel(detail({
      conclusion: {
        title: "Conclusion AkarFinder",
        summary: "Valeur hors contrat.",
        akar_score: 140,
        akar_score_label: "Excellent dossier",
        coverage_label: "5/5 dimensions documentaires disponibles",
        attention_label: null,
      },
    }));
    assert.equal(model.score, null);
    assert.equal(model.scoreLabel, null);
    assert.equal(model.coverageLabel, "5/5 dimensions documentaires disponibles");
  });

  it("hides unavailable market and unsupported multisource states", () => {
    const model = buildAkarInsightModel(detail({
      market: { status: "unavailable", label: "Ce texte ne doit pas sortir", price_per_m2: null },
      multisource: { status: "not_shown", label: "Ce texte non plus" },
      conclusion: {
        title: "Conclusion AkarFinder",
        summary: "Lecture documentaire.",
        akar_score: 75,
        akar_score_label: "Lecture disponible",
        coverage_label: "3/5 dimensions documentaires disponibles",
        attention_label: null,
      },
    }));
    assert.deepEqual(model.items, []);
  });

  it("does not project the current not-calculated Property Fit as an intelligence result", () => {
    const model = buildAkarInsightModel(detail());
    assert.equal(Object.hasOwn(model, "fit"), false);
    assert.equal(JSON.stringify(model).includes("Compatibilité personnalisée non calculée"), false);
  });
});

describe("ANN-L4 production composition", () => {
  it("uses one AkarInsightCard and removes the legacy intelligence card stack", () => {
    const source = readFileSync("components/listings/PropertyDetailV2.tsx", "utf8");
    assert.match(source, /<AkarInsightCard detail=\{detail\} \/>/);
    assert.doesNotMatch(source, /Analyse structurée/);
    assert.doesNotMatch(source, /Compatibilité avec votre projet/);
    assert.doesNotMatch(source, /Repère indicatif calculé uniquement/);
    assert.doesNotMatch(source, /<LeanSection title="Multi-source">/);
    assert.doesNotMatch(source, /Points à examiner/);
  });

  it("exposes intelligence and truth-contract versions for QA and debug", () => {
    const source = readFileSync("components/listings/AkarInsightCard.tsx", "utf8");
    assert.match(source, /data-akar-intelligence-version=\{model\.version\}/);
    assert.match(source, /data-akar-truth-contract-version=\{model\.truthContractVersion\}/);
    assert.match(source, /Intelligence v\{model\.version\}/);
    assert.match(source, /Contrat v\{model\.truthContractVersion\}/);
    assert.match(source, /data-akar-score/);
    assert.match(source, /data-akar-coverage/);
  });

  it("publishes market context only from a validated market contract", () => {
    const source = readFileSync("lib/intelligence/public-serp-intelligence-v1.ts", "utf8");
    assert.match(source, /function marketPositionCertified/);
    assert.match(source, /contract_validation\.valid/);
    assert.match(source, /if \(market && marketPositionCertified\(result\)\)/);
    assert.match(source, /market_position_certified: marketPositionCertified\(result\)/);
  });
});