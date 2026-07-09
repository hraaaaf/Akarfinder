// P10E tests — Package Score AkarFinder
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculatePackageScore } from "../../../lib/package-score/calculate-package-score";
import type { ListingPriceComparison } from "../../../lib/market/types";
import type { ProximityPoint } from "../../../lib/proximity/types";

// Helpers
function makeProximityPoints(count: number, allUnder15 = true): ProximityPoint[] {
  const categories = [
    "marche_souk", "supermarche", "hanout", "taxi", "transport",
    "pharmacie", "ecole", "mosquee", "clinique", "banque",
    "parking", "cafe", "espace_vert",
  ] as const;
  return categories.slice(0, count).map((cat) => ({
    category: cat,
    label: cat,
    distance_minutes: allUnder15 ? 10 : 25,
    mode: "walking",
    confidence: "élevé" as const,
    source: "test",
  }));
}

function makeComparison(
  label: ListingPriceComparison["comparison_label"],
  confidence: ListingPriceComparison["confidence"] = "élevée"
): ListingPriceComparison {
  return {
    listing_price_per_m2: 15000,
    observed_price_per_m2: label === "Données insuffisantes" ? null : 15000,
    difference_percent: label === "Données insuffisantes" ? null : 0,
    comparison_label: label,
    confidence: label === "Données insuffisantes" ? null : confidence,
    listings_count: label === "Données insuffisantes" ? null : 20,
    disclaimer: "Données indicatives issues de l'analyse AkarFinder — non officielles.",
  };
}

describe("P10E - calculatePackageScore", () => {
  it("returns an information-level label when all 3 signals are high", () => {
    const result = calculatePackageScore(
      90,
      true,
      undefined,
      makeProximityPoints(13, true),
      makeComparison("Prix cohérent", "élevée")
    );
    assert.equal(result.overall_label, "Excellent package");
    assert.ok(result.overall_score > 80);
    assert.equal(result.signals.reliability.label, "Informations bien renseignées");
    assert.ok(result.signals.reliability.detail?.startsWith("Niveau d'information"));
  });

  it("returns the neutral reliability wording when 2 high + 1 medium", () => {
    // reliability high (90), proximity medium (5 accessible), market high
    const proxPoints = makeProximityPoints(5, true);
    const result = calculatePackageScore(
      90,
      true,
      undefined,
      proxPoints,
      makeComparison("Prix cohérent", "élevée")
    );
    assert.equal(result.overall_label, "Bon package");
    assert.equal(result.signals.reliability.label, "Informations bien renseignées");
  });

  it("returns 'Package correct' for mixed moderate signals", () => {
    // reliability medium (60), proximity low (3 accessible), market medium
    const proxPoints = makeProximityPoints(3, true);
    const result = calculatePackageScore(
      60,
      true,
      undefined,
      proxPoints,
      makeComparison("Prix cohérent", "faible")
    );
    assert.equal(result.overall_label, "Package correct");
    assert.equal(result.signals.reliability.label, "Informations à compléter");
  });

  it("returns 'À analyser' when signals are all low", () => {
    // reliability low (30), proximity low, market low
    const proxPoints = makeProximityPoints(3, true);
    const result = calculatePackageScore(
      30,
      true,
      undefined,
      proxPoints,
      makeComparison("Prix supérieur au repère observé", "élevée")
    );
    assert.equal(result.overall_label, "À analyser");
    assert.equal(result.signals.reliability.label, "Informations limitées");
  });

  it("returns 'Données insuffisantes' when fewer than 2 signals are calculable", () => {
    // reliability unavailable, proximity 0 points, market insufficient
    const result = calculatePackageScore(
      0,
      false,
      undefined,
      [],
      makeComparison("Données insuffisantes")
    );
    assert.equal(result.overall_label, "Données insuffisantes");
    assert.equal(result.overall_score, 0);
    assert.equal(result.missing_signals, 3);
  });

  it("includes a non-empty disclaimer", () => {
    const result = calculatePackageScore(
      80,
      true,
      undefined,
      makeProximityPoints(8, true),
      makeComparison("Prix cohérent", "élevée")
    );
    assert.ok(result.disclaimer.length > 0);
    assert.ok(!result.disclaimer.toLowerCase().includes("garanti"));
  });

  it("summary only contains signals that have data", () => {
    // proximity insufficient (0 points)
    const result = calculatePackageScore(
      80,
      true,
      undefined,
      [],
      makeComparison("Prix cohérent", "élevée")
    );
    // only 2 calculable — proximity is insufficient
    assert.ok(result.summary.length > 0);
    assert.ok(!result.summary.includes("Données proximité non disponibles"));
  });

  it("degrades to low reliability when duplicate_score >= 0.7", () => {
    const result = calculatePackageScore(
      90,
      true,
      0.85,
      makeProximityPoints(13, true),
      makeComparison("Prix cohérent", "élevée")
    );
    assert.equal(result.signals.reliability.level, "low");
    assert.equal(result.signals.reliability.label, "Doublon possible");
    assert.ok(result.signals.reliability.detail?.startsWith("Niveau d'information"));
  });

  it("labels do not contain forbidden wording", () => {
    const FORBIDDEN = [
      "Bonne affaire",
      "Investissement sûr",
      "Rentable",
      "Garanti",
      "Prix officiel",
      "Opportunité garantie",
      "Sous-évalué",
      "Surcoté",
      "bonne affaire",
      "bon investissement",
      "acheter maintenant",
      "prix garanti",
      "valeur sûre",
    ];
    const result = calculatePackageScore(
      85,
      true,
      undefined,
      makeProximityPoints(10, true),
      makeComparison("Prix cohérent", "élevée")
    );
    const allText = [
      result.overall_label,
      result.summary,
      result.disclaimer,
      result.signals.reliability.label,
      result.signals.proximity.label,
      result.signals.market_price.label,
    ].join(" ");
    for (const word of FORBIDDEN) {
      assert.ok(!allText.includes(word), `Found forbidden wording: "${word}"`);
    }
  });

  it("'Prix inférieur au repère' yields high market signal", () => {
    const result = calculatePackageScore(
      75,
      true,
      undefined,
      makeProximityPoints(8, true),
      makeComparison("Prix inférieur au repère observé", "élevée")
    );
    assert.equal(result.signals.market_price.level, "high");
  });
});
