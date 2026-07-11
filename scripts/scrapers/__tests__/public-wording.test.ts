import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculatePackageScore } from "../../../lib/package-score/calculate-package-score";
import { getMarketPriceScoreDisplay } from "../../../lib/market/market-price-score-display";
import type { ListingPriceComparison } from "../../../lib/market/types";
import type { ProximityPoint } from "../../../lib/proximity/types";

function makeProximityPoints(count: number): ProximityPoint[] {
  const categories = [
    "marche_souk",
    "supermarche",
    "hanout",
    "taxi",
    "transport",
    "pharmacie",
    "ecole",
    "mosquee",
    "clinique",
    "banque",
    "parking",
    "cafe",
    "espace_vert",
  ] as const;
  return categories.slice(0, count).map((category) => ({
    category,
    label: category,
    distance_minutes: 10,
    mode: "walking",
    confidence: "élevé" as const,
    source: "test",
  }));
}

function makeComparison(label: ListingPriceComparison["comparison_label"]): ListingPriceComparison {
  return {
    listing_price_per_m2: 15000,
    observed_price_per_m2: label === "Données insuffisantes" ? null : 15000,
    difference_percent: label === "Données insuffisantes" ? null : 0,
    comparison_label: label,
    confidence: label === "Données insuffisantes" ? null : "élevée",
    listings_count: label === "Données insuffisantes" ? null : 20,
    disclaimer: "Données indicatives issues de l'analyse AkarFinder — non officielles.",
  };
}

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function withPricePositionEnabled<T>(fn: () => T): T {
  const previous = process.env.PRICE_POSITION_REFERENCE_ENABLED;
  process.env.PRICE_POSITION_REFERENCE_ENABLED = "true";
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.PRICE_POSITION_REFERENCE_ENABLED;
    else process.env.PRICE_POSITION_REFERENCE_ENABLED = previous;
  }
}

describe("public wording cleanup", () => {
  it("keeps package score reliability wording neutral", () => {
    const result = calculatePackageScore(
      90,
      true,
      undefined,
      makeProximityPoints(13),
      makeComparison("Position relative proche")
    );

    const text = [result.signals.reliability.label, result.signals.reliability.detail ?? "", result.summary].join(" ");
    assert.equal(result.signals.reliability.label, "Informations bien renseignées");
    assert.ok(!text.toLowerCase().includes("annonce fiable"));
    assert.ok(!text.toLowerCase().includes("score de fiabilité"));
  });

  it("uses neutral market-position labels", () => {
    const low = withPricePositionEnabled(() =>
      getMarketPriceScoreDisplay({
        city: "Casablanca",
        neighborhood: "Maarif",
        property_type: "Appartement",
        surface_m2: 80,
        total_price_mad: 1_000_000,
      })
    );

    assert.ok(low);
    assert.ok(low?.label.startsWith("Position relative"));
    assert.ok(low?.title.includes("Repère indicatif AkarFinder"));
    assert.ok(!low?.label.toLowerCase().includes("sous le marché"));
    assert.ok(!low?.label.toLowerCase().includes("au-dessus du marché"));
  });

  it("/pro no longer uses the forbidden reliability phrasing", () => {
    const source = readSource("app/pro/page.tsx");
    assert.ok(!source.includes("Score de fiabilité"));
    assert.ok(!source.includes("Annonce fiable"));
    assert.ok(source.includes("Niveau d'information"));
  });

  it("demo market labels stay neutral", () => {
    const source = readSource("lib/demo/demo-data.ts");
    assert.ok(source.includes("Position relative inférieure"));
    assert.ok(source.includes("Position relative supérieure"));
    assert.ok(!source.includes("Sous le marché"));
    assert.ok(!source.includes("Au-dessus du marché"));
  });
});
