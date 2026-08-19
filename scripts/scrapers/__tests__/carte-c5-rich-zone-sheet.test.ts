import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Carte C5 — rich zone sheet runtime", () => {
  const sheet = source("components/map/RabatMarketZoneSheet.tsx");
  const map = source("components/map/RabatMarketIntelligenceExperience.tsx");

  it("keeps live metrics supplied by C3 and outlaws the historical benchmark path", () => {
    assert.ok(sheet.includes("feature.properties.sampleCount"));
    assert.ok(sheet.includes("feature.properties.marketMetrics"));
    assert.ok(sheet.includes("metricLabel"));
    assert.equal(sheet.includes("MARKET_DATA"), false);
    assert.equal(sheet.includes("benchmark"), false);
    assert.equal(sheet.includes("priceSignal"), false);
  });

  it("matches the locked rich-sheet structure without inventing unavailable data", () => {
    assert.ok(sheet.includes("data-akarfinder-zone-polygon-preview"));
    assert.ok(sheet.includes("data-akarfinder-zone-kpi-grid"));
    assert.ok(sheet.includes("Prix médian / m²"));
    assert.ok(sheet.includes("Densité"));
    assert.ok(sheet.includes("Annonces"));
    assert.ok(sheet.includes("Confiance des données"));
    assert.ok(sheet.includes("Catégories dominantes"));
    assert.ok(sheet.includes("Tendance 6 mois"));
    assert.ok(sheet.includes("Historique insuffisant"));
    assert.ok(sheet.includes("Données insuffisantes pour une classification certifiée"));
  });

  it("enriches context only through the canonical neighborhood registry", () => {
    assert.ok(sheet.includes("getNeighborhoodBySlug"));
    assert.ok(sheet.includes('getNeighborhoodBySlug("rabat", district)'));
    assert.ok(sheet.includes("neighborhood?.proximityHighlights.slice(0, 2)"));
    assert.ok(sheet.includes("neighborhood?.lifestyleTags.slice(0, 3)"));
    assert.ok(sheet.includes("data-akarfinder-neighborhood-context"));
  });

  it("omits context and neighborhood link naturally when no canonical point exists", () => {
    assert.ok(sheet.includes("neighborhood && (lifestyleTags.length > 0 || proximityHighlights.length > 0)"));
    assert.ok(sheet.includes("neighborhoodHref ?"));
    assert.ok(sheet.includes("proximityHighlights.length > 0"));
    assert.ok(sheet.includes("lifestyleTags.length > 0"));
    assert.equal(sheet.includes("Souissi"), false);
  });

  it("preserves Search CTA, disclaimer and bounded responsive sheet", () => {
    assert.ok(sheet.includes("Rechercher dans cette zone"));
    assert.ok(sheet.includes("non frontière administrative officielle"));
    assert.ok(sheet.includes("jamais interpolées"));
    assert.ok(sheet.includes("max-h-[min(68svh,540px)]"));
    assert.ok(sheet.includes("overflow-y-auto"));
  });

  it("locks the mobile map-first collapsed state and explicit expansion affordance", () => {
    assert.ok(sheet.includes("useState(false)"));
    assert.ok(sheet.includes('max-h-[38svh] overflow-hidden'));
    assert.ok(sheet.includes('max-h-[min(74svh,620px)] overflow-y-auto'));
    assert.ok(sheet.includes("data-akarfinder-zone-sheet-state"));
    assert.ok(sheet.includes("data-akarfinder-zone-sheet-toggle"));
    assert.ok(sheet.includes("data-akarfinder-zone-sheet-details"));
    assert.ok(sheet.includes('aria-expanded={expanded}'));
  });

  it("delegates only the selected-zone presentation from the C4 map experience", () => {
    assert.ok(map.includes("RabatMarketZoneSheet"));
    assert.ok(map.includes("feature={selectedFeature}"));
    assert.ok(map.includes("metricLabel={formatIntelligenceMetric"));
    assert.ok(map.includes("ENDPOINT = \"/api/geo/rabat-market-intelligence\""));
    assert.ok(map.includes("map.on(\"click\", FILL_LAYER_ID, onClick)"));
  });
});
