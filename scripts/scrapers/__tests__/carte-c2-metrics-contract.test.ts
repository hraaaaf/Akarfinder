import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const doc = readFileSync("docs/CARTE_INTELLIGENCE_METRICS_CONTRACT.md", "utf8");
const p1c1 = readFileSync("supabase/migrations/20260810130500_p1c1_neighborhood_offer_shadow.sql", "utf8");
const p1c2 = readFileSync("supabase/migrations/20260810133000_p1c2_neighborhood_offer_reliability.sql", "utf8");

describe("Carte C2 intelligence metrics contract", () => {
  it("reuses existing price and volume metrics", () => {
    assert.match(p1c1, /listing_count/);
    assert.match(p1c1, /median_price_per_m2_mad/);
    assert.match(doc, /Prix.*médiane DH\/m²/s);
    assert.match(doc, /Annonces.*nombre d’annonces observées/s);
  });

  it("defines density only from certified polygon area", () => {
    assert.match(doc, /observed_listing_density_per_km2 = listing_count \/ area_km2/);
    assert.match(doc, /aucune surface de bounding box/);
    assert.match(doc, /densité est `NULL`/);
  });

  it("preserves reliability versus market representativeness", () => {
    assert.match(p1c2, /market_representativeness_certified/);
    assert.match(p1c2, /insufficient/);
    assert.match(p1c2, /moderate/);
    assert.match(p1c2, /strong/);
    assert.match(doc, /ne signifie pas automatiquement « marché représentatif »/);
  });

  it("forbids fake mockup values and mixed mode normalization", () => {
    assert.match(doc, /valeurs numériques du mockup ne sont jamais hardcodées/);
    assert.match(doc, /modes différents ne partagent jamais une même normalisation/);
  });
});
