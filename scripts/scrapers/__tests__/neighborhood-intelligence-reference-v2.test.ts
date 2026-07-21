import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { buildNeighborhoodIntelligenceV2FromV1, classifyRelativeStanding, findNeighborhoodV2 } from "../../../lib/neighborhood-intelligence/build-v2-from-v1.js";
import { AKAR_NEIGHBORHOOD_SCORE_KEYS } from "../../../lib/neighborhood-intelligence/schema-v2.js";
import { V1_CITY_MARKET_ROWS, V1_NEIGHBORHOOD_MARKET_ROWS } from "../../../lib/neighborhood-intelligence/v1-market-seed.js";

describe("#19D0 Neighborhood Intelligence Reference V2", () => {
  it("preserves the retained national V1 rather than rebuilding it", () => {
    assert.equal(V1_CITY_MARKET_ROWS.length, 13);
    assert.equal(V1_NEIGHBORHOOD_MARKET_ROWS.length, 75);
    assert.equal(buildNeighborhoodIntelligenceV2FromV1().length, 75);
  });

  it("uses relative city standing thresholds exactly", () => {
    assert.equal(classifyRelativeStanding(8400, 10000), "accessible");
    assert.equal(classifyRelativeStanding(8500, 10000), "core_market");
    assert.equal(classifyRelativeStanding(11500, 10000), "core_market");
    assert.equal(classifyRelativeStanding(11501, 10000), "premium");
    assert.equal(classifyRelativeStanding(15001, 10000), "prestige");
  });

  it("keeps objective facts, analysis and Akar scores strictly separate", () => {
    const ainDiab = findNeighborhoodV2("Casablanca", "Aïn Diab");
    assert.ok(ainDiab);
    assert.equal(ainDiab.objective_facts.apartment_price_m2_mad.value, 22000);
    assert.equal(ainDiab.analysis.relative_standing.value, "prestige");
    assert.equal(ainDiab.analysis.dominant_urban_type.value, "touristic_residential");
    for (const key of AKAR_NEIGHBORHOOD_SCORE_KEYS) {
      assert.equal(ainDiab.akar_scores[key].value, null, `${key} must stay unknown until evidence-backed scoring`);
      assert.equal(ainDiab.akar_scores[key].confidence, "unknown");
    }
  });

  it("does not manufacture unsupported transport, school or walkability evidence", () => {
    const hayRiad = findNeighborhoodV2("Rabat", "Hay Ryad");
    assert.ok(hayRiad);
    assert.equal(hayRiad.objective_facts.tram_access.value, null);
    assert.equal(hayRiad.objective_facts.school_access.value, null);
    assert.equal(hayRiad.objective_facts.walkability_evidence.value, null);
  });

  it("normalizes known aliases without merging cities", () => {
    assert.ok(findNeighborhoodV2("Casablanca", "Maârif"));
    assert.ok(findNeighborhoodV2("Rabat", "Hay Ryad"));
    assert.equal(findNeighborhoodV2("Rabat", "Maârif"), null);
  });

  it("schema exposes the requested score dimensions but scores require evidence", () => {
    assert.ok(AKAR_NEIGHBORHOOD_SCORE_KEYS.length >= 20);
    for (const required of ["calmness","family_fit","walkability","coastal_lifestyle","tourism_intensity","mre_fit","development_momentum"] as const) {
      assert.ok(AKAR_NEIGHBORHOOD_SCORE_KEYS.includes(required));
    }
  });

  it("migration has RLS and published-only public reads", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260722011500_neighborhood_intelligence_reference_v2.sql"), "utf8").toLowerCase();
    assert.ok(sql.includes("neighborhood_reference_entities enable row level security"));
    assert.ok(sql.includes("neighborhood_intelligence_snapshots enable row level security"));
    assert.ok(sql.includes("status = 'published'"));
  });
});
