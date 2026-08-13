import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { HAY_RIAD_IMMOBILIER_VISUAL, HAY_RIAD_LIFESTYLE_VISUAL, HAY_RIAD_NEIGHBORHOOD_VISUALS, HAY_RIAD_SIGNATURE_VISUAL } from "../../../lib/contextual-illustrations/hay-riad-neighborhood-visuals";

const fixture = readFileSync("components/search/HayRiadNeighborhoodVisualQAFixture.tsx", "utf8");
const route = readFileSync("app/visual-qa/hay-riad/page.tsx", "utf8");
const audit = readFileSync("scripts/audits/neighborhood-visual-p1-5-hay-riad-visual-qa.mjs", "utf8");
const ingest = readFileSync("supabase/functions/neighborhood-visual-p1-5-hay-riad-ingest/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260813114500_neighborhood_visual_p1_5_hay_riad_metadata.sql", "utf8");

describe("NEIGHBORHOOD-VISUAL-P1.5 — Hay Riad", () => {
  it("locks exactly three distinct reusable real sources", () => {
    assert.deepEqual(HAY_RIAD_NEIGHBORHOOD_VISUALS.map(v=>v.sceneRole), ["signature","immobilier","lifestyle"]);
    assert.equal(new Set(HAY_RIAD_NEIGHBORHOOD_VISUALS.map(v=>v.source.sha1)).size, 3);
    for (const v of HAY_RIAD_NEIGHBORHOOD_VISUALS) {
      assert.equal(v.city,"Rabat"); assert.equal(v.neighborhood,"Hay Riad"); assert.equal(v.source.sourceKind,"open_license");
      assert.match(v.source.license,/^CC BY/); assert.match(v.source.sha1,/^[0-9a-f]{40}$/); assert.ok(v.source.bytes>100_000);
      assert.equal(v.source.locationVerified,true); assert.equal(v.activation.searchEnabled,false); assert.equal(v.truthBoundary.claimPropertyForSale,false);
    }
  });
  it("pins exact source identities", () => {
    assert.equal(HAY_RIAD_SIGNATURE_VISUAL.source.sha1,"f02d4795b4df3c7cd6608472b82f9fda1c5d4796");
    assert.match(HAY_RIAD_SIGNATURE_VISUAL.source.locationEvidence,/33\.952591/);
    assert.equal(HAY_RIAD_IMMOBILIER_VISUAL.source.sha1,"54c45f4914839a1a9ee3a65acf3d570f3450b653");
    assert.match(HAY_RIAD_IMMOBILIER_VISUAL.source.locationEvidence,/Villa Narjis/);
    assert.equal(HAY_RIAD_LIFESTYLE_VISUAL.source.sha1,"a91237d667511ed212e9c46b343d96cff5054c5f");
  });
  it("uses real Search cards behind QA gate", () => {
    assert.match(fixture,/SearchListingCardDark/); assert.match(fixture,/NeighborhoodVisualIdentityOverlay/);
    for (const role of ["signature","immobilier","lifestyle"]) assert.ok(fixture.includes(`/__qa/hay-riad-${role}.jpg`));
    assert.match(route,/NEIGHBORHOOD_VISUAL_QA/); assert.match(route,/notFound\(\)/);
  });
  it("locks six-view responsive certification", () => {
    for (const viewport of ["360x800","390x844","768x900","1024x800","1280x900","1440x900"]) assert.ok(audit.includes(viewport));
    assert.match(audit,/target_score:9/); assert.match(audit,/machine_quality_score:10/); assert.match(audit,/Photo d’ambiance/);
  });
  it("bounds ingestion and reconciliation", () => {
    for (const sha of ["f02d4795b4df3c7cd6608472b82f9fda1c5d4796","54c45f4914839a1a9ee3a65acf3d570f3450b653","a91237d667511ed212e9c46b343d96cff5054c5f"]) assert.ok(ingest.includes(sha));
    assert.match(ingest,/P1\.5-HAY-RIAD/); assert.match(migration,/expected exactly 3 ingested Hay Riad visual objects/); assert.match(migration,/neighborhood_slug = 'hay-riad'/);
  });
});
